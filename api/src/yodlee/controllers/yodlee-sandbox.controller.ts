import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
  ApiOkResponse,
} from '@nestjs/swagger';
import { YodleeService } from '../yodlee.service.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';

@ApiTags('yodlee')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('yodlee/sandbox')
export class YodleeSandboxController {
  constructor(private readonly yodlee: YodleeService) {}

  @Get('accounts')
  @ApiOperation({
    summary:
      'Get sandbox demo accounts (shared across all authenticated users)',
  })
  @ApiOkResponse({ description: 'Array of demo account objects' })
  sandboxAccounts() {
    return this.yodlee.getSandboxAccounts();
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get sandbox demo transactions' })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiOkResponse({ description: 'Array of demo transaction objects' })
  sandboxTransactions(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const params: Record<string, string> = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    return this.yodlee.getSandboxTransactions(params);
  }
}
