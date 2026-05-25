import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
  HttpException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import type {
  RawYodleeAccount,
  RawYodleeTransaction,
  AccountDto,
  TransactionDto,
} from './types/yodlee.types.js';

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

@Injectable()
export class YodleeService {
  private readonly logger = new Logger(YodleeService.name);
  private readonly tokenCache = new Map<string, CachedToken>();
  private readonly http: AxiosInstance;

  constructor(private readonly config: ConfigService) {
    this.http = axios.create({
      baseURL: this.config.getOrThrow<string>('YODLEE_BASE_URL'),
      headers: { 'Api-Version': '1.1' },
    });
  }

  get adminLoginName(): string {
    return this.config.getOrThrow<string>('YODLEE_ADMIN_LOGIN_NAME');
  }

  get fastLinkUrl(): string {
    return this.config.get<string>(
      'YODLEE_FASTLINK_URL',
      'https://node.sandbox.yodlee.com/authenticate/restserver/',
    );
  }

  // ---------------------------------------------------------------------------
  // Token management
  // ---------------------------------------------------------------------------

  async getAccessToken(loginName: string): Promise<string> {
    const cached = this.tokenCache.get(loginName);
    // Refresh 60 s before expiry
    if (cached && cached.expiresAt > Date.now() + 60_000) {
      return cached.accessToken;
    }

    const body = new URLSearchParams({
      clientId: this.config.getOrThrow<string>('YODLEE_CLIENT_ID'),
      secret: this.config.getOrThrow<string>('YODLEE_CLIENT_SECRET'),
    });

    try {
      const { data } = await this.http.post<{
        token: { accessToken: string; expiresIn: number };
      }>('/auth/token', body.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          loginName,
        },
      });

      const { accessToken, expiresIn } = data.token;

      this.tokenCache.set(loginName, {
        accessToken,
        expiresAt: Date.now() + expiresIn * 1000,
      });

