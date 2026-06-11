import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { User } from '../../users/entities/user.entity.js';
import { encryptedColumn } from '../../common/crypto/encryption.js';

/**
 * Represents one Plaid Item — a user's connection to a single institution.
 * A user may have multiple Items (one per linked bank).
 *
 * access_token is encrypted at rest via the `encryptedColumn` TypeORM
 * transformer (AES-256-GCM, key from ENCRYPTION_KEY env var).
 */
@Entity('plaid_items')
@Index('idx_plaid_items_user_id', ['userId'])
@Index('idx_plaid_items_item_id', ['itemId'])
export class PlaidItem {
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  declare userId: string;

  @Column({ name: 'item_id', type: 'varchar', length: 255, unique: true })
  declare itemId: string;

  @Exclude({ toPlainOnly: true })
  @Column({ name: 'access_token', type: 'text', transformer: encryptedColumn })
  declare accessToken: string;

  @Column({
    name: 'institution_id',
    type: 'varchar',
    length: 100,
    nullable: true,
    default: null,
  })
  declare institutionId: string | null;

  @Column({
    name: 'institution_name',
    type: 'varchar',
    length: 255,
    nullable: true,
    default: null,
  })
  declare institutionName: string | null;

  /** Cursor for /transactions/sync — persisted so incremental syncs work. */
  @Column({ type: 'text', nullable: true, default: null })
  declare cursor: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'plaid_items_user_id_fkey',
  })
  declare user: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  declare createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  declare updatedAt: Date;
}
