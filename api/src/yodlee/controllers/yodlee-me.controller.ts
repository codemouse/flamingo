import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { YodleeService } from '../yodlee.service.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { YodleeLinkedGuard } from '../guards/yodlee-linked.guard.js';
import { YodleeLoginName } from '../decorators/yodlee-login-name.decorator.js';
import { UpdateAccountDto } from '../dto/update-account.dto.js';

@ApiTags('yodlee')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, YodleeLinkedGuard)
@Controller('yodlee/me')
export class YodleeMeController {
  constructor(private readonly yodlee: YodleeService) {}

  @Get('accounts')
  @ApiOperation({
    summary: "Get the authenticated user's linked Yodlee accounts",
  })
  @ApiOkResponse({ description: 'Array of normalized account objects' })
  @ApiForbiddenResponse({ description: 'User has no linked Yodlee account' })
  getMyAccounts(@YodleeLoginName() loginName: string) {
    return this.yodlee.getAccounts(loginName);
  }

  @Get('transactions')
  @ApiOperation({
    summary: "Get the authenticated user's linked Yodlee transactions",
  })
  @ApiQuery({ name: 'fromDate', required: false, example: '2024-01-01' })
  @ApiQuery({ name: 'toDate', required: false, example: '2024-12-31' })
  @ApiQuery({ name: 'accountId', required: false })
  @ApiQuery({
    name: 'top',
    required: false,
    description: 'Max number of results',
  })
  @ApiOkResponse({ description: 'Array of transaction objects' })
  @ApiForbiddenResponse({ description: 'User has no linked Yodlee account' })
  getMyTransactions(
    @YodleeLoginName() loginName: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('accountId') accountId?: string,
    @Query('top') top?: string,
  ) {
    const params: Record<string, string> = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    if (accountId) params.accountId = accountId;
    if (top) params.top = top;
    return this.yodlee.getTransactions(loginName, params);
  }

  @Get('token')
  @ApiOperation({
    summary: "Get the authenticated user's Yodlee access token",
    description:
      'Returns the FastLink token and URL needed to initialise the FastLink widget.',
  })
  @ApiOkResponse({ description: 'FastLink access token and widget URL' })
  @ApiForbiddenResponse({ description: 'User has no linked Yodlee account' })
  async getMyToken(@YodleeLoginName() loginName: string) {
    const accessToken = await this.yodlee.getAccessToken(loginName);
    return { accessToken, fastLinkUrl: this.yodlee.fastLinkUrl };
  }

  @Patch('accounts/:accountId')
  @ApiOperation({
    summary: "Update the authenticated user's account (e.g. set a nickname)",
  })
  @ApiParam({ name: 'accountId', type: Number })
  @ApiOkResponse({ description: 'Updated account object' })
  @ApiForbiddenResponse({ description: 'User has no linked Yodlee account' })
  updateMyAccount(
    @YodleeLoginName() loginName: string,
    @Param('accountId', ParseIntPipe) accountId: number,
    @Body() body: UpdateAccountDto,
  ) {
    return this.yodlee.updateAccount(loginName, accountId, { account: body });
  }

  @Delete('accounts/:accountId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete the authenticated user's Yodlee account" })
  @ApiParam({ name: 'accountId', type: Number })
  @ApiNoContentResponse({ description: 'Account deleted' })
  @ApiForbiddenResponse({ description: 'User has no linked Yodlee account' })
  deleteMyAccount(
    @YodleeLoginName() loginName: string,
    @Param('accountId', ParseIntPipe) accountId: number,
  ) {
    return this.yodlee.deleteAccount(loginName, accountId);
  }
}
