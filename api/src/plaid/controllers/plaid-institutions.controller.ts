import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiQuery,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { PlaidService } from '../plaid.service.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';

@ApiTags('plaid')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('plaid/institutions')
export class PlaidInstitutionsController {
  constructor(private readonly plaid: PlaidService) {}

  @Get('search')
  @ApiOperation({
    summary: 'Search Plaid-supported financial institutions by name',
    description:
      'Authenticated wrapper around /institutions/search. Useful for displaying ' +
      'an institution picker in the UI before opening Plaid Link.',
  })
  @ApiQuery({
    name: 'query',
    required: true,
    example: 'chase',
    description: 'Search term (min 2 chars)',
  })
  @ApiOkResponse({ description: 'Array of matching institutions' })
  @ApiBadRequestResponse({ description: 'Missing or too-short query' })
  async search(@Query('query') query?: string) {
    const q = (query ?? '').trim();
    if (q.length < 2) {
      throw new BadRequestException('Query must be at least 2 characters');
    }
    return this.plaid.searchInstitutions(q);
  }
}
