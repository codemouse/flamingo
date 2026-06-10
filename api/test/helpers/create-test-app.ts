import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../src/app.module';
import { PlaidService } from '../../src/plaid/plaid.service';

/**
 * Shared mock for PlaidService — prevents all real HTTP calls in e2e tests.
 * Tests can override individual methods with jest.fn().mockResolvedValue(…).
 */
export const mockPlaidService = {
  createLinkToken: jest.fn().mockResolvedValue('link-sandbox-mock-token'),
  exchangePublicToken: jest.fn().mockResolvedValue({
    accessToken: 'access-sandbox-mock-token',
    itemId: 'mock-item-id',
  }),
  getAccounts: jest.fn().mockResolvedValue([]),
  getBalance: jest.fn().mockResolvedValue([]),
  getAuth: jest.fn().mockResolvedValue({
    accounts: [],
    numbers: { ach: [], eft: [], international: [], bacs: [] },
  }),
  getIdentity: jest.fn().mockResolvedValue([]),
  getLiabilities: jest.fn().mockResolvedValue({
    accounts: [],
    liabilities: { credit: [], student: [], mortgage: [] },
  }),
  getInvestmentHoldings: jest
    .fn()
    .mockResolvedValue({ accounts: [], holdings: [], securities: [] }),
  getInvestmentTransactions: jest.fn().mockResolvedValue({
    accounts: [],
    investmentTransactions: [],
    securities: [],
    totalInvestmentTransactions: 0,
  }),
  syncTransactions: jest.fn().mockResolvedValue({
    added: [],
    modified: [],
    removed: [],
    nextCursor: 'mock-cursor',
  }),
  removeItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue({ institution_id: 'ins_109508' }),
  getInstitution: jest.fn().mockResolvedValue({ name: 'First Platypus Bank' }),
  searchInstitutions: jest.fn().mockResolvedValue([]),
  sandboxCreatePublicToken: jest
    .fn()
    .mockResolvedValue('public-sandbox-mock-token'),
  getSandboxAccessToken: jest
    .fn()
    .mockResolvedValue('access-sandbox-shared-token'),
  sandboxResetLogin: jest.fn().mockResolvedValue(true),
  sandboxFireWebhook: jest.fn().mockResolvedValue(true),
  sandboxCreateTransactions: jest.fn().mockResolvedValue(undefined),
  isSandbox: true,
  environment: 'sandbox' as const,
};

/**
 * Creates a fully-wired NestJS test application.
 * Uses the real database (flamingo_test) but mocks PlaidService.
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PlaidService)
    .useValue(mockPlaidService)
    .compile();

  const app = moduleFixture.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}
