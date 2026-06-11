import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { PlaidService } from '../plaid.service.js';
import { PlaidItemsService } from '../plaid-items.service.js';
import { PlaidTransactionsService } from '../plaid-transactions.service.js';
import { PlaidSyncScheduler } from '../queues/plaid-sync.scheduler.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { PlaidLinkedGuard } from '../guards/plaid-linked.guard.js';
import { ExchangeTokenDto } from '../dto/exchange-token.dto.js';
import type { AuthenticatedUser } from '../../auth/types/jwt.types.js';
import type { PlaidItem } from '../entities/plaid-item.entity.js';

interface PlaidRequest extends Request {
  user: AuthenticatedUser;
  plaidItems: PlaidItem[];
}

@ApiTags('plaid')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('plaid/me')
export class PlaidMeController {
  constructor(
    private readonly plaid: PlaidService,
    private readonly items: PlaidItemsService,
    private readonly transactions: PlaidTransactionsService,
    private readonly scheduler: PlaidSyncScheduler,
  ) {}

  // ── Link token (step 1 of Link flow) ────────────────────────────────────

  @Post('link-token')
  @ApiOperation({
    summary: 'Create a Plaid link_token to initialise Plaid Link',
    description:
      'Returns a short-lived link_token. Pass it to the Plaid Link component on the frontend.',
  })
  @ApiCreatedResponse({ description: 'link_token string' })
  async createLinkToken(@Req() req: PlaidRequest) {
    const linkToken = await this.plaid.createLinkToken(req.user.id);
    return { linkToken };
  }

  // ── Token exchange (step 3 of Link flow) ────────────────────────────────

  @Post('exchange-token')
  @ApiOperation({
    summary:
      'Exchange a public_token for a permanent access_token (Plaid Item)',
    description:
      'Call this after Plaid Link calls onSuccess with a public_token. ' +
      'The backend exchanges it for an access_token, persists the Item, and returns the Item record.',
  })
  @ApiCreatedResponse({
    description: 'Created Plaid Item (without access_token)',
  })
  async exchangeToken(@Req() req: PlaidRequest, @Body() dto: ExchangeTokenDto) {
    const { accessToken, itemId } = await this.plaid.exchangePublicToken(
      dto.publicToken,
    );

    // Look up institution name for a nicer UI
    let institutionId: string | null = null;
    let institutionName: string | null = null;
    try {
      const item = await this.plaid.getItem(accessToken);
      institutionId = item?.institution_id ?? null;
      if (institutionId) {
        const inst = await this.plaid.getInstitution(institutionId);
        institutionName = inst?.name ?? null;
      }
    } catch {
      // Non-fatal — institution name is cosmetic
    }

    const plaidItem = await this.items.create(
      req.user.id,
      itemId,
      accessToken,
      institutionId,
      institutionName,
    );

    const { accessToken: _token, ...safe } = plaidItem;
    return safe;
  }

  // ── Items list ──────────────────────────────────────────────────────────

  @Get('items')
  @ApiOperation({ summary: "List the authenticated user's linked Plaid Items" })
  @ApiOkResponse({ description: 'Array of Plaid Items (access_token omitted)' })
  async getMyItems(@Req() req: PlaidRequest) {
    const items = await this.items.findByUser(req.user.id);
    return items.map(({ accessToken: _t, ...safe }) => safe);
  }

  // ── Accounts ────────────────────────────────────────────────────────────

  @Get('accounts')
  @ApiOperation({
    summary: "Get the authenticated user's accounts across all linked Items",
  })
  @ApiOkResponse({ description: 'Array of Plaid AccountBase objects' })
  async getMyAccounts(@Req() req: PlaidRequest) {
    const userItems = await this.items.findByUser(req.user.id);
    if (!userItems.length) return [];
    const results = await Promise.all(
      userItems.map((item) =>
        this.plaid.getAccounts(item.accessToken).then((accounts) =>
          accounts.map((a) => ({
            ...a,
            itemId: item.itemId,
            institutionName: item.institutionName,
          })),
        ),
      ),
    );
    return results.flat();
  }

  // ── Transactions (sync) ─────────────────────────────────────────────────

