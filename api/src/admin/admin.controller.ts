import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBody,
} from '@nestjs/swagger';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';

@ApiTags('admin')
@AdminOnly()
@Controller('admin')
export class AdminController {
  constructor(
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  @Get('users')
  @ApiOperation({ summary: 'List all Flamingo users (admin only)' })
  @ApiOkResponse({ description: 'Array of all users; passwordHash is omitted' })
  async getAllUsers() {
    const users = await this.users.findAll();
    return users.map(({ passwordHash: _, ...u }) => u);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update a user (admin only)', description: 'Partially updates a user. All fields are optional — send only what needs to change. Pass `null` to clear `email` or `yodleeLoginName`.' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiBody({ type: UpdateUserAdminDto })
  @ApiOkResponse({ description: 'Updated user object; passwordHash is omitted' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserAdminDto) {
    const updated = await this.users.adminUpdate(id, {
      ...(dto.role !== undefined && { role: dto.role }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.yodleeLoginName !== undefined && { yodleeLoginName: dto.yodleeLoginName }),
    });
    const { passwordHash: _, ...safe } = updated;
    return safe;
  }

  @Get('sandbox-pool')
  @ApiOperation({ summary: 'List configured Yodlee sandbox user pool (admin only)' })
  @ApiOkResponse({ description: 'Array of sandbox loginName strings from YODLEE_SANDBOX_USER_POOL env var' })
  getSandboxPool() {
    const raw = this.config.get<string>('YODLEE_SANDBOX_USER_POOL', '');
    const pool = raw.split(',').map((s) => s.trim()).filter(Boolean);
    return { pool };
  }
}
