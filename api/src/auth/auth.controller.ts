import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { CookieSerializeOptions } from '@fastify/cookie';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './types/jwt.types';
import { ACCESS_COOKIE, REFRESH_COOKIE, parseDuration } from './auth.constants';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Username already taken' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.username, dto.password, dto.email);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Log in; sets httpOnly cookies and also returns accessToken',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns accessToken and user profile',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const tokens = await this.auth.login(dto.username, dto.password, {
      userAgent: req.headers['user-agent'] ?? null,
      ip: req.ip ?? null,
    });
    this.setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken,
      tokens.refreshExpiresAt,
    );
    return { accessToken: tokens.accessToken, user: tokens.user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Rotate refresh token (reads cookie or body) and issue a new access token',
  })
  @ApiResponse({ status: 200, description: 'Returns new accessToken' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
    @Body() body: { refreshToken?: string } = {},
  ) {
    const raw = req.cookies?.[REFRESH_COOKIE] ?? body?.refreshToken;
    if (!raw) throw new UnauthorizedException('Missing refresh token');

    const tokens = await this.auth.refresh(raw, {
      userAgent: req.headers['user-agent'] ?? null,
      ip: req.ip ?? null,
    });
    this.setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken,
      tokens.refreshExpiresAt,
    );
    return { accessToken: tokens.accessToken, user: tokens.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke refresh token and clear auth cookies' })
  @ApiResponse({ status: 204, description: 'Logged out' })
  async logout(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const raw = req.cookies?.[REFRESH_COOKIE] ?? undefined;
    await this.auth.logout(raw);
    this.clearAuthCookies(res);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user profile from JWT' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  // ---------------------------------------------------------------------------
  // Cookie helpers
  // ---------------------------------------------------------------------------

  private cookieOptions(maxAgeMs: number): CookieSerializeOptions {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    const domain = this.config.get<string>('COOKIE_DOMAIN');
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      path: '/',
      maxAge: Math.floor(maxAgeMs / 1000),
      ...(domain ? { domain } : {}),
    };
  }

  private setAuthCookies(
    res: FastifyReply,
    accessToken: string,
    refreshToken: string,
    refreshExpiresAt: Date,
  ): void {
    const accessMs = parseDuration(
      this.config.get<string>('JWT_EXPIRES_IN', '15m'),
      15 * 60_000,
    );
    const refreshMs = Math.max(0, refreshExpiresAt.getTime() - Date.now());

    res.setCookie(ACCESS_COOKIE, accessToken, this.cookieOptions(accessMs));
    res.setCookie(REFRESH_COOKIE, refreshToken, this.cookieOptions(refreshMs));
  }

  private clearAuthCookies(res: FastifyReply): void {
    const opts = this.cookieOptions(0);
    res.clearCookie(ACCESS_COOKIE, opts);
    res.clearCookie(REFRESH_COOKIE, opts);
  }
}
