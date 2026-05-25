import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { YodleeLinkedGuard } from './yodlee-linked.guard';

const makeCtx = (reqOverrides: Record<string, unknown> = {}) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'user-1', username: 'testuser', role: 'user' },
        yodleeLoginName: '',
        ...reqOverrides,
      }),
    }),
  }) as unknown as ExecutionContext;

describe('YodleeLinkedGuard', () => {
  const mockFindById = jest.fn();
  const mockUsersService = { findById: mockFindById };
  let guard: YodleeLinkedGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new YodleeLinkedGuard(mockUsersService as never);
  });

  it('sets req.yodleeLoginName and returns true when the user has a linked Yodlee account', async () => {
    mockFindById.mockResolvedValue({ yodleeLoginName: 'sbMem1' });
    const req = {
      user: { id: 'user-1', username: 'testuser', role: 'user' },
      yodleeLoginName: '',
    };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(req.yodleeLoginName).toBe('sbMem1');
    expect(mockFindById).toHaveBeenCalledWith('user-1');
  });

  it('throws ForbiddenException when the user has no linked Yodlee account', async () => {
    mockFindById.mockResolvedValue({ yodleeLoginName: null });
    await expect(guard.canActivate(makeCtx())).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws ForbiddenException when yodleeLoginName is an empty string', async () => {
    mockFindById.mockResolvedValue({ yodleeLoginName: '' });
    await expect(guard.canActivate(makeCtx())).rejects.toThrow(
      ForbiddenException,
    );
  });
});
