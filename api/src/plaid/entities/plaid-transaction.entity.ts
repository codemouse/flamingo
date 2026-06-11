import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PlaidItem } from './plaid-item.entity.js';
import { User } from '../../users/entities/user.entity.js';

/**
 * One Plaid transaction row. Populated by PlaidSyncProcessor from the
 * /transactions/sync endpoint. Pending/non-pending and updates are handled
 * by upsert on `transactionId`; removed transactions are hard-deleted.
 */
@Entity('plaid_transactions')
@Index('idx_plaid_transactions_item_id', ['plaidItemId'])
@Index('idx_plaid_transactions_user_id', ['userId'])
@Index('idx_plaid_transactions_account_id', ['accountId'])
@Index('idx_plaid_transactions_date', ['date'])
export class PlaidTransaction {
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @Column({ name: 'plaid_item_id', type: 'uuid' })
  declare plaidItemId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  declare userId: string;

  @Column({
    name: 'transaction_id',
    type: 'varchar',
    length: 255,
    unique: true,
  })
  declare transactionId: string;

  @Column({ name: 'account_id', type: 'varchar', length: 255 })
  declare accountId: string;

  @Column({ type: 'numeric', precision: 20, scale: 4 })
  declare amount: string;

  @Column({
    name: 'iso_currency_code',
    type: 'varchar',
    length: 8,
    nullable: true,
  })
  declare isoCurrencyCode: string | null;

  @Column({
    name: 'unofficial_currency_code',
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  declare unofficialCurrencyCode: string | null;

  @Column({ type: 'date' })
  declare date: string;

  @Column({ name: 'authorized_date', type: 'date', nullable: true })
  declare authorizedDate: string | null;

  @Column({ type: 'text' })
  declare name: string;

  @Column({ name: 'merchant_name', type: 'text', nullable: true })
  declare merchantName: string | null;

  @Column({
    name: 'payment_channel',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  declare paymentChannel: string | null;

  @Column({ type: 'boolean', default: false })
  declare pending: boolean;

  @Column({ type: 'text', array: true, nullable: true })
  declare category: string[] | null;

  @Column({ name: 'category_id', type: 'varchar', length: 64, nullable: true })
  declare categoryId: string | null;

  @Column({ type: 'jsonb' })
  declare raw: Record<string, unknown>;

  @ManyToOne(() => PlaidItem, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'plaid_item_id',
    foreignKeyConstraintName: 'plaid_transactions_plaid_item_id_fkey',
  })
  declare plaidItem: PlaidItem;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'plaid_transactions_user_id_fkey',
  })
  declare user: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  declare createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  declare updatedAt: Date;
}
