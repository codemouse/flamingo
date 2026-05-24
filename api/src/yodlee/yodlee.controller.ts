import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
  UseGuards,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { YodleeService } from './yodlee.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateAccountDto } from './dto/update-account.dto';
import type { AuthenticatedUser } from '../auth/types/jwt.types';

@ApiTags('yodlee')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('yodlee')
export class YodleeController {
  constructor(
    private readonly yodlee: YodleeService,
    private readonly usersService: UsersService,
  ) {}

  // ---------------------------------------------------------------------------
  // "Me" endpoints — scoped to the authenticated user's linked Yodlee account
  // ---------------------------------------------------------------------------

  @Get('me/accounts')
  @ApiOperation({ summary: "Get the authenticated user's linked Yodlee accounts" })
  async getMyAccounts(@CurrentUser() currentUser: AuthenticatedUser) {
    const user = await this.usersService.findById(currentUser.id);
    if (!user.yodleeLoginName) {
      throw new ForbiddenException('No Yodlee account linked to this user');
    }
    return this.yodlee.getAccounts(user.yodleeLoginName);
  }

  @Get('me/transactions')
  @ApiOperation({ summary: "Get the authenticated user's linked Yodlee transactions" })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'accountId', required: false })
  @ApiQuery({ name: 'top', required: false })
  async getMyTransactions(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('accountId') accountId?: string,
    @Query('top') top?: string,
  ) {
    const user = await this.usersService.findById(currentUser.id);
    if (!user.yodleeLoginName) {
      throw new ForbiddenException('No Yodlee account linked to this user');
    }
    const params: Record<string, string> = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    if (accountId) params.accountId = accountId;
    if (top) params.top = top;
    return this.yodlee.getTransactions(user.yodleeLoginName, params);
  }

  @Get('me/token')
  @ApiOperation({ summary: "Get the authenticated user's Yodlee access token (used to initialise FastLink)" })
  async getMyToken(@CurrentUser() currentUser: AuthenticatedUser) {
    const user = await this.usersService.findById(currentUser.id);
    if (!user.yodleeLoginName) {
      throw new ForbiddenException('No Yodlee account linked to this user');
    }
    const accessToken = await this.yodlee.getAccessToken(user.yodleeLoginName);
    return { accessToken, fastLinkUrl: this.yodlee.fastLinkUrl };
  }

  @Patch('me/accounts/:accountId')
  @ApiOperation({ summary: "Update the authenticated user's account (e.g. set a nickname)" })
  @ApiParam({ name: 'accountId', type: Number })
  async updateMyAccount(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('accountId', ParseIntPipe) accountId: number,
    @Body() body: UpdateAccountDto,
  ) {
    const user = await this.usersService.findById(currentUser.id);
    if (!user.yodleeLoginName) {
      throw new ForbiddenException('No Yodlee account linked to this user');
    }
    return this.yodlee.updateAccount(user.yodleeLoginName, accountId, { account: body });
  }

  @Delete('me/accounts/:accountId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete the authenticated user's Yodlee account" })
  @ApiParam({ name: 'accountId', type: Number })
  async deleteMyAccount(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('accountId', ParseIntPipe) accountId: number,
  ) {
    const user = await this.usersService.findById(currentUser.id);
    if (!user.yodleeLoginName) {
      throw new ForbiddenException('No Yodlee account linked to this user');
    }
    await this.yodlee.deleteAccount(user.yodleeLoginName, accountId);
  }

  // ---------------------------------------------------------------------------
  // Sandbox demo data (same for all authenticated users)
  // ---------------------------------------------------------------------------

  @Get('sandbox/accounts')
  @ApiOperation({ summary: 'Get sandbox demo accounts (shared across all users)' })
  sandboxAccounts() {
    return this.yodlee.getSandboxAccounts();
  }

  @Get('sandbox/transactions')
  @ApiOperation({ summary: 'Get sandbox demo transactions (shared across all users)' })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  sandboxTransactions(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const params: Record<string, string> = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    return this.yodlee.getSandboxTransactions(params);
  }

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
  @ApiQuery({ name: 'loginName', required: false, description: 'User loginName (omit for admin token)' })
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
  async getUser(@Query('loginName') loginName: string) {
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
  async getAccounts(
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
  async getAccount(
    @Query('loginName') loginName: string,
    @Param('accountId', ParseIntPipe) accountId: number,
  ) {
    return this.yodlee.getAccount(loginName, accountId);
  }

  // ---------------------------------------------------------------------------
  // Transactions
  // ---------------------------------------------------------------------------

  @Get('transactions')
  @AdminOnly()
  @ApiOperation({ summary: 'Get transactions for any user (admin)' })
  @ApiQuery({ name: 'loginName', required: true })
  @ApiQuery({ name: 'fromDate', required: false, example: '2024-01-01' })
  @ApiQuery({ name: 'toDate', required: false, example: '2024-12-31' })
  @ApiQuery({ name: 'accountId', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'top', required: false, description: 'Max results to return' })
  async getTransactions(
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

  @Get('transactions/summary')
  @AdminOnly()
  @ApiOperation({ summary: 'Get transaction summary for any user (admin)' })
  @ApiQuery({ name: 'loginName', required: true })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  async getTransactionsSummary(
    @Query('loginName') loginName: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const params: Record<string, string> = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    return this.yodlee.getTransactionsSummary(loginName, params);
  }

  // ---------------------------------------------------------------------------
  // Providers (admin)
  // ---------------------------------------------------------------------------

  @Get('providers')
  @AdminOnly()
  @ApiOperation({ summary: 'Search available financial data providers (admin)' })
  @ApiQuery({ name: 'name', required: false, description: 'Filter by provider name' })
  @ApiQuery({ name: 'capability', required: false })
  async getProviders(
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
  async getProvider(@Param('providerId', ParseIntPipe) providerId: number) {
    return this.yodlee.getProvider(providerId);
  }
}
