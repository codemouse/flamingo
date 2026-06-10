import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { JwtPayload } from './types/jwt.types';
import { RefreshTokensService } from './refresh-tokens.service';
import { parseDuration } from './auth.constants';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: Omit<User, 'passwordHash'>;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly refreshTokens: RefreshTokensService,
    private readonly config: ConfigService,
  ) {}

  async register(
    username: string,
    password: string,
    email?: string,
  ): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.users.create(username, password, email);

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  async login(
    username: string,
    password: string,
    meta: { userAgent?: string | null; ip?: string | null } = {},
  ): Promise<IssuedTokens> {
    const user = await this.users.findByUsername(username);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user, meta);
  }

  /** Rotate a refresh token: validate, revoke old, issue new pair. */
  async refresh(
    rawRefreshToken: string,
    meta: { userAgent?: string | null; ip?: string | null } = {},
  ): Promise<IssuedTokens> {
    const row = await this.refreshTokens.findActiveByRawToken(rawRefreshToken);
    if (!row) throw new UnauthorizedException('Invalid refresh token');

    const user = await this.users.findById(row.userId);
    const tokens = await this.issueTokens(user, meta);
    await this.refreshTokens.revoke(row.id);
    return tokens;
  }

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) return;
    const row = await this.refreshTokens.findActiveByRawToken(rawRefreshToken);
    if (row) await this.refreshTokens.revoke(row.id);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.refreshTokens.revokeAllForUser(userId);
  }

  private async issueTokens(
    user: User,
    meta: { userAgent?: string | null; ip?: string | null },
  ): Promise<IssuedTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };
    const accessToken = this.jwt.sign(payload);

    const refreshTtlMs = parseDuration(
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      7 * 24 * 60 * 60 * 1000,
    );
    const expiresAt = new Date(Date.now() + refreshTtlMs);
    const { raw: refreshToken } = await this.refreshTokens.issue(
      user.id,
      expiresAt,
      meta,
    );

    const { passwordHash: _, ...safeUser } = user;
    return {
      accessToken,
      refreshToken,
      refreshExpiresAt: expiresAt,
      user: safeUser,
    };
  }
}