      this.logger.debug(`Token acquired for loginName: ${loginName}`);
      return accessToken;
    } catch (err) {
      const e = err as { response?: { data?: unknown }; message?: string };
      this.logger.error(
        `Failed to obtain Yodlee token for ${loginName}`,
        e?.response?.data ?? e.message,
      );
      throw new InternalServerErrorException(
        'Failed to obtain Yodlee access token',
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async authHeaders(loginName: string) {
    const token = await this.getAccessToken(loginName);
    return { Authorization: `Bearer ${token}` };
  }

  private handleYodleeError(err: unknown, context: string): never {
    const e = err as {
      response?: { status?: number; data?: unknown };
      message?: string;
    };
    const status = e.response?.status;
    this.logger.error(
      `Yodlee API error in ${context}`,
      e.response?.data ?? e.message,
    );
    if (status === 401)
      throw new UnauthorizedException('Yodlee authentication failed');
    if (status === 404)
      throw new NotFoundException('Yodlee resource not found');
    if (status === 409)
      throw new ConflictException('Yodlee resource already exists');
    if (status === 429)
      throw new HttpException(
        'Yodlee rate limit exceeded — try again shortly',
        429,
      );
    throw new InternalServerErrorException('Yodlee API error');
  }

  private static mapAccount(raw: RawYodleeAccount): AccountDto {
    const { CONTAINER, ...rest } = raw;
    return { ...rest, container: CONTAINER };
  }

  private static mapTransaction(raw: RawYodleeTransaction): TransactionDto {
    return raw;
  }

  // ---------------------------------------------------------------------------
  // Sandbox user pool (non-production only)
  // ---------------------------------------------------------------------------

  /**
   * Returns a random loginName from the configured sandbox user pool.
   * Used during registration when NODE_ENV !== 'production'.
   */
  getRandomSandboxLoginName(): string {
    const pool = this.config
      .getOrThrow<string>('YODLEE_SANDBOX_USER_POOL')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!pool.length) {
      throw new Error('YODLEE_SANDBOX_USER_POOL is empty');
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ---------------------------------------------------------------------------
  // User endpoints (require user token)
  // ---------------------------------------------------------------------------

  async getUser(loginName: string) {
    const headers = await this.authHeaders(loginName);
    try {
      const { data } = await this.http.get<unknown>('/user', { headers });
      return data;
    } catch (err) {
      this.handleYodleeError(err, 'getUser');
    }
  }

  // ---------------------------------------------------------------------------
  // Create a new Yodlee sandbox user (used on Flamingo registration)
  // ---------------------------------------------------------------------------

  /**
   * Registers a new user in Yodlee via the admin token.
   * Returns the loginName that Yodlee assigned (same as the one we send).
   */
  async createUser(loginName: string, email?: string): Promise<string> {
    const headers = await this.authHeaders(this.adminLoginName);
    try {
      await this.http.post(
        '/user/register',
        {
          user: {
            loginName,
            ...(email && { email }),
            name: { first: 'Flamingo', last: 'User' },
          },
        },
        { headers },
      );
      this.logger.debug(`Yodlee user created: ${loginName}`);
      return loginName;
    } catch (err) {
      const e = err as {
        response?: { status?: number; data?: unknown };
        message?: string;
      };
      if (e.response?.status === 409) {
        throw new ConflictException('Yodlee user already exists');
      }
      this.logger.error(
        `Failed to create Yodlee user ${loginName}`,
        e?.response?.data ?? e.message,
      );
      throw new InternalServerErrorException('Failed to create Yodlee user');
    }
  }

  // ---------------------------------------------------------------------------
  // Accounts (require user token)
  // ---------------------------------------------------------------------------

  async getAccounts(
    loginName: string,
    params?: Record<string, string>,
  ): Promise<AccountDto[]> {
    const headers = await this.authHeaders(loginName);
    try {
      const { data } = await this.http.get<{ account?: RawYodleeAccount[] }>(
        '/accounts',
        { headers, params },
      );
      return (data.account ?? []).map((a) => YodleeService.mapAccount(a));
    } catch (err) {
      this.handleYodleeError(err, 'getAccounts');
    }
  }

  async getAccount(
    loginName: string,
    accountId: number,
  ): Promise<AccountDto | undefined> {
    const headers = await this.authHeaders(loginName);
    try {
      const { data } = await this.http.get<{ account?: RawYodleeAccount[] }>(
        `/accounts/${accountId}`,
        { headers },
      );
      const raw = data.account?.[0];
      return raw ? YodleeService.mapAccount(raw) : undefined;
    } catch (err) {
      this.handleYodleeError(err, 'getAccount');
    }
  }

  async updateAccount(
    loginName: string,
    accountId: number,
    payload: Record<string, unknown>,
  ) {
    const headers = await this.authHeaders(loginName);
    try {
      const { data } = await this.http.put<unknown>(
        `/accounts/${accountId}`,
        payload,
        { headers },
      );
      return data;
    } catch (err) {
      this.handleYodleeError(err, 'updateAccount');
    }
  }

  async deleteAccount(loginName: string, accountId: number): Promise<void> {
    const headers = await this.authHeaders(loginName);
    try {
      await this.http.delete(`/accounts/${accountId}`, { headers });
    } catch (err) {
      this.handleYodleeError(err, 'deleteAccount');
    }
  }

  // ---------------------------------------------------------------------------
  // Transactions (require user token)
  // ---------------------------------------------------------------------------

  async getTransactions(
    loginName: string,
    params?: Record<string, string>,
  ): Promise<TransactionDto[]> {
    const headers = await this.authHeaders(loginName);
    try {
      const { data } = await this.http.get<{
        transaction?: RawYodleeTransaction[];
      }>('/transactions', { headers, params });
      return (data.transaction ?? []).map((t) =>
        YodleeService.mapTransaction(t),
      );
    } catch (err) {
      this.handleYodleeError(err, 'getTransactions');
    }
  }

  async getTransactionsSummary(
    loginName: string,
    params?: Record<string, string>,
  ) {
    const headers = await this.authHeaders(loginName);
    try {
      const { data } = await this.http.get<unknown>('/transactions/summary', {
        headers,
        params,
      });
      return data;
    } catch (err) {
      this.handleYodleeError(err, 'getTransactionsSummary');
    }
  }

  // ---------------------------------------------------------------------------
  // Sandbox demo endpoints (shared data, no per-user context)
  // ---------------------------------------------------------------------------

  async getSandboxAccounts(): Promise<AccountDto[]> {
    const loginName = this.config.getOrThrow<string>(
      'YODLEE_SANDBOX_LOGIN_NAME',
    );
    return this.getAccounts(loginName);
  }

  async getSandboxTransactions(
    params?: Record<string, string>,
  ): Promise<TransactionDto[]> {
    const loginName = this.config.getOrThrow<string>(
      'YODLEE_SANDBOX_LOGIN_NAME',
    );
    return this.getTransactions(loginName, params);
  }

  // ---------------------------------------------------------------------------
  // Providers (admin token)
  // ---------------------------------------------------------------------------

  async getProviders(params?: Record<string, string>) {
    const headers = await this.authHeaders(this.adminLoginName);
    try {
      const { data } = await this.http.get<unknown>('/providers', {
        headers,
        params,
      });
      return data;
    } catch (err) {
      this.handleYodleeError(err, 'getProviders');
    }
  }

  async getProvider(providerId: number) {
    const headers = await this.authHeaders(this.adminLoginName);
    try {
      const { data } = await this.http.get<unknown>(
        `/providers/${providerId}`,
        { headers },
      );
      return data;
    } catch (err) {
      this.handleYodleeError(err, 'getProvider');
    }
  }
}
