import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

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
      const { data } = await this.http.post('/auth/token', body.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          loginName,
        },
      });

      const { accessToken, expiresIn } = data.token as {
        accessToken: string;
        expiresIn: number;
      };

      this.tokenCache.set(loginName, {
        accessToken,
        expiresAt: Date.now() + expiresIn * 1000,
      });

      this.logger.debug(`Token acquired for loginName: ${loginName}`);
      return accessToken;
    } catch (err) {
      this.logger.error(`Failed to obtain Yodlee token for ${loginName}`, err?.response?.data ?? err.message);
      throw new InternalServerErrorException('Failed to obtain Yodlee access token');
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async authHeaders(loginName: string) {
    const token = await this.getAccessToken(loginName);
    return { Authorization: `Bearer ${token}` };
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
    const { data } = await this.http.get('/user', { headers });
    return data;
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
      this.logger.error(
        `Failed to create Yodlee user ${loginName}`,
        err?.response?.data ?? err.message,
      );
      throw new InternalServerErrorException('Failed to create Yodlee user');
    }
  }

  // ---------------------------------------------------------------------------
  // Accounts (require user token)
  // ---------------------------------------------------------------------------

  async getAccounts(loginName: string, params?: Record<string, string>) {
    const headers = await this.authHeaders(loginName);
    const { data } = await this.http.get('/accounts', { headers, params });
    return data;
  }

  async getAccount(loginName: string, accountId: number) {
    const headers = await this.authHeaders(loginName);
    const { data } = await this.http.get(`/accounts/${accountId}`, { headers });
    return data;
  }

  async updateAccount(loginName: string, accountId: number, payload: Record<string, unknown>) {
    const headers = await this.authHeaders(loginName);
    const { data } = await this.http.put(`/accounts/${accountId}`, payload, { headers });
    return data;
  }

  async deleteAccount(loginName: string, accountId: number): Promise<void> {
    const headers = await this.authHeaders(loginName);
    await this.http.delete(`/accounts/${accountId}`, { headers });
  }

  // ---------------------------------------------------------------------------
  // Transactions (require user token)
  // ---------------------------------------------------------------------------

  async getTransactions(loginName: string, params?: Record<string, string>) {
    const headers = await this.authHeaders(loginName);
    const { data } = await this.http.get('/transactions', { headers, params });
    return data;
  }

  async getTransactionsSummary(loginName: string, params?: Record<string, string>) {
    const headers = await this.authHeaders(loginName);
    const { data } = await this.http.get('/transactions/summary', { headers, params });
    return data;
  }

  // ---------------------------------------------------------------------------
  // Sandbox demo endpoints (shared data, no per-user context)
  // ---------------------------------------------------------------------------

  async getSandboxAccounts() {
    const loginName = this.config.getOrThrow<string>('YODLEE_SANDBOX_LOGIN_NAME');
    return this.getAccounts(loginName);
  }

  async getSandboxTransactions(params?: Record<string, string>) {
    const loginName = this.config.getOrThrow<string>('YODLEE_SANDBOX_LOGIN_NAME');
    return this.getTransactions(loginName, params);
  }

  // ---------------------------------------------------------------------------
  // Providers (admin token)
  // ---------------------------------------------------------------------------

  async getProviders(params?: Record<string, string>) {
    const headers = await this.authHeaders(this.adminLoginName);
    const { data } = await this.http.get('/providers', { headers, params });
    return data;
  }

  async getProvider(providerId: number) {
    const headers = await this.authHeaders(this.adminLoginName);
    const { data } = await this.http.get(`/providers/${providerId}`, { headers });
    return data;
  }
}
