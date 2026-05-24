import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, Role } from './entities/user.entity';

const SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async create(username: string, password: string, email?: string): Promise<User> {
    const existing = await this.repo.findOne({ where: { username } });
    if (existing) {
      throw new ConflictException(`Username "${username}" is already taken`);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = this.repo.create({
      username,
      passwordHash,
      email: email ?? null,
      role: Role.USER,
    });

    return this.repo.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.repo.find({ order: { createdAt: 'ASC' } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.repo.findOne({ where: { username } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async setYodleeLoginName(id: string, yodleeLoginName: string): Promise<void> {
    await this.repo.update(id, { yodleeLoginName });
  }

  async adminUpdate(id: string, fields: { role?: import('./entities/user.entity').Role; email?: string | null; yodleeLoginName?: string | null }): Promise<User> {
    await this.repo.update(id, fields);
    return this.findById(id);
  }
}
