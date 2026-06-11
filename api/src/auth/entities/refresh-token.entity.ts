import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { User } from '../../users/entities/user.entity';

@Entity('refresh_tokens')
@Index('idx_refresh_tokens_user_id', ['userId'])
@Index('idx_refresh_tokens_token_hash', ['tokenHash'])
@Index('idx_refresh_tokens_expires_at', ['expiresAt'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  declare userId: string;

  @Exclude({ toPlainOnly: true })
  @Column({ name: 'token_hash', type: 'varchar', length: 64, unique: true })
  declare tokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  declare expiresAt: Date;

  @Column({
    name: 'revoked_at',
    type: 'timestamptz',
    nullable: true,
    default: null,
  })
  declare revokedAt: Date | null;

  @Column({ name: 'replaced_by', type: 'uuid', nullable: true, default: null })
  declare replacedBy: string | null;

  @ManyToOne(() => RefreshToken, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({
    name: 'replaced_by',
    foreignKeyConstraintName: 'refresh_tokens_replaced_by_fkey',
  })
  declare replacedByToken: RefreshToken | null;

  @Column({
    name: 'user_agent',
    type: 'varchar',
    length: 512,
    nullable: true,
    default: null,
  })
  declare userAgent: string | null;

  @Column({
    name: 'ip',
    type: 'varchar',
    length: 64,
    nullable: true,
    default: null,
  })
  declare ip: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'refresh_tokens_user_id_fkey',
  })
  declare user: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  declare createdAt: Date;
}
