import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { createTestApp } from './helpers/create-test-app';
import { User, Role } from '../src/users/entities/user.entity';

const E2E_PREFIX = 'e2e_admin_';

describe('Admin (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let adminToken: string;
  let userToken: string;
  let regularUserId: string;

  beforeAll(async () => {
    app = await createTestApp();
    ds = app.get(DataSource);

    // Remove leftovers
    await ds
      .getRepository(User)
      .createQueryBuilder()
      .delete()
      .where('username LIKE :prefix', { prefix: `${E2E_PREFIX}%` })
      .execute();

    // Seed a regular user
    const userReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username: `${E2E_PREFIX}user`, password: 'Password1!' });
    regularUserId = userReg.body.id;

    const userLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: `${E2E_PREFIX}user`, password: 'Password1!' });
    userToken = userLogin.body.accessToken;

    // Seed an admin user directly in the DB (role cannot be set via register)
    const adminReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username: `${E2E_PREFIX}admin`, password: 'Password1!' });

    await ds.getRepository(User).update(adminReg.body.id, { role: Role.ADMIN });

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: `${E2E_PREFIX}admin`, password: 'Password1!' });
    adminToken = adminLogin.body.accessToken;
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

  // ── GET /admin/users ──────────────────────────────────────────────────────

  describe('GET /admin/users', () => {
    it('200 — admin gets all users without passwordHash', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((u: Record<string, unknown>) =>
        expect(u).not.toHaveProperty('passwordHash'),
      );
    });

    it('403 — regular user is forbidden', async () => {
      await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('401 — unauthenticated request is rejected', async () => {
      await request(app.getHttpServer()).get('/admin/users').expect(401);
    });
  });

  // ── PATCH /admin/users/:id ────────────────────────────────────────────────

  describe('PATCH /admin/users/:id', () => {
    it('200 — admin can promote a user to admin role', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admin/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' })
        .expect(200);

      expect(res.body.role).toBe('admin');
      expect(res.body).not.toHaveProperty('passwordHash');

      // Restore
      await ds.getRepository(User).update(regularUserId, { role: Role.USER });
    });

    it('400 — rejects an invalid role value', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'superuser' })
        .expect(400);
    });

    it('403 — regular user cannot update another user', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/users/${regularUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ role: 'admin' })
        .expect(403);
    });

    it('401 — unauthenticated request is rejected', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/users/${regularUserId}`)
        .send({ role: 'admin' })
        .expect(401);
    });
  });

  // ── GET /admin/sandbox-pool ───────────────────────────────────────────────

  describe('GET /admin/sandbox-pool', () => {
    it('200 — returns the configured sandbox pool array', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/sandbox-pool')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('pool');
      expect(Array.isArray(res.body.pool)).toBe(true);
    });

    it('403 — regular user is forbidden', async () => {
      await request(app.getHttpServer())
        .get('/admin/sandbox-pool')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });
});
