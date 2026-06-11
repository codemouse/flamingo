import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { Queue } from 'bullmq';
import { PlaidItemsService } from '../plaid-items.service.js';
import {
  PLAID_SYNC_JOB_TRANSACTIONS,
  PLAID_SYNC_QUEUE,
  type SyncTransactionsJobData,
} from './plaid-sync.queue.js';

@Injectable()
export class PlaidSyncScheduler {
  private readonly logger = new Logger(PlaidSyncScheduler.name);

  constructor(
    @InjectQueue(PLAID_SYNC_QUEUE) private readonly queue: Queue,
    private readonly items: PlaidItemsService,
  ) {}

  /** Public helper used by webhook + on-demand callers. */
  async enqueueItemSync(plaidItemId: string): Promise<void> {
    const data: SyncTransactionsJobData = { plaidItemId };
    try {
      await this.queue.add(PLAID_SYNC_JOB_TRANSACTIONS, data, {
        jobId: `txns:${plaidItemId}`,
        removeOnComplete: { age: 3600, count: 100 },
        removeOnFail: { age: 24 * 3600 },
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 },
      });
    } catch (err) {
      // Don't fail the request when Redis is unreachable — we have hourly
      // fallback sync, and missing one webhook is recoverable.
      this.logger.warn(
        `Failed to enqueue sync for item=${plaidItemId}: ${(err as Error).message}`,
      );
    }
  }

  /** Hourly catch-up — webhooks are best-effort. */
  @Cron(CronExpression.EVERY_HOUR)
  async runFallbackSync(): Promise<void> {
    const all = await this.items.findAll();
    if (!all.length) return;
    this.logger.log(`Fallback sync: enqueueing ${all.length} item(s)`);
    await Promise.all(all.map((i) => this.enqueueItemSync(i.id)));
  }
}
