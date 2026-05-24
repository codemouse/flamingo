import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum Role {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @Column({ length: 150, unique: true })
  declare username: string;

  @Column({ type: 'varchar', nullable: true, default: null })
  declare email: string | null;

  @Column({ name: 'password_hash' })
  declare passwordHash: string;

  @Column({ type: 'enum', enum: Role, default: Role.USER })
  declare role: Role;

  @Column({ name: 'yodlee_login_name', type: 'varchar', nullable: true, default: null })
  declare yodleeLoginName: string | null;

  @CreateDateColumn({ name: 'created_at' })
  declare createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  declare updatedAt: Date;
}