  @Get('transactions')
  @ApiOperation({
    summary:
      "Read the authenticated user's persisted transactions and trigger a background sync",
    description:
      'Returns transactions stored locally (synced via webhooks + hourly fallback). ' +
      'Also enqueues a sync job per linked Item so the next read is fresh. ' +
      'Use ?limit and ?before for pagination.',
  })
  @ApiQuery({ name: 'limit', required: false, example: 100 })
  @ApiQuery({
    name: 'before',
    required: false,
    description: 'ISO date — return transactions with date earlier than this',
  })
  @ApiOkResponse({ description: 'Array of stored transactions' })
  async getMyTransactions(
    @Req() req: PlaidRequest,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    const userItems = await this.items.findByUser(req.user.id);
    if (!userItems.length) return [];

    // Kick off async refresh — fire-and-forget, callers don't wait.
    Promise.all(
      userItems.map((i) => this.scheduler.enqueueItemSync(i.id)),
    ).catch(() => {
      /* logged in scheduler */
    });

    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.transactions.findByUser(req.user.id, {
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
      before,
    });
  }

  // ── Real-time balance refresh ───────────────────────────────────────────

  @Post('balance/refresh')
  @UseGuards(PlaidLinkedGuard)
  @ApiOperation({
    summary: 'Force a real-time balance refresh across all linked Items',
    description:
      'Calls /accounts/balance/get for each Item, which polls the institution for the latest available/current balances. ' +
      'More expensive than GET /plaid/me/accounts (which uses cached data). Use sparingly.',
  })
  @ApiOkResponse({ description: 'Array of accounts with refreshed balances' })
  @ApiForbiddenResponse({ description: 'No Plaid account linked' })
  async refreshBalances(@Req() req: PlaidRequest) {
    const results = await Promise.all(
      req.plaidItems.map((item) =>
        this.plaid.getBalance(item.accessToken).then((accounts) =>
          accounts.map((a) => ({
            ...a,
            itemId: item.itemId,
            institutionName: item.institutionName,
          })),
        ),
      ),
    );
    return results.flat();
  }

  // ── Auth — routing & account numbers ────────────────────────────────────

  @Get('auth')
  @UseGuards(PlaidLinkedGuard)
  @ApiOperation({
    summary: "Get routing and account numbers for the user's linked accounts",
    description:
      'Calls /auth/get for each Item. Requires the auth product to be enabled on the Item. ' +
      'In sandbox the default test institution returns deterministic numbers.',
  })
  @ApiOkResponse({
    description: 'Array of per-item auth payloads (accounts + numbers)',
  })
  @ApiForbiddenResponse({ description: 'No Plaid account linked' })
  async getMyAuth(@Req() req: PlaidRequest) {
    const results = await Promise.all(
      req.plaidItems.map(async (item) => ({
        itemId: item.itemId,
        institutionName: item.institutionName,
        ...(await this.plaid.getAuth(item.accessToken)),
      })),
    );
    return results;
  }

  // ── Identity ────────────────────────────────────────────────────────────

  @Get('identity')
  @UseGuards(PlaidLinkedGuard)
  @ApiOperation({
    summary: 'Get account holder names, emails, phones, and addresses',
    description:
      'Calls /identity/get for each Item. Requires the identity product to be enabled on the Item.',
  })
  @ApiOkResponse({ description: 'Array of per-item identity payloads' })
  @ApiForbiddenResponse({ description: 'No Plaid account linked' })
  async getMyIdentity(@Req() req: PlaidRequest) {
    const results = await Promise.all(
      req.plaidItems.map(async (item) => ({
        itemId: item.itemId,
        institutionName: item.institutionName,
        accounts: await this.plaid.getIdentity(item.accessToken),
      })),
    );
    return results;
  }

  // ── Liabilities — credit cards, student loans, mortgages ────────────────

