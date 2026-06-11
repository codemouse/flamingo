import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';
import { PlaidWebhookVerifier } from '../plaid-webhook.verifier.js';
import { PlaidItemsService } from '../plaid-items.service.js';
import { PlaidService } from '../plaid.service.js';
import { PlaidSyncScheduler } from '../queues/plaid-sync.scheduler.js';

interface PlaidWebhookBody {
  webhook_type?: string;
  webhook_code?: string;
  item_id?: string;
  error?: { error_code?: string; error_message?: string };
  new_transactions?: number;
}

@ApiTags('plaid-webhook')
@Controller('plaid/webhook')
export class PlaidWebhookController {
  private readonly logger = new Logger(PlaidWebhookController.name);

  constructor(
    private readonly verifier: PlaidWebhookVerifier,
    private readonly items: PlaidItemsService,
    private readonly plaid: PlaidService,
    private readonly scheduler: PlaidSyncScheduler,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 600, ttl: 60_000 } })
  @ApiOperation({ summary: 'Receive a Plaid webhook event' })
  @ApiOkResponse({ description: 'Webhook accepted' })
  @ApiUnauthorizedResponse({
    description: 'Signature missing or invalid (production)',
  })
  async handle(
    @Req() req: FastifyRequest & { rawBody?: Buffer },
    @Body() body: PlaidWebhookBody,
  ): Promise<{ ok: true }> {
    const sigHeader = req.headers['plaid-verification'];
    const signature = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader;
    const raw = req.rawBody ?? Buffer.from(JSON.stringify(body));
    await this.verifier.verify(raw, signature);

    this.logger.log(
      `Plaid webhook ${body.webhook_type}/${body.webhook_code} for item=${body.item_id ?? 'unknown'}`,
    );

    // Dispatch by webhook code. Keep handlers tight; long work belongs in a queue.
    if (body.webhook_type === 'TRANSACTIONS' && body.item_id) {
      await this.handleTransactionsEvent(body);
    } else if (body.webhook_type === 'ITEM' && body.item_id) {
      this.handleItemEvent(body);
    }

    return { ok: true };
  }

  private async handleTransactionsEvent(body: PlaidWebhookBody): Promise<void> {
    if (!body.item_id) return;
    const item = await this.items.findByItemId(body.item_id);
    if (!item) {
      this.logger.warn(`Webhook for unknown item_id=${body.item_id}`);
      return;
    }

    if (
      body.webhook_code === 'SYNC_UPDATES_AVAILABLE' ||
      body.webhook_code === 'TRANSACTIONS_UPDATES_AVAILABLE' ||
      body.webhook_code === 'INITIAL_UPDATE' ||
      body.webhook_code === 'HISTORICAL_UPDATE' ||
      body.webhook_code === 'DEFAULT_UPDATE'
    ) {
      await this.scheduler.enqueueItemSync(item.id);
    }
  }

  private handleItemEvent(body: PlaidWebhookBody): void {
    if (
      body.webhook_code === 'ERROR' ||
      body.webhook_code === 'ITEM_LOGIN_REQUIRED'
    ) {
      this.logger.warn(
        `Plaid item ${body.item_id} requires user reauth: ${body.error?.error_code ?? body.webhook_code}`,
      );
      // TODO: persist a "needsReauth" flag on plaid_items and surface in /plaid/me/items.
    }
  }
}
