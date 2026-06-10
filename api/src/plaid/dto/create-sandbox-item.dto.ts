import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSandboxItemDto {
  @ApiPropertyOptional({
    description: 'Plaid institution ID to use for the sandbox Item',
    example: 'ins_109508',
  })
  @IsOptional()
  @IsString()
  declare institutionId?: string;
}
