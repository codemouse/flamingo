import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { randomBytes, createHash } from 'crypto';
import { RefreshToken } from './entities/refresh-token.entity';

const REFRESH_BYTES = 64;

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class RefreshTokensService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly repo: Repository<RefreshToken>,
  ) {}

  generateRawToken(): string {
    return randomBytes(REFRESH_BYTES).toString('base64url');
  }

  async issue(
    userId: string,
    expiresAt: Date,
    meta: { userAgent?: string | null; ip?: string | null } = {},
  ): Promise<{ raw: string; row: RefreshToken }> {
    const raw = this.generateRawToken();
    const row = await this.repo.save(
      this.repo.create({
        userId,
        tokenHash: hashRefreshToken(raw),
        expiresAt,
        userAgent: meta.userAgent ?? null,
        ip: meta.ip ?? null,
      }),
    );
    return { raw, row };
  }

  async findActiveByRawToken(raw: string): Promise<RefreshToken | null> {
    const row = await this.repo.findOne({
      where: { tokenHash: hashRefreshToken(raw) },
    });
    if (!row) return null;
    if (row.revokedAt) return null;
    if (row.expiresAt.getTime() < Date.now()) return null;
    return row;
  }

  async revoke(id: string, replacedBy?: string): Promise<void> {
    await this.repo.update(id, {
      revokedAt: new Date(),
      replacedBy: replacedBy ?? null,
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: () => 'COALESCE(revoked_at, now())' })
      .where('user_id = :userId AND revoked_at IS NULL', { userId })
      .execute();
  }

  async deleteExpired(): Promise<number> {
    const result = await this.repo.delete({ expiresAt: LessThan(new Date()) });
    return result.affected ?? 0;
  }
}
