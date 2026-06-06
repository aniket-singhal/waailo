import { Injectable } from '@nestjs/common';
import { RoleName, User } from '@prisma/client';
import { ConflictError } from 'src/common/errors/app-exception';
import { generateOpaqueToken, sha256 } from 'src/common/utils/crypto.util';
import { AppConfigService } from 'src/common/config/app-config.service';
import { PasswordService } from './password.service';
import { UserRepository } from './repositories/user.repository';

/**
 * User lifecycle operations used by the Auth, Company and Employees modules.
 * Kept here because the Auth context owns identity (see docs/03-domain-model.md).
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordService,
    private readonly config: AppConfigService,
  ) {}

  /** Creates the company OWNER (active, can log in immediately). */
  async createOwner(companyId: string, email: string, plainPassword: string): Promise<User> {
    await this.assertEmailFree(companyId, email);
    const passwordHash = await this.passwords.hash(plainPassword);
    const user = await this.users.create({
      company: { connect: { id: companyId } },
      email: email.toLowerCase(),
      passwordHash,
      status: 'ACTIVE',
    });
    await this.users.assignRole(user.id, RoleName.OWNER);
    return user;
  }

  /**
   * Creates an INVITED user (no usable password yet) and returns the plaintext
   * invite token to be delivered out-of-band. Only the hash is stored.
   */
  async createInvited(
    companyId: string,
    email: string,
    role: RoleName = RoleName.EMPLOYEE,
  ): Promise<{ user: User; inviteToken: string }> {
    await this.assertEmailFree(companyId, email);
    const inviteToken = generateOpaqueToken();
    const placeholderHash = await this.passwords.hash(generateOpaqueToken());
    const user = await this.users.create({
      company: { connect: { id: companyId } },
      email: email.toLowerCase(),
      passwordHash: placeholderHash,
      status: 'INVITED',
      inviteTokenHash: sha256(inviteToken),
      inviteExpiresAt: new Date(Date.now() + this.config.jwt.inviteTtl * 1000),
    });
    await this.users.assignRole(user.id, role);
    return { user, inviteToken };
  }

  private async assertEmailFree(companyId: string, email: string): Promise<void> {
    const existing = await this.users.findByEmail(companyId, email);
    if (existing) {
      throw new ConflictError('A user with this email already exists', 'EMAIL_TAKEN', [
        { field: 'email', issue: 'already in use' },
      ]);
    }
  }
}
