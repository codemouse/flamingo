import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';

export enum Role {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('users')
@Index('idx_users_username', ['username'])
@Index('idx_users_email', ['email'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  declare username: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    default: null,
    unique: true,
  })
  declare email: string | null;

  @Exclude({ toPlainOnly: true })
  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  declare passwordHash: string;

  @Column({ type: 'enum', enum: Role, default: Role.USER })
  declare role: Role;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  declare createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  declare updatedAt: Date;
}
