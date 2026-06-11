import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Role } from '../users/entities/user.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const mockUser = {
  id: 'uuid-1',
  username: 'alice',
  email: null,
  role: Role.USER,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const makeRes = () => ({
  setCookie: jest.fn(),
  clearCookie: jest.fn(),
});
const makeReq = (overrides: Record<string, unknown> = {}) => ({
  headers: { 'user-agent': 'jest' },
  ip: '127.0.0.1',
  cookies: {},
  ...overrides,
});

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refresh: jest.fn(),
            logout: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((_k: string, fallback?: unknown) => fallback),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  describe('register', () => {
    it('calls AuthService.register and returns the new user', async () => {
      authService.register.mockResolvedValue(mockUser);

      const result = await controller.register({
        username: 'alice',
        password: 'password123',
      });

      expect(authService.register).toHaveBeenCalledWith(
        'alice',
        'password123',
        undefined,
      );
      expect(result).toEqual(mockUser);
    });
  });

  // ---------------------------------------------------------------------------
  describe('login', () => {
    it('sets cookies and returns accessToken + user', async () => {
      const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      authService.login.mockResolvedValue({
        accessToken: 'mock-token',
        refreshToken: 'mock-refresh',
        refreshExpiresAt,
        user: mockUser,
      });

      const req = makeReq();
      const res = makeRes();
      const result = await controller.login(
        { username: 'alice', password: 'password123' },
        req as never,
        res as never,
      );

      expect(authService.login).toHaveBeenCalledWith(
        'alice',
        'password123',
        expect.any(Object),
      );
      expect(result.accessToken).toBe('mock-token');
      expect(res.setCookie).toHaveBeenCalledTimes(2);
    });
  });

  // ---------------------------------------------------------------------------
  describe('refresh', () => {
    it('rotates tokens using cookie value when present', async () => {
      authService.refresh.mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        refreshExpiresAt: new Date(Date.now() + 60_000),
        user: mockUser,
      });

      const req = makeReq({ cookies: { flamingo_rt: 'cookie-refresh' } });
      const res = makeRes();
      const result = await controller.refresh(req as never, res as never);

      expect(authService.refresh).toHaveBeenCalledWith(
        'cookie-refresh',
        expect.any(Object),
      );
      expect(result.accessToken).toBe('new-access');
    });

    it('falls back to body refreshToken when no cookie present', async () => {
      authService.refresh.mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        refreshExpiresAt: new Date(Date.now() + 60_000),
        user: mockUser,
      });

      const req = makeReq();
      const res = makeRes();
      await controller.refresh(req as never, res as never, {
        refreshToken: 'body-refresh',
      });

      expect(authService.refresh).toHaveBeenCalledWith(
        'body-refresh',
        expect.any(Object),
      );
    });

    it('throws when no token provided', async () => {
      const req = makeReq();
      const res = makeRes();
      await expect(
        controller.refresh(req as never, res as never),
      ).rejects.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  describe('logout', () => {
    it('clears cookies and revokes refresh token', async () => {
      const req = makeReq({ cookies: { flamingo_rt: 'rt' } });
      const res = makeRes();
      await controller.logout(req as never, res as never);
      expect(authService.logout).toHaveBeenCalledWith('rt');
      expect(res.clearCookie).toHaveBeenCalledTimes(2);
    });
  });

  // ---------------------------------------------------------------------------
  describe('me', () => {
    it('returns the authenticated user from the JWT payload', () => {
      const authUser = { id: 'uuid-1', username: 'alice', role: Role.USER };
      const result = controller.me(authUser);
      expect(result).toEqual(authUser);
    });
  });
});
