import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RefreshTokensService } from './refresh-tokens.service';
import { User, Role } from '../users/entities/user.entity';

jest.mock('bcrypt');
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'uuid-1',
  username: 'alice',
  email: null,
  passwordHash: 'hashed-pw',
  role: Role.USER,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('AuthService', () => {
  let service: AuthService;
  let users: jest.Mocked<UsersService>;
  let jwt: jest.Mocked<JwtService>;
  let refresh: jest.Mocked<RefreshTokensService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findByUsername: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn(() => 'mock-jwt-token') },
        },
        {
          provide: RefreshTokensService,
          useValue: {
            issue: jest
              .fn()
              .mockResolvedValue({ raw: 'mock-refresh', row: { id: 'rt-1' } }),
            findActiveByRawToken: jest.fn(),
            revoke: jest.fn(),
            revokeAllForUser: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((k: string, fallback?: unknown) => fallback),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    users = module.get(UsersService);
    jwt = module.get(JwtService);
    refresh = module.get(RefreshTokensService);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  describe('register', () => {
    it('delegates to UsersService and strips passwordHash from response', async () => {
      users.create.mockResolvedValue(makeUser());

      const result = await service.register('alice', 'password123');

      expect(users.create).toHaveBeenCalledWith(
        'alice',
        'password123',
        undefined,
      );
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).toMatchObject({ username: 'alice', role: Role.USER });
    });
  });

  // ---------------------------------------------------------------------------
  describe('login', () => {
    it('returns accessToken, refreshToken and safe user on valid credentials', async () => {
      users.findByUsername.mockResolvedValue(makeUser());
      mockBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.login('alice', 'password123');

      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        'password123',
        'hashed-pw',
      );
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'uuid-1', username: 'alice' }),
      );
      expect(refresh.issue).toHaveBeenCalled();
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.refreshToken).toBe('mock-refresh');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('throws UnauthorizedException when user is not found', async () => {
      users.findByUsername.mockResolvedValue(null);
      await expect(service.login('nobody', 'pass')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwt.sign).not.toHaveBeenCalled();
      expect(refresh.issue).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException on wrong password', async () => {
      users.findByUsername.mockResolvedValue(makeUser());
      mockBcrypt.compare.mockResolvedValue(false as never);
      await expect(service.login('alice', 'wrong')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwt.sign).not.toHaveBeenCalled();
      expect(refresh.issue).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  describe('refresh', () => {
    it('rotates the refresh token and issues a new pair', async () => {
      refresh.findActiveByRawToken.mockResolvedValue({
        id: 'rt-old',
        userId: 'uuid-1',
      } as never);
      users.findById.mockResolvedValue(makeUser());

      const result = await service.refresh('old-raw-token');

      expect(refresh.findActiveByRawToken).toHaveBeenCalledWith(
        'old-raw-token',
      );
      expect(refresh.revoke).toHaveBeenCalledWith('rt-old');
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.refreshToken).toBe('mock-refresh');
    });

    it('throws UnauthorizedException for invalid refresh token', async () => {
      refresh.findActiveByRawToken.mockResolvedValue(null);
      await expect(service.refresh('bad')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(refresh.revoke).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  describe('logout', () => {
    it('revokes the refresh token when found', async () => {
      refresh.findActiveByRawToken.mockResolvedValue({ id: 'rt-1' } as never);
      await service.logout('raw');
      expect(refresh.revoke).toHaveBeenCalledWith('rt-1');
    });

    it('no-ops when token is missing or unknown', async () => {
      await service.logout(undefined);
      refresh.findActiveByRawToken.mockResolvedValue(null);
      await service.logout('unknown');
      expect(refresh.revoke).not.toHaveBeenCalled();
    });
  });
});
