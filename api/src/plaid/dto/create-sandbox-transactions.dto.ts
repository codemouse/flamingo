import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class SandboxTransactionDto {
  @ApiProperty({
    description: 'Amount (positive = outflow, negative = inflow)',
    example: 12.34,
  })
  @IsNumber()
  amount!: number;

  @ApiProperty({
    description: 'Transaction date (YYYY-MM-DD, today or up to 14 days ago)',
    example: '2026-06-01',
  })
  @IsDateString()
  date_transacted!: string;

  @ApiProperty({
    description: 'Posted date (YYYY-MM-DD, today or up to 14 days ago)',
    example: '2026-06-01',
  })
  @IsDateString()
  date_posted!: string;

  @ApiProperty({
    description: 'Transaction description',
    example: 'Tim Hortons',
  })
  @IsString()
  description!: string;

  @ApiProperty({
    description: 'ISO-4217 currency, defaults to USD',
    required: false,
    example: 'USD',
  })
  @IsOptional()
  @IsString()
  iso_currency_code?: string;
}

export class CreateSandboxTransactionsDto {
  @ApiProperty({
    description: 'Up to 10 custom transactions to inject into a sandbox Item.',
    type: [SandboxTransactionDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => SandboxTransactionDto)
  transactions!: SandboxTransactionDto[];
}
