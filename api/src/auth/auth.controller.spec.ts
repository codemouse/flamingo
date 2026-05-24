import { Test, TestingModule } from '@nestjs/testing';
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

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: { register: jest.fn(), login: jest.fn() },
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

      expect(authService.register).toHaveBeenCalledWith('alice', 'password123', undefined);
      expect(result).toEqual(mockUser);
    });
  });

  // ---------------------------------------------------------------------------
  describe('login', () => {
    it('calls AuthService.login and returns the token response', async () => {
      const loginResponse = { accessToken: 'mock-token', user: mockUser };
      authService.login.mockResolvedValue(loginResponse);

      const result = await controller.login({ username: 'alice', password: 'password123' });

      expect(authService.login).toHaveBeenCalledWith('alice', 'password123');
      expect(result.accessToken).toBe('mock-token');
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
