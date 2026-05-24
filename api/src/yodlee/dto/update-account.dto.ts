import { IsString, IsOptional } from 'class-validator';

export class UpdateAccountDto {
  @IsString()
  @IsOptional()
  nickname?: string;
}
