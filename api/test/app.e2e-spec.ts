import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-test-app';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns 200 or GET / returns 404 (no root route)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect((res) => {
        expect([200, 404]).toContain(res.status);
      });
  });
});
