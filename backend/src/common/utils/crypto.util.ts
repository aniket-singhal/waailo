import { createHash, randomBytes } from 'crypto';

/** Generates a high-entropy opaque token (URL-safe). */
export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** One-way hash for storing tokens at rest (invite/reset/refresh). */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
