import { Module } from '@nestjs/common';
import { YodleeService } from './yodlee.service';
import { YodleeController } from './yodlee.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [YodleeController],
  providers: [YodleeService],
  exports: [YodleeService],
})
export class YodleeModule {}
