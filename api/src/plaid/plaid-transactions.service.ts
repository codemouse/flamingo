import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import type { Transaction, RemovedTransaction } from 'plaid';
import { PlaidTransaction } from './entities/plaid-transaction.entity.js';

@Injectable()
export class PlaidTransactionsService {
  private readonly logger = new Logger(PlaidTransactionsService.name);

  constructor(
    @InjectRepository(PlaidTransaction)
    private readonly repo: Repository<PlaidTransaction>,
  ) {}

  /**
   * Apply a sync delta from Plaid /transactions/sync to the database.
   * - added/modified: upserted by transactionId
   * - removed: deleted by transactionId
   */
  async applySyncDelta(args: {
    userId: string;
    plaidItemId: string;
    added: Transaction[];
    modified: Transaction[];
    removed: RemovedTransaction[];
  }): Promise<{ inserted: number; updated: number; removed: number }> {
    const { userId, plaidItemId, added, modified, removed } = args;

    const upserts = [...added, ...modified].map((t) =>
      this.toRow(userId, plaidItemId, t),
    );

    if (upserts.length) {
      // QueryDeepPartialEntity is too strict on `jsonb` fields; safe to cast.
      await this.repo.upsert(upserts as never, ['transactionId']);
    }

    let deleted = 0;
    if (removed.length) {
      const ids = removed.map((r) => r.transaction_id).filter(Boolean);
      if (ids.length) {
        const res = await this.repo.delete({ transactionId: In(ids) });
        deleted = res.affected ?? 0;
      }
    }

    this.logger.log(
      `Sync delta for item=${plaidItemId}: +${added.length} ~${modified.length} -${deleted}`,
    );

    return {
      inserted: added.length,
      updated: modified.length,
      removed: deleted,
    };
  }

  async findByUser(
    userId: string,
    opts: { limit?: number; before?: string } = {},
  ): Promise<PlaidTransaction[]> {
    const qb = this.repo
      .createQueryBuilder('t')
      .where('t.userId = :userId', { userId })
      .orderBy('t.date', 'DESC')
      .addOrderBy('t.createdAt', 'DESC')
      .limit(Math.min(opts.limit ?? 100, 500));

    if (opts.before) {
      qb.andWhere('t.date < :before', { before: opts.before });
    }
    return qb.getMany();
  }

  async countByUser(userId: string): Promise<number> {
    return this.repo.count({ where: { userId } });
  }

  async deleteByItem(plaidItemId: string): Promise<void> {
    await this.repo.delete({ plaidItemId });
  }

  private toRow(
    userId: string,
    plaidItemId: string,
    t: Transaction,
  ): Partial<PlaidTransaction> {
    return {
      userId,
      plaidItemId,
      transactionId: t.transaction_id,
      accountId: t.account_id,
      amount: String(t.amount),
      isoCurrencyCode: t.iso_currency_code ?? null,
      unofficialCurrencyCode: t.unofficial_currency_code ?? null,
      date: t.date,
      authorizedDate: t.authorized_date ?? null,
      name: t.name,
      merchantName: t.merchant_name ?? null,
      paymentChannel: t.payment_channel ?? null,
      pending: t.pending ?? false,
      category: t.category ?? null,
      categoryId: t.category_id ?? null,
      raw: t as unknown as Record<string, unknown>,
    };
  }
}