  @Get('liabilities')
  @UseGuards(PlaidLinkedGuard)
  @ApiOperation({
    summary: 'Get liability details (credit cards, student loans, mortgages)',
    description:
      'Calls /liabilities/get for each Item. Returns null per-item if the Item does not support liabilities.',
  })
  @ApiOkResponse({ description: 'Array of per-item liabilities payloads' })
  @ApiForbiddenResponse({ description: 'No Plaid account linked' })
  async getMyLiabilities(@Req() req: PlaidRequest) {
    const results = await Promise.all(
      req.plaidItems.map(async (item) => {
        try {
          const data = await this.plaid.getLiabilities(item.accessToken);
          return {
            itemId: item.itemId,
            institutionName: item.institutionName,
            ...data,
          };
        } catch {
          return {
            itemId: item.itemId,
            institutionName: item.institutionName,
            accounts: [],
            liabilities: null,
          };
        }
      }),
    );
    return results;
  }

  // ── Investments — holdings ──────────────────────────────────────────────

  @Get('investments/holdings')
  @UseGuards(PlaidLinkedGuard)
  @ApiOperation({
    summary: 'Get investment account holdings (positions and securities)',
    description:
      'Calls /investments/holdings/get for each Item. Returns null per-item if the Item does not support investments.',
  })
  @ApiOkResponse({ description: 'Array of per-item holdings payloads' })
  @ApiForbiddenResponse({ description: 'No Plaid account linked' })
  async getMyHoldings(@Req() req: PlaidRequest) {
    const results = await Promise.all(
      req.plaidItems.map(async (item) => {
        try {
          const data = await this.plaid.getInvestmentHoldings(item.accessToken);
          return {
            itemId: item.itemId,
            institutionName: item.institutionName,
            ...data,
          };
        } catch {
          return {
            itemId: item.itemId,
            institutionName: item.institutionName,
            accounts: [],
            holdings: [],
            securities: [],
          };
        }
      }),
    );
    return results;
  }

  // ── Investments — transactions ──────────────────────────────────────────

  @Get('investments/transactions')
  @UseGuards(PlaidLinkedGuard)
  @ApiOperation({
    summary: 'Get investment transactions for a date range',
    description:
      'Calls /investments/transactions/get for each Item. ' +
      'Both startDate and endDate must be ISO YYYY-MM-DD. Defaults to the last 90 days.',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    example: '2024-01-01',
    description: 'YYYY-MM-DD',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    example: '2024-04-01',
    description: 'YYYY-MM-DD',
  })
  @ApiOkResponse({
    description: 'Array of per-item investment transactions payloads',
  })
  @ApiForbiddenResponse({ description: 'No Plaid account linked' })
  async getMyInvestmentTransactions(
    @Req() req: PlaidRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const today = new Date();
    const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
    const start = startDate ?? ninetyDaysAgo.toISOString().slice(0, 10);
    const end = endDate ?? today.toISOString().slice(0, 10);

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(start) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(end)
    ) {
      throw new BadRequestException('startDate and endDate must be YYYY-MM-DD');
    }

    const results = await Promise.all(
      req.plaidItems.map(async (item) => {
        try {
          const data = await this.plaid.getInvestmentTransactions(
            item.accessToken,
            start,
            end,
          );
          return {
            itemId: item.itemId,
            institutionName: item.institutionName,
            ...data,
          };
        } catch {
          return {
            itemId: item.itemId,
            institutionName: item.institutionName,
            accounts: [],
            investmentTransactions: [],
            securities: [],
            totalInvestmentTransactions: 0,
          };
        }
      }),
    );
    return results;
  }

  // ── Remove Item ──────────────────────────────────────────────────────────

  @Delete('items/:id')
  @UseGuards(PlaidLinkedGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Unlink a Plaid Item (disconnect a bank)',
    description:
      'Calls /item/remove on Plaid then deletes the Item from Flamingo. ' +
      'The `id` parameter is the Flamingo UUID of the PlaidItem record.',
  })
  @ApiNoContentResponse({ description: 'Item removed successfully' })
  @ApiForbiddenResponse({ description: 'No Plaid account linked' })
  @ApiNotFoundResponse({
    description: 'Item not found or does not belong to this user',
  })
  async removeItem(@Req() req: PlaidRequest, @Param('id') id: string) {
    const item = req.plaidItems.find((i) => i.id === id);
    if (!item) {
      throw new NotFoundException(`PlaidItem ${id} not found for this user`);
    }
    await this.plaid.removeItem(item.accessToken);
    await this.items.remove(item.id);
  }
}
