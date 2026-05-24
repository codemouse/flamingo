import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Role } from '../../users/entities/user.entity';
import type { AuthenticatedUser } from '../types/jwt.types';

const makeContext = (user?: Partial<AuthenticatedUser>): ExecutionContext =>
  ({
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user: user ?? undefined }),
    }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as unknown as jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows access when no roles metadata is set on the handler', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(makeContext({ role: Role.USER }))).toBe(true);
  });

  it('allows access when the roles array is empty', () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    expect(guard.canActivate(makeContext({ role: Role.USER }))).toBe(true);
  });

  it('allows access when the user has the required role', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    expect(guard.canActivate(makeContext({ role: Role.ADMIN }))).toBe(true);
  });

  it('denies access when the user role is not in the required list', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    expect(guard.canActivate(makeContext({ role: Role.USER }))).toBe(false);
  });

  it('denies access when there is no user in the request', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    expect(guard.canActivate(makeContext())).toBe(false);
  });

  it('allows access when the user matches one of multiple required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN, Role.USER]);
    expect(guard.canActivate(makeContext({ role: Role.USER }))).toBe(true);
  });
});
