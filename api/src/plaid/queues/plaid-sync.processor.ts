import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, NotFoundException } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PlaidItemsService } from '../plaid-items.service.js';
import { PlaidService } from '../plaid.service.js';
import { PlaidTransactionsService } from '../plaid-transactions.service.js';
import type { PlaidItem } from '../entities/plaid-item.entity.js';
import {
  PLAID_SYNC_JOB_TRANSACTIONS,
  PLAID_SYNC_QUEUE,
  type SyncTransactionsJobData,
} from './plaid-sync.queue.js';

@Processor(PLAID_SYNC_QUEUE)
export class PlaidSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(PlaidSyncProcessor.name);

  constructor(
    private readonly items: PlaidItemsService,
    private readonly plaid: PlaidService,
    private readonly transactions: PlaidTransactionsService,
  ) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    if (job.name === PLAID_SYNC_JOB_TRANSACTIONS) {
      return this.syncTransactions(job.data as SyncTransactionsJobData);
    }
    this.logger.warn(`Unknown job name: ${job.name}`);
    return null;
  }

  private async syncTransactions(data: SyncTransactionsJobData) {
    let item: PlaidItem;
    try {
      item = await this.items.findById(data.plaidItemId);
    } catch (err) {
      if (err instanceof NotFoundException) {
        this.logger.warn(
          `sync-transactions: plaid item ${data.plaidItemId} no longer exists, skipping`,
        );
        return null;
      }
      throw err;
    }

    const { added, modified, removed, nextCursor } =
      await this.plaid.syncTransactions(item.accessToken, item.cursor);

    await this.transactions.applySyncDelta({
      userId: item.userId,
      plaidItemId: item.id,
      added,
      modified,
      removed,
    });

    if (nextCursor) {
      await this.items.updateCursor(item.id, nextCursor);
    }

    return {
      added: added.length,
      modified: modified.length,
      removed: removed.length,
    };
  }
}
