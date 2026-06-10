import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  InternalServerErrorException,
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
} from '@nestjs/swagger';
import { PlaidService } from '../plaid.service.js';
import { PlaidItemsService } from '../plaid-items.service.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { CreateSandboxItemDto } from '../dto/create-sandbox-item.dto.js';
import { FireWebhookDto } from '../dto/fire-webhook.dto.js';
import { CreateSandboxTransactionsDto } from '../dto/create-sandbox-transactions.dto.js';
import { ConfigService } from '@nestjs/config';
import type { AuthenticatedUser } from '../../auth/types/jwt.types.js';

interface PlaidRequest extends Request {
  user: AuthenticatedUser;
}

@ApiTags('plaid')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('plaid/sandbox')
export class PlaidSandboxController {
  constructor(
    private readonly plaid: PlaidService,
    private readonly items: PlaidItemsService,
    private readonly config: ConfigService,
  ) {}

  private assertSandbox() {
    if (this.config.get<string>('PLAID_ENV', 'sandbox') === 'production') {
      throw new InternalServerErrorException(
        'Sandbox endpoints are disabled in production',
      );
    }
  }

  // ── Create a sandbox Item for the current user (bypass Plaid Link) ───────

  @Post('create-item')
  @ApiOperation({
    summary:
      'Create a sandbox Plaid Item for the current user (bypasses Link UI)',
    description:
      'Calls /sandbox/public_token/create then exchanges it — the same result as ' +
      'going through Plaid Link with user_good / pass_good. ' +
      'Useful for automated tests and local development. Disabled in production.',
  })
  @ApiCreatedResponse({
    description: 'Created PlaidItem record (access_token omitted)',
  })
  async createSandboxItem(
    @Req() req: PlaidRequest,
    @Body() dto: CreateSandboxItemDto,
  ) {
    this.assertSandbox();

    const publicToken = await this.plaid.sandboxCreatePublicToken(
      dto.institutionId,
    );
    const { accessToken, itemId } =
      await this.plaid.exchangePublicToken(publicToken);

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
      // Non-fatal
    }

    const plaidItem = await this.items.create(
      req.user.id,
      itemId,
      accessToken,
      institutionId,
      institutionName,
    );

    const { accessToken: _t, ...safe } = plaidItem;
    return safe;
  }

  // ── Shared sandbox demo endpoints ────────────────────────────────────────

  @Get('accounts')
  @ApiOperation({
    summary: 'Get demo accounts from a shared sandbox Item',
    description:
      'Returns accounts from a service-level sandbox access_token. ' +
      'Does NOT require the user to have their own linked Item.',
  })
  @ApiOkResponse({ description: 'Array of Plaid AccountBase objects' })
  async sandboxAccounts() {
    this.assertSandbox();
    const token = await this.plaid.getSandboxAccessToken();
    return this.plaid.getAccounts(token);
  }

  @Get('transactions')
  @ApiOperation({
    summary: 'Get demo transactions from a shared sandbox Item',
    description:
      'Returns added transactions from a service-level sandbox sync. ' +
      'Does NOT require the user to have their own linked Item.',
  })
  @ApiOkResponse({ description: 'Array of Plaid Transaction objects' })
  async sandboxTransactions() {
    this.assertSandbox();
    const token = await this.plaid.getSandboxAccessToken();
    const { added } = await this.plaid.syncTransactions(token);
    return added;
  }

  // ── Sandbox testing utilities (per-Item) ─────────────────────────────────

  private async findOwnedItem(userId: string, itemUuid: string) {
    const item = await this.items.findById(itemUuid);
    if (item.userId !== userId) {
      throw new ForbiddenException('PlaidItem does not belong to this user');
    }
    return item;
  }

  @Post('items/:id/reset-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Force ITEM_LOGIN_REQUIRED on a sandbox Item',
    description:
      'Wraps /sandbox/item/reset_login. Useful for testing Plaid Link update mode flows. ' +
      'Sandbox-only.',
  })
  @ApiOkResponse({ description: '{ resetLogin: true } when successful' })
  @ApiForbiddenResponse({ description: 'Item does not belong to this user' })
  @ApiNotFoundResponse({ description: 'Item not found' })
  async resetLogin(@Req() req: PlaidRequest, @Param('id') id: string) {
    this.assertSandbox();
    const item = await this.findOwnedItem(req.user.id, id);
    const resetLogin = await this.plaid.sandboxResetLogin(item.accessToken);
    return { resetLogin };
  }

  @Post('items/:id/fire-webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Fire a test webhook for a sandbox Item',
    description:
      'Wraps /sandbox/item/fire_webhook. Allows you to simulate webhook events ' +
      '(SYNC_UPDATES_AVAILABLE, NEW_ACCOUNTS_AVAILABLE, USER_PERMISSION_REVOKED, etc.). ' +
      'Requires PLAID_WEBHOOK_URL configured on the Item. Sandbox-only.',
  })
  @ApiOkResponse({
    description: '{ webhookFired: true } when delivery was simulated',
  })
  @ApiForbiddenResponse({ description: 'Item does not belong to this user' })
  @ApiNotFoundResponse({ description: 'Item not found' })
  async fireWebhook(
    @Req() req: PlaidRequest,
    @Param('id') id: string,
    @Body() dto: FireWebhookDto,
  ) {
    this.assertSandbox();
    const item = await this.findOwnedItem(req.user.id, id);
    const webhookFired = await this.plaid.sandboxFireWebhook(
      item.accessToken,
      dto.webhookCode,
    );
    return { webhookFired };
  }

  @Post('items/:id/transactions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Inject custom transactions into a sandbox Item',
    description:
      'Wraps /sandbox/transactions/create. Adds up to 10 custom transactions. ' +
      'Only works for Items created with the user_transactions_dynamic test user. Sandbox-only.',
  })
  @ApiNoContentResponse({
    description: 'Transactions queued for the next /transactions/sync',
  })
  @ApiForbiddenResponse({ description: 'Item does not belong to this user' })
  @ApiNotFoundResponse({ description: 'Item not found' })
  async createTransactions(
    @Req() req: PlaidRequest,
    @Param('id') id: string,
    @Body() dto: CreateSandboxTransactionsDto,
  ) {
    this.assertSandbox();
    const item = await this.findOwnedItem(req.user.id, id);
    await this.plaid.sandboxCreateTransactions(
      item.accessToken,
      dto.transactions,
    );
  }
}
