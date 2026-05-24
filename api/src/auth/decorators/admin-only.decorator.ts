import { applyDecorators, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from './roles.decorator';
import { Role } from '../../users/entities/user.entity';

/**
 * Composed decorator for admin-only endpoints.
 * Applies JwtAuthGuard + RolesGuard + Role.ADMIN, and annotates Swagger
 * with the 'admin-jwt' security scheme so the UI distinguishes admin routes
 * from regular authenticated routes.
 */
export function AdminOnly() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(Role.ADMIN),
    ApiBearerAuth('admin-jwt'),
    ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' }),
    ApiForbiddenResponse({ description: 'Admin role required' }),
  );
}
