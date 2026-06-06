import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '@prisma/client';
import { RolesGuard } from 'src/common/auth/roles.guard';
import { AuthUser } from 'src/common/tenant/auth-user';

function contextFor(user: AuthUser | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

function guardWithRequired(required: RoleName[] | undefined): RolesGuard {
  const reflector = {
    getAllAndOverride: () => required,
  } as unknown as Reflector;
  return new RolesGuard(reflector);
}

const user = (roles: RoleName[]): AuthUser => ({
  userId: 'u1',
  companyId: 'c1',
  email: 'a@b.com',
  roles,
});

describe('RolesGuard', () => {
  it('allows when no roles are required', () => {
    const guard = guardWithRequired(undefined);
    expect(guard.canActivate(contextFor(user(['EMPLOYEE'])))).toBe(true);
  });

  it('allows a higher-ranked role to access a lower requirement', () => {
    const guard = guardWithRequired([RoleName.EMPLOYEE]);
    expect(guard.canActivate(contextFor(user([RoleName.HR_ADMIN])))).toBe(true);
  });

  it('denies a lower-ranked role for a higher requirement', () => {
    const guard = guardWithRequired([RoleName.HR_ADMIN]);
    expect(() => guard.canActivate(contextFor(user([RoleName.EMPLOYEE])))).toThrow(
      ForbiddenException,
    );
  });

  it('denies when there is no authenticated user', () => {
    const guard = guardWithRequired([RoleName.EMPLOYEE]);
    expect(() => guard.canActivate(contextFor(undefined))).toThrow(ForbiddenException);
  });
});
