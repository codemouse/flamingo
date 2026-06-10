import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
  HttpException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
  SandboxItemFireWebhookRequestWebhookCodeEnum,
  type LinkTokenCreateRequest,
  type AccountBase,
  type Transaction,
  type RemovedTransaction,
} from 'plaid';

export type PlaidEnv = 'sandbox' | 'production';

const VALID_ENVS: readonly PlaidEnv[] = ['sandbox', 'production'] as const;

@Injectable()
export class PlaidService {
  private readonly logger = new Logger(PlaidService.name);
  private readonly client: PlaidApi;
  private readonly env: PlaidEnv;
  private readonly defaultProducts: Products[];
  private readonly defaultCountryCodes: CountryCode[];
  private readonly defaultLanguage: string;

  /** Lazily initialised shared access_token for sandbox demo endpoints. */
  private _sandboxAccessToken?: string;

  constructor(private readonly config: ConfigService) {
    const envStr = config.get<string>('PLAID_ENV', 'sandbox').toLowerCase();
    if (!VALID_ENVS.includes(envStr as PlaidEnv)) {
      throw new InternalServerErrorException(
        `Invalid PLAID_ENV "${envStr}". Must be one of: ${VALID_ENVS.join(', ')}`,
      );
    }
    this.env = envStr as PlaidEnv;

    const basePath = PlaidEnvironments[this.env];

    this.defaultProducts = parseList(config.get<string>('PLAID_PRODUCTS'), [
      Products.Transactions,
    ]) as Products[];

    this.defaultCountryCodes = parseList(
      config.get<string>('PLAID_COUNTRY_CODES'),
      [CountryCode.Us],
    ) as CountryCode[];

    this.defaultLanguage = config.get<string>('PLAID_LANGUAGE', 'en');

    const configuration = new Configuration({
      basePath,
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': config.getOrThrow<string>('PLAID_CLIENT_ID'),
          'PLAID-SECRET': config.getOrThrow<string>('PLAID_SECRET'),
        },
      },
    });

    this.client = new PlaidApi(configuration);
    this.logger.log(
      `Plaid initialised for ${this.env} (products=${this.defaultProducts.join(',')}, countries=${this.defaultCountryCodes.join(',')})`,
    );
  }

  get isSandbox(): boolean {
    return this.env === 'sandbox';
  }

  get environment(): PlaidEnv {
    return this.env;
  }

  // ---------------------------------------------------------------------------
  // Link token
  // ---------------------------------------------------------------------------

  async createLinkToken(userId: string): Promise<string> {
    const webhookUrl = this.config.get<string>('PLAID_WEBHOOK_URL');

    const request: LinkTokenCreateRequest = {
      user: { client_user_id: userId },
      client_name: 'Flamingo',
      products: this.defaultProducts,
      country_codes: this.defaultCountryCodes,
      language: this.defaultLanguage,
      ...(webhookUrl && { webhook: webhookUrl }),
    };

    try {
      const response = await this.client.linkTokenCreate(request);
      return response.data.link_token;
    } catch (err) {
      this.handlePlaidError(err, 'createLinkToken');
    }
  }

  // ---------------------------------------------------------------------------
  // Token exchange
  // ---------------------------------------------------------------------------

  async exchangePublicToken(
    publicToken: string,
  ): Promise<{ accessToken: string; itemId: string }> {
    try {
      const response = await this.client.itemPublicTokenExchange({
        public_token: publicToken,
      });
      return {
        accessToken: response.data.access_token,
        itemId: response.data.item_id,
      };
    } catch (err) {
      this.handlePlaidError(err, 'exchangePublicToken');
    }
  }

  // ---------------------------------------------------------------------------
  // Accounts & balances
  // ---------------------------------------------------------------------------

  async getAccounts(accessToken: string): Promise<AccountBase[]> {
    try {
      const response = await this.client.accountsGet({
        access_token: accessToken,
      });
      return response.data.accounts;
    } catch (err) {
      this.handlePlaidError(err, 'getAccounts');
    }
  }

  /** Forces a real-time balance refresh against the institution. */
  async getBalance(accessToken: string): Promise<AccountBase[]> {
    try {
      const response = await this.client.accountsBalanceGet({
        access_token: accessToken,
      });
      return response.data.accounts;
    } catch (err) {
      this.handlePlaidError(err, 'getBalance');
    }
  }

  // ---------------------------------------------------------------------------
  // Auth — routing & account numbers
  // ---------------------------------------------------------------------------

  async getAuth(accessToken: string) {
    try {
      const response = await this.client.authGet({ access_token: accessToken });
      return {
        accounts: response.data.accounts,
        numbers: response.data.numbers,
      };
    } catch (err) {
      this.handlePlaidError(err, 'getAuth');
    }
  }

  // ---------------------------------------------------------------------------
  // Identity — account holder info
  // ---------------------------------------------------------------------------

  async getIdentity(accessToken: string) {
    try {
      const response = await this.client.identityGet({
        access_token: accessToken,
      });
      return response.data.accounts;
    } catch (err) {
      this.handlePlaidError(err, 'getIdentity');
    }
  }

  // ---------------------------------------------------------------------------
  // Liabilities — credit cards, student loans, mortgages
  // ---------------------------------------------------------------------------

  async getLiabilities(accessToken: string) {
    try {
      const response = await this.client.liabilitiesGet({
        access_token: accessToken,
      });
      return {
        accounts: response.data.accounts,
        liabilities: response.data.liabilities,
      };
    } catch (err) {
      this.handlePlaidError(err, 'getLiabilities');
    }
  }

  // ---------------------------------------------------------------------------
  // Investments
  // ---------------------------------------------------------------------------

  async getInvestmentHoldings(accessToken: string) {
    try {
      const response = await this.client.investmentsHoldingsGet({
        access_token: accessToken,
      });
      return {
        accounts: response.data.accounts,
        holdings: response.data.holdings,
        securities: response.data.securities,
      };
    } catch (err) {
      this.handlePlaidError(err, 'getInvestmentHoldings');
    }
  }

  async getInvestmentTransactions(
    accessToken: string,
    startDate: string,
    endDate: string,
  ) {
    try {
      const response = await this.client.investmentsTransactionsGet({
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate,
      });
      return {
        accounts: response.data.accounts,
        investmentTransactions: response.data.investment_transactions,
        securities: response.data.securities,
        totalInvestmentTransactions:
          response.data.total_investment_transactions,
      };
    } catch (err) {
      this.handlePlaidError(err, 'getInvestmentTransactions');
    }
  }

  // ---------------------------------------------------------------------------
  // Transactions (sync)
  // ---------------------------------------------------------------------------

  async syncTransactions(
    accessToken: string,
    cursor?: string | null,
  ): Promise<{
    added: Transaction[];
    modified: Transaction[];
    removed: RemovedTransaction[];
    nextCursor: string;
  }> {
    let added: Transaction[] = [];
    let modified: Transaction[] = [];
    let removed: RemovedTransaction[] = [];
    let nextCursor: string | undefined = cursor ?? undefined;
    let hasMore = true;

    try {
      while (hasMore) {
        const response = await this.client.transactionsSync({
          access_token: accessToken,
          ...(nextCursor && { cursor: nextCursor }),
        });
        const data = response.data;

        added = added.concat(data.added);
        modified = modified.concat(data.modified);
        removed = removed.concat(data.removed);
        nextCursor = data.next_cursor;
        hasMore = data.has_more;
      }
    } catch (err) {
      this.handlePlaidError(err, 'syncTransactions');
    }

    return { added, modified, removed, nextCursor: nextCursor ?? '' };
  }

  // ---------------------------------------------------------------------------
  // Item management
  // ---------------------------------------------------------------------------

  async removeItem(accessToken: string): Promise<void> {
    try {
      await this.client.itemRemove({ access_token: accessToken });
    } catch (err) {
      this.handlePlaidError(err, 'removeItem');
    }
  }

  async getItem(accessToken: string) {
    try {
      const response = await this.client.itemGet({
        access_token: accessToken,
      });
      return response.data.item;
    } catch (err) {
      this.handlePlaidError(err, 'getItem');
    }
  }

  // ---------------------------------------------------------------------------
  // Institution lookup & search
  // ---------------------------------------------------------------------------

  async getInstitution(institutionId: string) {
    try {
      const response = await this.client.institutionsGetById({
        institution_id: institutionId,
        country_codes: this.defaultCountryCodes,
      });
      return response.data.institution;
    } catch (err) {
      this.handlePlaidError(err, 'getInstitution');
    }
  }

  async searchInstitutions(query: string, products?: Products[]) {
    try {
      const response = await this.client.institutionsSearch({
        query,
        products: products ?? this.defaultProducts,
        country_codes: this.defaultCountryCodes,
      });
      return response.data.institutions;
    } catch (err) {
      this.handlePlaidError(err, 'searchInstitutions');
    }
  }

  // ---------------------------------------------------------------------------
  // Webhook verification
  // ---------------------------------------------------------------------------

  /** Fetches the JWK (RSA-style fields) for a given key id. */
  async getWebhookVerificationKey(keyId: string): Promise<{
    kty: string;
    alg: string;
    kid: string;
    use?: string;
    crv?: string;
    x?: string;
    y?: string;
    n?: string;
    e?: string;
  }> {
    try {
      const response = await this.client.webhookVerificationKeyGet({
        key_id: keyId,
      });
      return response.data.key;
    } catch (err) {
      this.handlePlaidError(err, 'getWebhookVerificationKey');
    }
  }

  // ---------------------------------------------------------------------------
  // Sandbox helpers
  // ---------------------------------------------------------------------------

  private assertSandbox(method: string): void {
    if (!this.isSandbox) {
      throw new InternalServerErrorException(
        `${method} is only available when PLAID_ENV=sandbox`,
      );
    }
  }

  async sandboxCreatePublicToken(
    institutionId?: string,
    overrideUsername?: string,
  ): Promise<string> {
    this.assertSandbox('sandboxCreatePublicToken');
    try {
      const response = await this.client.sandboxPublicTokenCreate({
        institution_id: institutionId ?? 'ins_109508',
        initial_products: this.defaultProducts,
        ...(overrideUsername && {
          options: { override_username: overrideUsername },
        }),
      });
      return response.data.public_token;
    } catch (err) {
      this.handlePlaidError(err, 'sandboxCreatePublicToken');
    }
  }

  async getSandboxAccessToken(): Promise<string> {
    if (this._sandboxAccessToken) return this._sandboxAccessToken;

    const publicToken = await this.sandboxCreatePublicToken();
    const { accessToken } = await this.exchangePublicToken(publicToken);
    this._sandboxAccessToken = accessToken;
    this.logger.debug('Initialised shared sandbox access token');
    return accessToken;
  }

  /** Forces an Item into ITEM_LOGIN_REQUIRED to test update mode. */
  async sandboxResetLogin(accessToken: string): Promise<boolean> {
    this.assertSandbox('sandboxResetLogin');
    try {
      const response = await this.client.sandboxItemResetLogin({
        access_token: accessToken,
      });
      return response.data.reset_login;
    } catch (err) {
      this.handlePlaidError(err, 'sandboxResetLogin');
    }
  }

  /** Fires a test webhook for the given Item. */
  async sandboxFireWebhook(
    accessToken: string,
    webhookCode: SandboxItemFireWebhookRequestWebhookCodeEnum,
  ): Promise<boolean> {
    this.assertSandbox('sandboxFireWebhook');
    try {
      const response = await this.client.sandboxItemFireWebhook({
        access_token: accessToken,
        webhook_code: webhookCode,
      });
      return response.data.webhook_fired;
    } catch (err) {
      this.handlePlaidError(err, 'sandboxFireWebhook');
    }
  }

  /** Adds custom transactions to a sandbox Item (max 10 per call). */
  async sandboxCreateTransactions(
    accessToken: string,
    transactions: Array<{
      amount: number;
      date_posted: string;
      date_transacted: string;
      description: string;
      iso_currency_code?: string;
    }>,
  ): Promise<void> {
    this.assertSandbox('sandboxCreateTransactions');
    try {
      await this.client.sandboxTransactionsCreate({
        access_token: accessToken,
        transactions,
      });
    } catch (err) {
      this.handlePlaidError(err, 'sandboxCreateTransactions');
    }
  }

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------

  private handlePlaidError(err: unknown, context: string): never {
    const e = err as {
      response?: {
        status?: number;
        data?: { error_code?: string; error_message?: string };
      };
      message?: string;
    };
    const status = e.response?.status;
    const code = e.response?.data?.error_code;
    const message = e.response?.data?.error_message ?? e.message;

    this.logger.error(
      `Plaid API error in ${context} [${code ?? status}]: ${message}`,
    );

    if (status === 400)
      throw new HttpException(`Plaid bad request: ${message}`, 400);
    if (status === 401)
      throw new HttpException(
        'Plaid authentication failed — check PLAID_CLIENT_ID / PLAID_SECRET',
        401,
      );
    if (status === 404) throw new NotFoundException('Plaid resource not found');
    if (status === 429)
      throw new HttpException(
        'Plaid rate limit exceeded — try again shortly',
        429,
      );
    throw new InternalServerErrorException(
      `Plaid API error: ${message ?? 'unknown'}`,
    );
  }
}

function parseList(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  const entries = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return entries.length ? entries : fallback;
}
