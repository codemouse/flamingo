/**
 * BullMQ queue for Plaid sync work.
 *
 * Jobs:
 *  - sync-transactions: { plaidItemId } — sync /transactions/sync for one Item
 */
export const PLAID_SYNC_QUEUE = 'plaid-sync';

export interface SyncTransactionsJobData {
  plaidItemId: string;
}

export const PLAID_SYNC_JOB_TRANSACTIONS = 'sync-transactions';
