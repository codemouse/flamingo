import { IsString, MinLength, MaxLength, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'alice', minLength: 3, maxLength: 150 })
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  username!: string;

  @ApiProperty({ example: 'S3cure!Pass', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ example: 'alice@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;
}
