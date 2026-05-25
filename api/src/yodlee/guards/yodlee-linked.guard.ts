import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import type { AuthenticatedUser } from '../../auth/types/jwt.types';

@Injectable()
export class YodleeLinkedGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      user: AuthenticatedUser;
      yodleeLoginName: string;
    }>();
    const user = await this.usersService.findById(req.user.id);
    if (!user.yodleeLoginName) {
      throw new ForbiddenException('No Yodlee account linked to this user');
    }
    req.yodleeLoginName = user.yodleeLoginName;
    return true;
  }
}
