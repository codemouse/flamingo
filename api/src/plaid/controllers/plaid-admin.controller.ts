import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBearerAuth,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { PlaidService } from '../plaid.service.js';
import { PlaidItemsService } from '../plaid-items.service.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { AdminOnly } from '../../auth/decorators/admin-only.decorator.js';

@ApiTags('plaid')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('plaid')
export class PlaidAdminController {
  constructor(
    private readonly plaid: PlaidService,
    private readonly items: PlaidItemsService,
  ) {}

  @Get('items')
  @AdminOnly()
  @ApiOperation({
    summary: 'List all Plaid Items across all users (admin only)',
    description: 'Returns every PlaidItem record; access_token is omitted.',
  })
  @ApiOkResponse({
    description: 'Array of PlaidItem records (access_token omitted)',
  })
  async getAllItems() {
    const all = await this.items.findAll();
    return all.map(({ accessToken: _t, ...safe }) => safe);
  }

  @Delete('items/:id')
  @AdminOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Force-remove a Plaid Item (admin only)',
    description:
      'Calls /item/remove on Plaid (best-effort) and deletes the record from Flamingo. ' +
      'The `id` parameter is the Flamingo UUID of the PlaidItem record.',
  })
  @ApiParam({ name: 'id', description: 'Flamingo PlaidItem UUID' })
  @ApiNoContentResponse({ description: 'Item removed successfully' })
  @ApiNotFoundResponse({ description: 'PlaidItem not found' })
  async removeItem(@Param('id') id: string) {
    const item = await this.items.findById(id); // throws 404 if not found
    try {
      await this.plaid.removeItem(item.accessToken);
    } catch {
      // Best-effort: Plaid may already have revoked the token
    }
    await this.items.remove(id);
  }
}
