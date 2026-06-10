import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import {
  RefreshTokensService,
  hashRefreshToken,
} from './refresh-tokens.service';
import { RefreshToken } from './entities/refresh-token.entity';

const makeRow = (overrides: Partial<RefreshToken> = {}): RefreshToken =>
  ({
    id: 'rt-1',
    userId: 'user-1',
    tokenHash: 'hash',
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    replacedBy: null,
    userAgent: null,
    ip: null,
    createdAt: new Date(),
    ...overrides,
  }) as RefreshToken;

describe('RefreshTokensService', () => {
  let service: RefreshTokensService;
  let repo: jest.Mocked<Repository<RefreshToken>>;
  let qbExecute: jest.Mock;

  beforeEach(async () => {
    qbExecute = jest.fn().mockResolvedValue({ affected: 1 });
    const qb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: qbExecute,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokensService,
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(() => qb),
          },
        },
      ],
    }).compile();

    service = module.get(RefreshTokensService);
    repo = module.get(getRepositoryToken(RefreshToken));
  });

  afterEach(() => jest.clearAllMocks());

  describe('hashRefreshToken', () => {
    it('returns a SHA-256 hex digest of the input', () => {
      const expected = createHash('sha256').update('abc').digest('hex');
      expect(hashRefreshToken('abc')).toBe(expected);
    });
  });

  describe('generateRawToken', () => {
    it('returns a base64url-encoded string', () => {
      const raw = service.generateRawToken();
      expect(typeof raw).toBe('string');
      expect(raw.length).toBeGreaterThan(0);
      expect(raw).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('returns a different value on each call', () => {
      const a = service.generateRawToken();
      const b = service.generateRawToken();
      expect(a).not.toBe(b);
    });
  });

  describe('issue', () => {
    it('creates and saves a token row and returns the raw token', async () => {
      const expiresAt = new Date(Date.now() + 60_000);
      const created = makeRow({ userId: 'user-1', expiresAt });
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      const result = await service.issue('user-1', expiresAt, {
        userAgent: 'jest',
        ip: '127.0.0.1',
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          expiresAt,
          userAgent: 'jest',
          ip: '127.0.0.1',
          tokenHash: hashRefreshToken(result.raw),
        }),
      );
      expect(repo.save).toHaveBeenCalledWith(created);
      expect(result.row).toBe(created);
      expect(typeof result.raw).toBe('string');
    });

    it('defaults userAgent and ip to null when no meta is provided', async () => {
      const expiresAt = new Date(Date.now() + 60_000);
      repo.create.mockReturnValue(makeRow());
      repo.save.mockResolvedValue(makeRow());

      await service.issue('user-1', expiresAt);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userAgent: null, ip: null }),
      );
    });
  });

  describe('findActiveByRawToken', () => {
    it('returns null when no row is found', async () => {
      repo.findOne.mockResolvedValue(null);
      expect(await service.findActiveByRawToken('raw')).toBeNull();
    });

    it('returns null when the row has been revoked', async () => {
      repo.findOne.mockResolvedValue(makeRow({ revokedAt: new Date() }));
      expect(await service.findActiveByRawToken('raw')).toBeNull();
    });

    it('returns null when the row is expired', async () => {
      repo.findOne.mockResolvedValue(
        makeRow({ expiresAt: new Date(Date.now() - 1) }),
      );
      expect(await service.findActiveByRawToken('raw')).toBeNull();
    });

    it('returns the row when it is active and not expired', async () => {
      const row = makeRow();
      repo.findOne.mockResolvedValue(row);
      const result = await service.findActiveByRawToken('raw');
      expect(result).toBe(row);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { tokenHash: hashRefreshToken('raw') },
      });
    });
  });

  describe('revoke', () => {
    it('updates revokedAt and replacedBy', async () => {
      repo.update.mockResolvedValue({ affected: 1 } as never);
      await service.revoke('rt-1', 'rt-2');
      expect(repo.update).toHaveBeenCalledWith(
        'rt-1',
        expect.objectContaining({ replacedBy: 'rt-2' }),
      );
    });

    it('defaults replacedBy to null when not provided', async () => {
      repo.update.mockResolvedValue({ affected: 1 } as never);
      await service.revoke('rt-1');
      expect(repo.update).toHaveBeenCalledWith(
        'rt-1',
        expect.objectContaining({ replacedBy: null }),
      );
    });
  });

  describe('revokeAllForUser', () => {
    it('runs an update query for the given user', async () => {
      await service.revokeAllForUser('user-1');
      expect(repo.createQueryBuilder).toHaveBeenCalled();
      expect(qbExecute).toHaveBeenCalled();
    });
  });

  describe('deleteExpired', () => {
    it('returns the number of affected rows', async () => {
      repo.delete.mockResolvedValue({ affected: 3 } as never);
      expect(await service.deleteExpired()).toBe(3);
    });

    it('returns 0 when affected is undefined', async () => {
      repo.delete.mockResolvedValue({} as never);
      expect(await service.deleteExpired()).toBe(0);
    });
  });
});
