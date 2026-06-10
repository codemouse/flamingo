import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PlaidItemsService } from '../plaid-items.service.js';
import type { AuthenticatedUser } from '../../auth/types/jwt.types.js';

/**
 * Verifies that the authenticated user has at least one linked Plaid Item.
 * Attaches the list of Items to `req.plaidItems` for use in controllers.
 */
@Injectable()
export class PlaidLinkedGuard implements CanActivate {
  constructor(private readonly items: PlaidItemsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      user: AuthenticatedUser;
      plaidItems: import('../entities/plaid-item.entity.js').PlaidItem[];
    }>();

    const userItems = await this.items.findByUser(req.user.id);
    if (!userItems.length) {
      throw new ForbiddenException(
        'No Plaid account linked to this user. Connect a bank via /plaid/me/link-token first.',
      );
    }
    req.plaidItems = userItems;
    return true;
  }
}
