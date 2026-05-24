import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../users/entities/user.entity';

export class UpdateUserAdminDto {
  @ApiPropertyOptional({
    enum: Role,
    description: 'Promote or demote the user\'s role',
    example: 'admin',
  })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Update the user\'s email address; pass null to clear it',
    example: 'alice@example.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Assign a Yodlee sandbox loginName; pass null to unlink',
    example: 'sbMem68c09b712b5831',
  })
  @IsString()
  @IsOptional()
  yodleeLoginName?: string | null;
}
