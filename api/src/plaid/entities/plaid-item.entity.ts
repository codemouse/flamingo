import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

/**
 * Represents one Plaid Item — a user's connection to a single institution.
 * A user may have multiple Items (one per linked bank).
 *
 * SECURITY: access_token is sensitive. In production, encrypt this column
 * at rest (e.g. using pgcrypto or an application-layer AES cipher) before
 * deploying outside a sandbox environment.
 */
@Entity('plaid_items')
export class PlaidItem {
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @Column({ name: 'user_id' })
  declare userId: string;

  @Column({ name: 'item_id', unique: true })
  declare itemId: string;

  /** Plaid access_token — treat as a secret; never expose to clients. */
  @Column({ name: 'access_token', type: 'text' })
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
  @JoinColumn({ name: 'user_id' })
  declare user: User;

  @CreateDateColumn({ name: 'created_at' })
  declare createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  declare updatedAt: Date;
}
