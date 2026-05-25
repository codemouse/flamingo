import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  HttpException,
} from '@nestjs/common';
import axios from 'axios';
import { YodleeService } from './yodlee.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// The http instance returned by axios.create
const mockHttp = {
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

const makeConfig = (overrides: Record<string, string> = {}) => {
  const defaults: Record<string, string> = {
    YODLEE_BASE_URL: 'https://sandbox.api.yodlee.com/ysl',
    YODLEE_CLIENT_ID: 'test-client-id',
    YODLEE_CLIENT_SECRET: 'test-secret',
    YODLEE_ADMIN_LOGIN_NAME: 'test_admin',
    YODLEE_SANDBOX_USER_POOL: 'sbMem1,sbMem2,sbMem3',
    YODLEE_SANDBOX_LOGIN_NAME: 'sbMem1',
    YODLEE_FASTLINK_URL: 'https://mock.fastlink.test',
    ...overrides,
  };
  return {
    getOrThrow: jest.fn((key: string) => {
      if (key in defaults) return defaults[key];
      throw new Error(`Missing env: ${key}`);
    }),
    get: jest.fn((key: string, def?: string) => defaults[key] ?? def),
  };
};

describe('YodleeService', () => {
  let service: YodleeService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockedAxios.create.mockReturnValue(
      mockHttp as unknown as ReturnType<typeof axios.create>,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YodleeService,
        { provide: ConfigService, useValue: makeConfig() },
      ],
    }).compile();

    service = module.get<YodleeService>(YodleeService);
  });

  // ── getters ───────────────────────────────────────────────────────────────

  describe('adminLoginName', () => {
    it('returns the configured admin login name', () => {
      expect(service.adminLoginName).toBe('test_admin');
    });
  });

  describe('fastLinkUrl', () => {
    it('returns the configured FastLink URL', () => {
      expect(service.fastLinkUrl).toBe('https://mock.fastlink.test');
    });

    it('falls back to the default sandbox URL when not configured', async () => {
      mockedAxios.create.mockReturnValue(
        mockHttp as unknown as ReturnType<typeof axios.create>,
      );
      const module = await Test.createTestingModule({
        providers: [
          YodleeService,
          {
            provide: ConfigService,
            useValue: makeConfig({
              YODLEE_FASTLINK_URL: undefined as unknown as string,
            }),
          },
        ],
      }).compile();
      const svc = module.get<YodleeService>(YodleeService);
      expect(svc.fastLinkUrl).toBe(
        'https://node.sandbox.yodlee.com/authenticate/restserver/',
      );
    });
  });

  // ── getRandomSandboxLoginName ─────────────────────────────────────────────

  describe('getRandomSandboxLoginName', () => {
    it('returns a member from the configured pool', () => {
      const result = service.getRandomSandboxLoginName();
      expect(['sbMem1', 'sbMem2', 'sbMem3']).toContain(result);
    });

    it('throws when the pool env var is empty', async () => {
      mockedAxios.create.mockReturnValue(
        mockHttp as unknown as ReturnType<typeof axios.create>,
      );
      const module = await Test.createTestingModule({
        providers: [
          YodleeService,
          {
            provide: ConfigService,
            useValue: makeConfig({ YODLEE_SANDBOX_USER_POOL: '' }),
          },
        ],
      }).compile();
      const svc = module.get<YodleeService>(YodleeService);
      expect(() => svc.getRandomSandboxLoginName()).toThrow();
    });
  });

  // ── getAccessToken ────────────────────────────────────────────────────────

  describe('getAccessToken', () => {
    const tokenResponse = {
      data: { token: { accessToken: 'tok-abc', expiresIn: 1800 } },
    };

    it('fetches a new token and returns it', async () => {
      mockHttp.post.mockResolvedValue(tokenResponse);

      const token = await service.getAccessToken('sbMem1');

      expect(token).toBe('tok-abc');
      expect(mockHttp.post).toHaveBeenCalledWith(
        '/auth/token',
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ loginName: 'sbMem1' }),
        }),
      );
    });

    it('returns a cached token on subsequent calls before expiry', async () => {
      mockHttp.post.mockResolvedValue(tokenResponse);

      await service.getAccessToken('sbMem1');
      await service.getAccessToken('sbMem1');

      expect(mockHttp.post).toHaveBeenCalledTimes(1);
    });

    it('fetches a new token for each distinct loginName', async () => {
      mockHttp.post.mockResolvedValue(tokenResponse);

      await service.getAccessToken('sbMem1');
      await service.getAccessToken('sbMem2');

      expect(mockHttp.post).toHaveBeenCalledTimes(2);
    });

    it('throws InternalServerErrorException when the Yodlee API fails', async () => {
      mockHttp.post.mockRejectedValue(new Error('network error'));
      await expect(service.getAccessToken('sbMem1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ── getAccounts ───────────────────────────────────────────────────────────

  describe('getAccounts', () => {
    const tokenMock = {
      data: { token: { accessToken: 'tok', expiresIn: 1800 } },
    };

    it('returns an empty array when Yodlee returns no accounts', async () => {
      mockHttp.post.mockResolvedValue(tokenMock);
      mockHttp.get.mockResolvedValue({ data: { account: [] } });

      const result = await service.getAccounts('sbMem1');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/accounts',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
        }),
      );
      expect(result).toEqual([]);
    });

    it('normalizes CONTAINER to lowercase container', async () => {
      mockHttp.post.mockResolvedValue(tokenMock);
      mockHttp.get.mockResolvedValue({
        data: {
          account: [
            {
              CONTAINER: 'bank',
              id: 1,
              accountName: 'Checking',
              accountStatus: 'ACTIVE',
              accountNumber: 'xxxx1234',
              accountType: 'CHECKING',
              providerName: 'Test Bank',
              balance: { currency: 'USD', amount: 1000 },
              isAsset: true,
              lastUpdated: '2024-01-01T00:00:00Z',
            },
          ],
        },
      });

      const result = await service.getAccounts('sbMem1');

      expect(result).toHaveLength(1);
      expect(result[0].container).toBe('bank');
      expect((result[0] as Record<string, unknown>).CONTAINER).toBeUndefined();
    });

    it('forwards optional query params', async () => {
      mockHttp.post.mockResolvedValue(tokenMock);
      mockHttp.get.mockResolvedValue({ data: { account: [] } });

      await service.getAccounts('sbMem1', { accountType: 'bank' });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/accounts',
        expect.objectContaining({ params: { accountType: 'bank' } }),
      );
    });

    it('throws NotFoundException when Yodlee returns 404', async () => {
      mockHttp.post.mockResolvedValue(tokenMock);
      mockHttp.get.mockRejectedValue({ response: { status: 404, data: {} } });
      await expect(service.getAccounts('sbMem1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws UnauthorizedException when Yodlee returns 401', async () => {
      mockHttp.post.mockResolvedValue(tokenMock);
      mockHttp.get.mockRejectedValue({ response: { status: 401, data: {} } });
      await expect(service.getAccounts('sbMem1')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws HttpException(429) when Yodlee returns 429', async () => {
      mockHttp.post.mockResolvedValue(tokenMock);
      mockHttp.get.mockRejectedValue({ response: { status: 429, data: {} } });
      await expect(service.getAccounts('sbMem1')).rejects.toThrow(
        HttpException,
      );
    });

    it('throws InternalServerErrorException for unexpected errors', async () => {
      mockHttp.post.mockResolvedValue(tokenMock);
      mockHttp.get.mockRejectedValue(new Error('network error'));
      await expect(service.getAccounts('sbMem1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ── updateAccount ─────────────────────────────────────────────────────────

  describe('updateAccount', () => {
    it('sends a PUT request to /accounts/:id with the payload', async () => {
      mockHttp.post.mockResolvedValue({
        data: { token: { accessToken: 'tok', expiresIn: 1800 } },
      });
      mockHttp.put.mockResolvedValue({ data: {} });

      await service.updateAccount('sbMem1', 12345, {
        account: { nickname: 'My Savings' },
      });

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/accounts/12345',
        { account: { nickname: 'My Savings' } },
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
        }),
      );
    });
  });

  // ── deleteAccount ─────────────────────────────────────────────────────────

  describe('deleteAccount', () => {
    it('sends a DELETE request to /accounts/:id', async () => {
      mockHttp.post.mockResolvedValue({
        data: { token: { accessToken: 'tok', expiresIn: 1800 } },
      });
      mockHttp.delete.mockResolvedValue({});

      await service.deleteAccount('sbMem1', 99999);

      expect(mockHttp.delete).toHaveBeenCalledWith(
        '/accounts/99999',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
        }),
      );
    });
  });
});
