import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @Index()
  @Column({ name: 'user_id' })
  declare userId: string;

  @Index({ unique: true })
  @Column({ name: 'token_hash', length: 64 })
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
  @JoinColumn({ name: 'user_id' })
  declare user: User;

  @CreateDateColumn({ name: 'created_at' })
  declare createdAt: Date;
}
