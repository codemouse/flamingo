import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { PlaidService } from './plaid.service.js';
import { PlaidItemsService } from './plaid-items.service.js';
import { PlaidTransactionsService } from './plaid-transactions.service.js';
import { PlaidWebhookVerifier } from './plaid-webhook.verifier.js';
import { PlaidItem } from './entities/plaid-item.entity.js';
import { PlaidTransaction } from './entities/plaid-transaction.entity.js';
import { PlaidMeController } from './controllers/plaid-me.controller.js';
import { PlaidSandboxController } from './controllers/plaid-sandbox.controller.js';
import { PlaidAdminController } from './controllers/plaid-admin.controller.js';
import { PlaidInstitutionsController } from './controllers/plaid-institutions.controller.js';
import { PlaidWebhookController } from './controllers/plaid-webhook.controller.js';
import { PlaidLinkedGuard } from './guards/plaid-linked.guard.js';
import { PLAID_SYNC_QUEUE } from './queues/plaid-sync.queue.js';
import { PlaidSyncProcessor } from './queues/plaid-sync.processor.js';
import { PlaidSyncScheduler } from './queues/plaid-sync.scheduler.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlaidItem, PlaidTransaction]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL');
        const isTest = config.get<string>('NODE_ENV') === 'test';
        // Tests run without a real Redis — BullMQ accepts a connection that
        // never resolves; jobs added in tests are buffered and never picked up.
        // Production wires the URL.
        return {
          connection: url
            ? { url }
            : isTest
              ? {
                  host: '127.0.0.1',
                  port: 0,
                  lazyConnect: true,
                  enableOfflineQueue: false,
                  maxRetriesPerRequest: 0,
                }
              : { host: 'localhost', port: 6379 },
        };
      },
    }),
    BullModule.registerQueue({ name: PLAID_SYNC_QUEUE }),
  ],
  controllers: [
    PlaidMeController,
    PlaidSandboxController,
    PlaidAdminController,
    PlaidInstitutionsController,
    PlaidWebhookController,
  ],
  providers: [
    PlaidService,
    PlaidItemsService,
    PlaidTransactionsService,
    PlaidLinkedGuard,
    PlaidWebhookVerifier,
    PlaidSyncProcessor,
    PlaidSyncScheduler,
  ],
  exports: [PlaidService, PlaidItemsService, PlaidTransactionsService],
})
export class PlaidModule {}
