import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlaidService } from './plaid.service.js';
import { PlaidItemsService } from './plaid-items.service.js';
import { PlaidWebhookVerifier } from './plaid-webhook.verifier.js';
import { PlaidItem } from './entities/plaid-item.entity.js';
import { PlaidMeController } from './controllers/plaid-me.controller.js';
import { PlaidSandboxController } from './controllers/plaid-sandbox.controller.js';
import { PlaidAdminController } from './controllers/plaid-admin.controller.js';
import { PlaidInstitutionsController } from './controllers/plaid-institutions.controller.js';
import { PlaidWebhookController } from './controllers/plaid-webhook.controller.js';
import { PlaidLinkedGuard } from './guards/plaid-linked.guard.js';

@Module({
  imports: [TypeOrmModule.forFeature([PlaidItem])],
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
    PlaidLinkedGuard,
    PlaidWebhookVerifier,
  ],
  exports: [PlaidService, PlaidItemsService],
})
export class PlaidModule {}
