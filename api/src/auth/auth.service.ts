import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { YodleeService } from '../yodlee/yodlee.service';
import { User } from '../users/entities/user.entity';
import { JwtPayload } from './types/jwt.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly yodlee: YodleeService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(username: string, password: string, email?: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.users.create(username, password, email);

    try {
      const isSandbox = this.config
        .getOrThrow<string>('YODLEE_BASE_URL')
        .toLowerCase()
        .includes('sandbox');

      let yodleeLoginName: string;

      if (isSandbox) {
        // Sandbox: randomly assign one of the pre-registered Yodlee test users.
        yodleeLoginName = this.yodlee.getRandomSandboxLoginName();
      } else {
        // Production: create a new Yodlee user account for this Flamingo user.
        yodleeLoginName = `fl_${user.id.replace(/-/g, '')}`;
        await this.yodlee.createUser(yodleeLoginName, email);
      }

      await this.users.setYodleeLoginName(user.id, yodleeLoginName);
      user.yodleeLoginName = yodleeLoginName;
    } catch {
      // Non-fatal: user is created in Flamingo; Yodlee link can be retried later.
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  async login(username: string, password: string): Promise<{ accessToken: string; user: Omit<User, 'passwordHash'> }> {
    const user = await this.users.findByUsername(username);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) throw new UnauthorizedException('Invalid credentials');

    const payload: JwtPayload = { sub: user.id, username: user.username, role: user.role };
    const accessToken = this.jwt.sign(payload);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...safeUser } = user;
    return { accessToken, user: safeUser };
  }
}
