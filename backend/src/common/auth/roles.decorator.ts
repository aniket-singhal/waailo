import { SetMetadata } from '@nestjs/common';
import { RoleName } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** Declares the minimum roles allowed to call a route. */
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
