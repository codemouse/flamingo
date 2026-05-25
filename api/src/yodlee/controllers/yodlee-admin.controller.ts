import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
  ApiOkResponse,
} from '@nestjs/swagger';
import { YodleeService } from '../yodlee.service.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { AdminOnly } from '../../auth/decorators/admin-only.decorator.js';

@ApiTags('yodlee')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('yodlee')
export class YodleeAdminController {
  constructor(private readonly yodlee: YodleeService) {}

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------

  @Post('token')
  @AdminOnly()
  @ApiOperation({
    summary: 'Request a Yodlee access token (admin)',
    description:
      'Omit loginName to get an admin token. Pass a user loginName to get a user-scoped token.',
  })
  @ApiQuery({
    name: 'loginName',
    required: false,
    description: 'User loginName (omit for admin token)',
  })
  @ApiOkResponse({ description: 'Access token and loginName' })
  async getToken(@Query('loginName') loginName?: string) {
    const login = loginName ?? this.yodlee.adminLoginName;
    const accessToken = await this.yodlee.getAccessToken(login);
    return { accessToken, loginName: login };
  }

  // ---------------------------------------------------------------------------
  // User
  // ---------------------------------------------------------------------------

  @Get('user')
  @AdminOnly()
  @ApiOperation({ summary: 'Get details for a specific Yodlee user (admin)' })
  @ApiQuery({ name: 'loginName', required: true })
  @ApiOkResponse({ description: 'Yodlee user details' })
  getUser(@Query('loginName') loginName: string) {
    return this.yodlee.getUser(loginName);
  }

  // ---------------------------------------------------------------------------
  // Accounts
  // ---------------------------------------------------------------------------

  @Get('accounts')
  @AdminOnly()
  @ApiOperation({ summary: 'Get all linked accounts for any user (admin)' })
  @ApiQuery({ name: 'loginName', required: true })
  @ApiQuery({ name: 'accountType', required: false })
  @ApiQuery({ name: 'providerAccountId', required: false })
  @ApiOkResponse({ description: 'Array of normalized account objects' })
  getAccounts(
    @Query('loginName') loginName: string,
    @Query('accountType') accountType?: string,
    @Query('providerAccountId') providerAccountId?: string,
  ) {
    const params: Record<string, string> = {};
    if (accountType) params.accountType = accountType;
    if (providerAccountId) params.providerAccountId = providerAccountId;
    return this.yodlee.getAccounts(loginName, params);
  }

  @Get('accounts/:accountId')
  @AdminOnly()
  @ApiOperation({ summary: 'Get a specific account for any user (admin)' })
  @ApiQuery({ name: 'loginName', required: true })
  @ApiParam({ name: 'accountId', type: Number })
  @ApiOkResponse({ description: 'Normalized account object' })
  getAccount(
    @Query('loginName') loginName: string,
    @Param('accountId', ParseIntPipe) accountId: number,
  ) {
    return this.yodlee.getAccount(loginName, accountId);
  }

  // ---------------------------------------------------------------------------
  // Transactions (summary before general to avoid route shadowing)
  // ---------------------------------------------------------------------------

  @Get('transactions/summary')
  @AdminOnly()
  @ApiOperation({ summary: 'Get transaction summary for any user (admin)' })
  @ApiQuery({ name: 'loginName', required: true })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiOkResponse({ description: 'Transaction summary object' })
  getTransactionsSummary(
    @Query('loginName') loginName: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const params: Record<string, string> = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    return this.yodlee.getTransactionsSummary(loginName, params);
  }

  @Get('transactions')
  @AdminOnly()
  @ApiOperation({ summary: 'Get transactions for any user (admin)' })
  @ApiQuery({ name: 'loginName', required: true })
  @ApiQuery({ name: 'fromDate', required: false, example: '2024-01-01' })
  @ApiQuery({ name: 'toDate', required: false, example: '2024-12-31' })
  @ApiQuery({ name: 'accountId', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({
    name: 'top',
    required: false,
    description: 'Max results to return',
  })
  @ApiOkResponse({ description: 'Array of transaction objects' })
  getTransactions(
    @Query('loginName') loginName: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('accountId') accountId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('top') top?: string,
  ) {
    const params: Record<string, string> = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    if (accountId) params.accountId = accountId;
    if (categoryId) params.categoryId = categoryId;
    if (top) params.top = top;
    return this.yodlee.getTransactions(loginName, params);
  }

  // ---------------------------------------------------------------------------
  // Providers
  // ---------------------------------------------------------------------------

  @Get('providers')
  @AdminOnly()
  @ApiOperation({
    summary: 'Search available financial data providers (admin)',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    description: 'Filter by provider name',
  })
  @ApiQuery({ name: 'capability', required: false })
  @ApiOkResponse({ description: 'Array of provider objects' })
  getProviders(
    @Query('name') name?: string,
    @Query('capability') capability?: string,
  ) {
    const params: Record<string, string> = {};
    if (name) params.name = name;
    if (capability) params.capability = capability;
    return this.yodlee.getProviders(params);
  }

  @Get('providers/:providerId')
  @AdminOnly()
  @ApiOperation({ summary: 'Get details for a specific provider (admin)' })
  @ApiParam({ name: 'providerId', type: Number })
  @ApiOkResponse({ description: 'Provider details object' })
  getProvider(@Param('providerId', ParseIntPipe) providerId: number) {
    return this.yodlee.getProvider(providerId);
  }
}
