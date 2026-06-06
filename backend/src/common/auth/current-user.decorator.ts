import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../tenant/auth-user';

/**
 * Injects the authenticated principal into a controller method.
 * Usage: `@CurrentUser() user: AuthUser`
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthUser;
  },
);
