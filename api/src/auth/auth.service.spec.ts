import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { YodleeService } from '../yodlee/yodlee.service';
import { User, Role } from '../users/entities/user.entity';

jest.mock('bcrypt');
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'uuid-1',
  username: 'alice',
  email: null,
  passwordHash: 'hashed-pw',
  role: Role.USER,
  yodleeLoginName: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('AuthService', () => {
  let service: AuthService;
  let users: jest.Mocked<UsersService>;
  let yodlee: { getRandomSandboxLoginName: jest.Mock; createUser: jest.Mock };
  let jwt: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findByUsername: jest.fn(),
            setYodleeLoginName: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: YodleeService,
          useValue: {
            getRandomSandboxLoginName: jest.fn().mockReturnValue('sbMem68c09b712b5831'),
            createUser: jest.fn().mockResolvedValue('fl_uuid1'),
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn(() => 'mock-jwt-token') },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('https://sandbox.api.yodlee.com/ysl'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    users = module.get(UsersService);
    yodlee = module.get(YodleeService);
    jwt = module.get(JwtService);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  describe('register', () => {
    it('delegates to UsersService and strips passwordHash from response', async () => {
      users.create.mockResolvedValue(makeUser());

      const result = await service.register('alice', 'password123');

      expect(users.create).toHaveBeenCalledWith('alice', 'password123', undefined);
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).toMatchObject({ username: 'alice', role: Role.USER });
    });

    it('assigns a sandbox Yodlee login when the base URL contains "sandbox"', async () => {
      users.create.mockResolvedValue(makeUser());

      await service.register('alice', 'password123');

      expect(users.setYodleeLoginName).toHaveBeenCalledWith('uuid-1', 'sbMem68c09b712b5831');
    });

    it('does not fail the registration if Yodlee assignment throws', async () => {
      users.create.mockResolvedValue(makeUser());
      yodlee.getRandomSandboxLoginName.mockImplementationOnce(() => {
        throw new Error('pool empty');
      });

      await expect(service.register('alice', 'password123')).resolves.not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  describe('login', () => {
    it('returns accessToken and safe user on valid credentials', async () => {
      users.findByUsername.mockResolvedValue(makeUser());
      mockBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.login('alice', 'password123');

      expect(mockBcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-pw');
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'uuid-1', username: 'alice' }),
      );
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('throws UnauthorizedException when user is not found', async () => {
      users.findByUsername.mockResolvedValue(null);
      await expect(service.login('nobody', 'pass')).rejects.toThrow(UnauthorizedException);
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException on wrong password', async () => {
      users.findByUsername.mockResolvedValue(makeUser());
      mockBcrypt.compare.mockResolvedValue(false as never);
      await expect(service.login('alice', 'wrong')).rejects.toThrow(UnauthorizedException);
      expect(jwt.sign).not.toHaveBeenCalled();
    });
  });
});
