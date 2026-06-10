import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, mockPlaidService } from './helpers/create-test-app';

describe('Plaid webhook (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('200 — accepts unsigned webhook in test mode and dispatches', async () => {
    const res = await request(app.getHttpServer())
      .post('/plaid/webhook')
      .send({
        webhook_type: 'TRANSACTIONS',
        webhook_code: 'SYNC_UPDATES_AVAILABLE',
        item_id: 'unknown-item-id',
      })
      .expect(200);

    expect(res.body).toEqual({ ok: true });
  });

  it('200 — handles ITEM_LOGIN_REQUIRED without crashing on unknown item', async () => {
    await request(app.getHttpServer())
      .post('/plaid/webhook')
      .send({
        webhook_type: 'ITEM',
        webhook_code: 'ITEM_LOGIN_REQUIRED',
        item_id: 'some-item',
        error: {
          error_code: 'ITEM_LOGIN_REQUIRED',
          error_message: 'Reauth needed',
        },
      })
      .expect(200);
  });

  it('does not call syncTransactions when item is unknown', async () => {
    mockPlaidService.syncTransactions.mockClear();
    await request(app.getHttpServer())
      .post('/plaid/webhook')
      .send({
        webhook_type: 'TRANSACTIONS',
        webhook_code: 'DEFAULT_UPDATE',
        item_id: 'definitely-not-real',
      })
      .expect(200);

    expect(mockPlaidService.syncTransactions).not.toHaveBeenCalled();
  });
});
