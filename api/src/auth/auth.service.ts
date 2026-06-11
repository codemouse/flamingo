import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { PasswordService } from '../users/password.service';
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
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly refreshTokens: RefreshTokensService,
    private readonly config: ConfigService,
    private readonly passwords: PasswordService,
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

    const { valid, needsRehash } = await this.passwords.verify(
      password,
      user.passwordHash,
    );
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    // Opportunistic upgrade from bcrypt → argon2 (or weaker argon2 params).
    if (needsRehash) {
      try {
        const newHash = await this.passwords.hash(password);
        await this.users.updatePasswordHash(user.id, newHash);
        user.passwordHash = newHash;
      } catch (err) {
        // Don't fail login if rehash storage fails — log and continue.
        this.logger.warn(
          `Password rehash failed for user=${user.id}: ${(err as Error).message}`,
        );
      }
    }

    return this.issueTokens(user, meta);
  }

  /**
   * Rotate a refresh token: validate, revoke old, issue new pair.
   *
   * Includes reuse detection: if the presented token exists but is already
   * revoked, treat it as a stolen-token replay and revoke every active
   * refresh token for the user. The legitimate session will be forced to
   * re-authenticate, which is the correct behavior under suspicion.
   */
  async refresh(
    rawRefreshToken: string,
    meta: { userAgent?: string | null; ip?: string | null } = {},
  ): Promise<IssuedTokens> {
    const row = await this.refreshTokens.findByRawToken(rawRefreshToken);
    if (!row) throw new UnauthorizedException('Invalid refresh token');

    if (row.revokedAt) {
      // Replay of a previously-rotated token. Burn all active tokens for the
      // user — the safer of the two failure modes.
      this.logger.warn(
        `Refresh token reuse detected for user=${row.userId} token=${row.id}; revoking entire family`,
      );
      await this.refreshTokens.revokeAllForUser(row.userId);
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (row.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.users.findById(row.userId);
    const tokens = await this.issueTokens(user, meta);
    // Note the linkage so we can trace replay chains.
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
