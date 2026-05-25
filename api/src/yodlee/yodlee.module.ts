import { Module } from '@nestjs/common';
import { YodleeService } from './yodlee.service.js';
import { YodleeMeController } from './controllers/yodlee-me.controller.js';
import { YodleeSandboxController } from './controllers/yodlee-sandbox.controller.js';
import { YodleeAdminController } from './controllers/yodlee-admin.controller.js';
import { YodleeLinkedGuard } from './guards/yodlee-linked.guard.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [UsersModule],
  controllers: [
    YodleeMeController,
    YodleeSandboxController,
    YodleeAdminController,
  ],
  providers: [YodleeService, YodleeLinkedGuard],
  exports: [YodleeService],
})
export class YodleeModule {}
