import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';
import { AuthUser } from '../tenant/auth-user';

/**
 * Coarse role-based access control. A route's `@Roles(...)` lists the minimum
 * roles; OWNER/HR_ADMIN inherit broad access via the hierarchy below.
 * Resource-level ownership checks live in the services, not here.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  // Higher number = more privileged.
  private static readonly RANK: Record<RoleName, number> = {
    OWNER: 4,
    HR_ADMIN: 3,
    MANAGER: 2,
    EMPLOYEE: 1,
  };

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RoleName[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }
    const user = context.switchToHttp().getRequest().user as AuthUser | undefined;
    if (!user) {
      throw new ForbiddenException('No authenticated user');
    }
    const userRank = Math.max(...user.roles.map((r) => RolesGuard.RANK[r] ?? 0), 0);
    const requiredRank = Math.min(...required.map((r) => RolesGuard.RANK[r] ?? 99));
    if (userRank < requiredRank) {
      throw new ForbiddenException('Insufficient role for this action');
    }
    return true;
  }
}
