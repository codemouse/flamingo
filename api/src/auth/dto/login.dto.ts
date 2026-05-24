import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'alice' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'S3cure!Pass' })
  @IsString()
  @MinLength(1)
  password: string;
}
