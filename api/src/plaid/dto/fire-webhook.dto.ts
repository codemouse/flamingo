import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { SandboxItemFireWebhookRequestWebhookCodeEnum } from 'plaid';

export class FireWebhookDto {
  @ApiProperty({
    description:
      'The webhook code to simulate. Common values include SYNC_UPDATES_AVAILABLE, NEW_ACCOUNTS_AVAILABLE, USER_PERMISSION_REVOKED.',
    enum: SandboxItemFireWebhookRequestWebhookCodeEnum,
    example: 'SYNC_UPDATES_AVAILABLE',
  })
  @IsEnum(SandboxItemFireWebhookRequestWebhookCodeEnum)
  webhookCode!: SandboxItemFireWebhookRequestWebhookCodeEnum;
}
