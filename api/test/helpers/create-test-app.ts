import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { YodleeService } from '../../src/yodlee/yodlee.service';

/**
 * Shared mock for YodleeService — prevents all real HTTP calls in e2e tests.
 * Tests can override individual methods with jest.fn().mockResolvedValue(…).
 */
export const mockYodleeService = {
  getRandomSandboxLoginName: jest.fn().mockReturnValue('sbMem68c09b712b5831'),
  createUser: jest.fn().mockResolvedValue('fl_test'),
  getUser: jest.fn().mockResolvedValue({ user: { loginName: 'sbMem68c09b712b5831' } }),
  getAccounts: jest.fn().mockResolvedValue({ account: [] }),
  getAccount: jest.fn().mockResolvedValue({ account: {} }),
  getTransactions: jest.fn().mockResolvedValue({ transaction: [] }),
  getTransactionsSummary: jest.fn().mockResolvedValue({ transactionSummary: [] }),
  getSandboxAccounts: jest.fn().mockResolvedValue({ account: [] }),
  getSandboxTransactions: jest.fn().mockResolvedValue({ transaction: [] }),
  getProviders: jest.fn().mockResolvedValue({ provider: [] }),
  getProvider: jest.fn().mockResolvedValue({ provider: {} }),
  getAccessToken: jest.fn().mockResolvedValue('mock-yodlee-access-token'),
  updateAccount: jest.fn().mockResolvedValue({}),
  deleteAccount: jest.fn().mockResolvedValue(undefined),
  adminLoginName: 'test_admin',
  fastLinkUrl: 'https://mock.fastlink.test',
};

/**
 * Creates a fully-wired NestJS test application.
 * Uses the real database (flamingo_test) but mocks YodleeService.
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(YodleeService)
    .useValue(mockYodleeService)
    .compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}
