import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

/**
 * Password hashing. bcrypt is used here for portability; argon2id is the
 * recommended production algorithm (see docs/07-security-compliance.md §7.1).
 */
@Injectable()
export class PasswordService {
  private static readonly ROUNDS = 10;

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, PasswordService.ROUNDS);
  }

  verify(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
