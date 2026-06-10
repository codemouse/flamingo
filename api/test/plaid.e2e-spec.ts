import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { createTestApp, mockPlaidService } from './helpers/create-test-app';
import { User } from '../src/users/entities/user.entity';
import { PlaidItem } from '../src/plaid/entities/plaid-item.entity';

const E2E_PREFIX = 'e2e_plaid_';

describe('Plaid /me endpoints (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let token: string;
  let tokenNoItems: string;

  beforeAll(async () => {
    app = await createTestApp();
    ds = app.get(DataSource);

    // Clean up any leftovers
    const userRepo = ds.getRepository(User);
    const itemRepo = ds.getRepository(PlaidItem);

    const oldUsers = await userRepo
      .createQueryBuilder('u')
      .where('u.username LIKE :prefix', { prefix: `${E2E_PREFIX}%` })
      .getMany();
    if (oldUsers.length) {
      await itemRepo.delete(oldUsers.map((u) => ({ userId: u.id })));
      await userRepo
        .createQueryBuilder()
        .delete()
        .where('username LIKE :prefix', { prefix: `${E2E_PREFIX}%` })
        .execute();
    }

    // Register and log in a user who will have a linked Plaid Item
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username: `${E2E_PREFIX}linked`, password: 'Password1!' })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: `${E2E_PREFIX}linked`, password: 'Password1!' });
    token = loginRes.body.accessToken;

    // Register a user with no linked Item
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username: `${E2E_PREFIX}unlinked`, password: 'Password1!' })
      .expect(201);

    const unlinkedLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: `${E2E_PREFIX}unlinked`, password: 'Password1!' });
    tokenNoItems = unlinkedLogin.body.accessToken;
  });

  afterAll(async () => {
    const userRepo = ds.getRepository(User);
    const itemRepo = ds.getRepository(PlaidItem);
    const users = await userRepo
      .createQueryBuilder('u')
      .where('u.username LIKE :prefix', { prefix: `${E2E_PREFIX}%` })
      .getMany();
    if (users.length) {
      await itemRepo.delete(users.map((u) => ({ userId: u.id })));
      await userRepo
        .createQueryBuilder()
        .delete()
        .where('username LIKE :prefix', { prefix: `${E2E_PREFIX}%` })
        .execute();
    }
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPlaidService.createLinkToken.mockResolvedValue(
      'link-sandbox-mock-token',
    );
    mockPlaidService.exchangePublicToken.mockResolvedValue({
      accessToken: 'access-sandbox-mock-token',
      itemId: `mock-item-${Date.now()}`,
    });
    mockPlaidService.getAccounts.mockResolvedValue([]);
    mockPlaidService.syncTransactions.mockResolvedValue({
      added: [],
      modified: [],
      removed: [],
      nextCursor: 'mock-cursor',
    });
    mockPlaidService.getItem.mockResolvedValue({
      institution_id: 'ins_109508',
    });
    mockPlaidService.getInstitution.mockResolvedValue({
      name: 'First Platypus Bank',
    });
  });

  // ── POST /plaid/me/link-token ─────────────────────────────────────────────

  describe('POST /plaid/me/link-token', () => {
    it('201 — returns a link_token', async () => {
      const res = await request(app.getHttpServer())
        .post('/plaid/me/link-token')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(res.body.linkToken).toBe('link-sandbox-mock-token');
      expect(mockPlaidService.createLinkToken).toHaveBeenCalledWith(
        expect.any(String),
      );
    });

    it('401 — rejects unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .post('/plaid/me/link-token')
        .expect(401);
    });
  });

  // ── POST /plaid/me/exchange-token ─────────────────────────────────────────

  describe('POST /plaid/me/exchange-token', () => {
    it('201 — exchanges public_token, creates a PlaidItem, returns safe record', async () => {
      const itemId = `mock-item-exchange-${Date.now()}`;
      mockPlaidService.exchangePublicToken.mockResolvedValueOnce({
        accessToken: 'access-sandbox-exchange-token',
        itemId,
      });

      const res = await request(app.getHttpServer())
        .post('/plaid/me/exchange-token')
        .set('Authorization', `Bearer ${token}`)
        .send({ publicToken: 'public-sandbox-test' })
        .expect(201);

      expect(res.body).toMatchObject({
        itemId,
        institutionName: 'First Platypus Bank',
      });
      expect(res.body).not.toHaveProperty('accessToken');
    });

    it('400 — rejects a missing publicToken', async () => {
      await request(app.getHttpServer())
        .post('/plaid/me/exchange-token')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);
    });

    it('401 — rejects unauthenticated', async () => {
      await request(app.getHttpServer())
        .post('/plaid/me/exchange-token')
        .send({ publicToken: 'public-sandbox-test' })
        .expect(401);
    });
  });

  // ── GET /plaid/me/items ───────────────────────────────────────────────────

  describe('GET /plaid/me/items', () => {
    it('200 — returns items for a linked user', async () => {
      // First create an item
      const itemId = `mock-item-list-${Date.now()}`;
      mockPlaidService.exchangePublicToken.mockResolvedValueOnce({
        accessToken: 'access-sandbox-list-token',
        itemId,
      });
      await request(app.getHttpServer())
        .post('/plaid/me/exchange-token')
        .set('Authorization', `Bearer ${token}`)
        .send({ publicToken: 'public-sandbox-list' });

      const res = await request(app.getHttpServer())
        .get('/plaid/me/items')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(
        res.body.every((i: { accessToken?: unknown }) => !i.accessToken),
      ).toBe(true);
    });

    it('200 — returns empty array for user with no linked items', async () => {
      const res = await request(app.getHttpServer())
        .get('/plaid/me/items')
        .set('Authorization', `Bearer ${tokenNoItems}`)
        .expect(200);
      expect(res.body).toEqual([]);
    });
  });

  // ── GET /plaid/me/accounts ────────────────────────────────────────────────

  describe('GET /plaid/me/accounts', () => {
    it('200 — returns aggregated accounts', async () => {
      mockPlaidService.getAccounts.mockResolvedValue([
        {
          account_id: 'acc-001',
          name: 'Plaid Checking',
          type: 'depository',
          subtype: 'checking',
          balances: {
            current: 1000,
            available: 900,
            limit: null,
            iso_currency_code: 'USD',
          },
          mask: '0000',
          official_name: null,
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/plaid/me/accounts')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      // All items return accounts, so at least 1 account expected
    });

    it('200 — returns empty array for user with no linked items', async () => {
      const res = await request(app.getHttpServer())
        .get('/plaid/me/accounts')
        .set('Authorization', `Bearer ${tokenNoItems}`)
        .expect(200);
      expect(res.body).toEqual([]);
    });

    it('401 — rejects unauthenticated', async () => {
      await request(app.getHttpServer()).get('/plaid/me/accounts').expect(401);
    });
  });

  // ── GET /plaid/me/transactions ────────────────────────────────────────────

  describe('GET /plaid/me/transactions', () => {
    it('200 — returns sync results per item', async () => {
      mockPlaidService.syncTransactions.mockResolvedValue({
        added: [{ transaction_id: 'txn-1', amount: 25.0, date: '2024-01-01' }],
        modified: [],
        removed: [],
        nextCursor: 'new-cursor-abc',
      });

      const res = await request(app.getHttpServer())
        .get('/plaid/me/transactions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('200 — returns empty array for user with no linked items', async () => {
      const res = await request(app.getHttpServer())
        .get('/plaid/me/transactions')
        .set('Authorization', `Bearer ${tokenNoItems}`)
        .expect(200);
      expect(res.body).toEqual([]);
    });
  });

  // ── Plaid sandbox endpoints ───────────────────────────────────────────────

  describe('POST /plaid/sandbox/create-item', () => {
    it('201 — creates and links a sandbox item for the current user', async () => {
      const itemId = `mock-item-sandbox-${Date.now()}`;
      mockPlaidService.sandboxCreatePublicToken.mockResolvedValueOnce(
        'public-sandbox-bypass',
      );
      mockPlaidService.exchangePublicToken.mockResolvedValueOnce({
        accessToken: 'access-sandbox-bypass-token',
        itemId,
      });

      const res = await request(app.getHttpServer())
        .post('/plaid/sandbox/create-item')
        .set('Authorization', `Bearer ${tokenNoItems}`)
        .expect(201);

      expect(res.body).toMatchObject({ itemId });
      expect(res.body).not.toHaveProperty('accessToken');
    });

    it('401 — rejects unauthenticated', async () => {
      await request(app.getHttpServer())
        .post('/plaid/sandbox/create-item')
        .expect(401);
    });
  });

  describe('GET /plaid/sandbox/accounts', () => {
    it('200 — returns demo accounts', async () => {
      mockPlaidService.getSandboxAccessToken.mockResolvedValue(
        'shared-sandbox-token',
      );
      mockPlaidService.getAccounts.mockResolvedValue([
        { account_id: 'demo-001', name: 'Demo Checking' },
      ]);

      const res = await request(app.getHttpServer())
        .get('/plaid/sandbox/accounts')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
