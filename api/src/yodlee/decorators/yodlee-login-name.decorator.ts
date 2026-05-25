import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Parameter decorator that extracts the yodleeLoginName attached to the
 * request by YodleeLinkedGuard. Must be used on routes that also apply that guard.
 */
export const YodleeLoginName = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string =>
    ctx.switchToHttp().getRequest<{ yodleeLoginName: string }>()
      .yodleeLoginName,
);
