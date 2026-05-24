import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { createTestApp, mockYodleeService } from './helpers/create-test-app';
import { User } from '../src/users/entities/user.entity';

const E2E_PREFIX = 'e2e_yodlee_';

describe('Yodlee /me endpoints (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let token: string;
  let tokenUnlinked: string;

  beforeAll(async () => {
    app = await createTestApp();
    ds = app.get(DataSource);

    // Clean up
    await ds.getRepository(User)
      .createQueryBuilder()
      .delete()
      .where('username LIKE :prefix', { prefix: `${E2E_PREFIX}%` })
      .execute();

    // User with a linked Yodlee account
    const regRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username: `${E2E_PREFIX}linked`, password: 'Password1!' });

    // register always assigns a sandbox login via mockYodleeService
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: `${E2E_PREFIX}linked`, password: 'Password1!' });
    token = loginRes.body.accessToken;

    // User with no Yodlee link
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username: `${E2E_PREFIX}unlinked`, password: 'Password1!' });

    // Remove the yodlee link so we can test the 403 branch
    await ds.getRepository(User).update(
      { username: `${E2E_PREFIX}unlinked` },
      { yodleeLoginName: null },
    );

    const unlinkedLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: `${E2E_PREFIX}unlinked`, password: 'Password1!' });
    tokenUnlinked = unlinkedLogin.body.accessToken;

    void regRes; // suppress unused warning
  });

  afterAll(async () => {
    await ds.getRepository(User)
      .createQueryBuilder()
      .delete()
      .where('username LIKE :prefix', { prefix: `${E2E_PREFIX}%` })
      .execute();
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockYodleeService.getAccounts.mockResolvedValue({ account: [] });
    mockYodleeService.getTransactions.mockResolvedValue({ transaction: [] });
    mockYodleeService.updateAccount.mockResolvedValue({});
    mockYodleeService.deleteAccount.mockResolvedValue(undefined);
    mockYodleeService.getAccessToken.mockResolvedValue('mock-yodlee-token');
  });

  // ── GET /yodlee/me/accounts ───────────────────────────────────────────────

  describe('GET /yodlee/me/accounts', () => {
    it('200 — returns accounts for the linked user', async () => {
      mockYodleeService.getAccounts.mockResolvedValue({ account: [{ id: 1, accountName: 'Checking' }] });

      const res = await request(app.getHttpServer())
        .get('/yodlee/me/accounts')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('account');
      expect(mockYodleeService.getAccounts).toHaveBeenCalledWith('sbMem68c09b712b5831');
    });

    it('403 — rejects a user with no Yodlee link', async () => {
      await request(app.getHttpServer())
        .get('/yodlee/me/accounts')
        .set('Authorization', `Bearer ${tokenUnlinked}`)
        .expect(403);
    });

    it('401 — rejects an unauthenticated request', async () => {
      await request(app.getHttpServer()).get('/yodlee/me/accounts').expect(401);
    });
  });

  // ── GET /yodlee/me/transactions ───────────────────────────────────────────

  describe('GET /yodlee/me/transactions', () => {
    it('200 — returns transactions for the linked user', async () => {
      mockYodleeService.getTransactions.mockResolvedValue({ transaction: [{ id: 10 }] });

      const res = await request(app.getHttpServer())
        .get('/yodlee/me/transactions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('transaction');
    });

    it('200 — forwards optional query params to YodleeService', async () => {
      await request(app.getHttpServer())
        .get('/yodlee/me/transactions?fromDate=2024-01-01&top=5')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(mockYodleeService.getTransactions).toHaveBeenCalledWith(
        'sbMem68c09b712b5831',
        expect.objectContaining({ fromDate: '2024-01-01', top: '5' }),
      );
    });

    it('403 — rejects a user with no Yodlee link', async () => {
      await request(app.getHttpServer())
        .get('/yodlee/me/transactions')
        .set('Authorization', `Bearer ${tokenUnlinked}`)
        .expect(403);
    });
  });

  // ── GET /yodlee/me/token ──────────────────────────────────────────────────

  describe('GET /yodlee/me/token', () => {
    it('200 — returns accessToken and fastLinkUrl for the linked user', async () => {
      const res = await request(app.getHttpServer())
        .get('/yodlee/me/token')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('accessToken', 'mock-yodlee-token');
      expect(res.body).toHaveProperty('fastLinkUrl', 'https://mock.fastlink.test');
    });

    it('403 — rejects a user with no Yodlee link', async () => {
      await request(app.getHttpServer())
        .get('/yodlee/me/token')
        .set('Authorization', `Bearer ${tokenUnlinked}`)
        .expect(403);
    });

    it('401 — rejects an unauthenticated request', async () => {
      await request(app.getHttpServer()).get('/yodlee/me/token').expect(401);
    });
  });

  // ── PATCH /yodlee/me/accounts/:id ─────────────────────────────────────────

  describe('PATCH /yodlee/me/accounts/:id', () => {
    it('200 — updates the account nickname', async () => {
      await request(app.getHttpServer())
        .patch('/yodlee/me/accounts/12345')
        .set('Authorization', `Bearer ${token}`)
        .send({ nickname: 'My Savings' })
        .expect(200);

      expect(mockYodleeService.updateAccount).toHaveBeenCalledWith(
        'sbMem68c09b712b5831',
        12345,
        { account: { nickname: 'My Savings' } },
      );
    });

    it('403 — rejects a user with no Yodlee link', async () => {
      await request(app.getHttpServer())
        .patch('/yodlee/me/accounts/12345')
        .set('Authorization', `Bearer ${tokenUnlinked}`)
        .send({ nickname: 'Test' })
        .expect(403);
    });

    it('401 — rejects an unauthenticated request', async () => {
      await request(app.getHttpServer())
        .patch('/yodlee/me/accounts/12345')
        .send({ nickname: 'Test' })
        .expect(401);
    });
  });

  // ── DELETE /yodlee/me/accounts/:id ────────────────────────────────────────

  describe('DELETE /yodlee/me/accounts/:id', () => {
    it('204 — deletes the account and returns no content', async () => {
      await request(app.getHttpServer())
        .delete('/yodlee/me/accounts/12345')
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      expect(mockYodleeService.deleteAccount).toHaveBeenCalledWith(
        'sbMem68c09b712b5831',
        12345,
      );
    });

    it('403 — rejects a user with no Yodlee link', async () => {
      await request(app.getHttpServer())
        .delete('/yodlee/me/accounts/12345')
        .set('Authorization', `Bearer ${tokenUnlinked}`)
        .expect(403);
    });

    it('401 — rejects an unauthenticated request', async () => {
      await request(app.getHttpServer())
        .delete('/yodlee/me/accounts/12345')
        .expect(401);
    });
  });

  // ── Admin-only endpoints reject regular users with 403 ───────────────────

  describe('Admin-only raw Yodlee endpoints', () => {
    it('403 — GET /yodlee/accounts rejects a regular user', async () => {
      await request(app.getHttpServer())
        .get('/yodlee/accounts?loginName=sbMem1')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('403 — POST /yodlee/token rejects a regular user', async () => {
      await request(app.getHttpServer())
        .post('/yodlee/token')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('403 — GET /yodlee/providers rejects a regular user', async () => {
      await request(app.getHttpServer())
        .get('/yodlee/providers')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('401 — GET /yodlee/accounts rejects unauthenticated request', async () => {
      await request(app.getHttpServer())
        .get('/yodlee/accounts?loginName=sbMem1')
        .expect(401);
    });
  });
});
