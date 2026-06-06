import { RoleName } from '@prisma/client';

/**
 * The authenticated principal for a request, derived solely from the verified
 * JWT. `companyId` here is the only source of tenant scope — never trust a
 * companyId from the URL or body.
 */
export interface AuthUser {
  userId: string;
  companyId: string;
  email: string;
  roles: RoleName[];
}

/** JWT access-token payload shape. */
export interface AccessTokenPayload {
  sub: string; // userId
  companyId: string;
  email: string;
  roles: RoleName[];
}
