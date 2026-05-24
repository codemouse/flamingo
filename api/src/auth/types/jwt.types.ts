import { Role } from '../../users/entities/user.entity';

export interface JwtPayload {
  sub: string;
  username: string;
  role: Role;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: Role;
}
