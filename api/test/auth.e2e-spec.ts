import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { createTestApp } from './helpers/create-test-app';
import { User } from '../src/users/entities/user.entity';

const E2E_PREFIX = 'e2e_auth_';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;

  beforeAll(async () => {
    app = await createTestApp();
    ds = app.get(DataSource);
    // Clean up any leftover test users from previous runs
    await ds
      .getRepository(User)
      .delete({ username: `${E2E_PREFIX}alice` as unknown as string });
  });

  afterAll(async () => {
    await ds
      .getRepository(User)
      .createQueryBuilder()
      .delete()
      .where('username LIKE :prefix', { prefix: `${E2E_PREFIX}%` })
      .execute();
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  // ── POST /auth/register ───────────────────────────────────────────────────

  describe('POST /auth/register', () => {
    it('201 — creates a user and returns safe user fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: `${E2E_PREFIX}alice`, password: 'Password1!' })
        .expect(201);

      expect(res.body).toMatchObject({
        username: `${E2E_PREFIX}alice`,
        role: 'user',
      });
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('409 — conflicts when the username is already taken', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: `${E2E_PREFIX}alice`, password: 'Password1!' });

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: `${E2E_PREFIX}alice`, password: 'Password1!' })
        .expect(409);
    });

    it('400 — rejects a missing username', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ password: 'Password1!' })
        .expect(400);
    });

    it('400 — rejects a missing password', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: `${E2E_PREFIX}nopass` })
        .expect(400);
    });
  });

  // ── POST /auth/login ──────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    const creds = { username: `${E2E_PREFIX}bob`, password: 'Password1!' };

    beforeAll(async () => {
      await request(app.getHttpServer()).post('/auth/register').send(creds);
    });

    it('200 — returns accessToken and safe user on valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(creds)
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user).toMatchObject({ username: creds.username });
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });

    it('401 — rejects a non-existent username', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: `${E2E_PREFIX}ghost`, password: 'anything' })
        .expect(401);
    });

    it('401 — rejects a wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: creds.username, password: 'wrongpassword' })
        .expect(401);
    });
  });

  // ── GET /auth/me ──────────────────────────────────────────────────────────

  describe('GET /auth/me', () => {
    let token: string;

    beforeAll(async () => {
      const creds = { username: `${E2E_PREFIX}carol`, password: 'Password1!' };
      await request(app.getHttpServer()).post('/auth/register').send(creds);
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(creds);
      token = res.body.accessToken;
    });

    it('200 — returns the current user from the JWT', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({ username: `${E2E_PREFIX}carol` });
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('401 — rejects a request with no token', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('401 — rejects a malformed token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer not.a.valid.token')
        .expect(401);
    });
  });
});
