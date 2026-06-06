import { Injectable, Logger } from '@nestjs/common';
import { RoleName, User } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { AppConfigService } from 'src/common/config/app-config.service';
import { UnauthorizedError } from 'src/common/errors/app-exception';
import { AuthUser } from 'src/common/tenant/auth-user';
import { generateOpaqueToken, sha256 } from 'src/common/utils/crypto.util';
import { PasswordService } from './password.service';
import { TokenService, TokenPair } from './token.service';
import { UserRepository, UserWithRoles } from './repositories/user.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { LoginDto, RefreshDto, ForgotPasswordDto, ResetPasswordDto, AcceptInviteDto, MeDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly config: AppConfigService,
  ) {}

  async login(dto: LoginDto): Promise<TokenPair> {
    const company = await this.prisma.company.findUnique({ where: { slug: dto.companySlug } });
    if (!company) {
      throw new UnauthorizedError('Invalid credentials');
    }
    const user = await this.users.findByEmail(company.id, dto.email);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Invalid credentials');
    }
    const ok = await this.passwords.verify(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedError('Invalid credentials');
    }
    await this.users.update(user.id, { lastLoginAt: new Date() });
    return this.issueTokenPair(user);
  }

  async refresh(dto: RefreshDto): Promise<TokenPair> {
    const hashed = sha256(dto.refreshToken);
    const existing = await this.refreshTokens.findByHash(hashed);
    if (!existing) {
      throw new UnauthorizedError('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
    }
    // Reuse detection: a presented-but-revoked token means the family is compromised.
    if (existing.revokedAt || existing.expiresAt <= new Date()) {
      await this.refreshTokens.revokeAllForUser(existing.userId);
      throw new UnauthorizedError('Refresh token no longer valid', 'INVALID_REFRESH_TOKEN');
    }
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: existing.userId },
      include: { roles: { include: { role: true } } },
    });
    const pair = await this.issueTokenPair(user, async (newHash) => {
      await this.refreshTokens.revoke(existing.id, newHash);
    });
    return pair;
  }

  async logout(dto: RefreshDto): Promise<void> {
    const existing = await this.refreshTokens.findByHash(sha256(dto.refreshToken));
    if (existing && !existing.revokedAt) {
      await this.refreshTokens.revoke(existing.id);
    }
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const company = await this.prisma.company.findUnique({ where: { slug: dto.companySlug } });
    if (!company) {
      return; // do not reveal whether the company/email exists
    }
    const user = await this.users.findByEmail(company.id, dto.email);
    if (!user) {
      return;
    }
    const token = generateOpaqueToken();
    await this.users.update(user.id, {
      resetTokenHash: sha256(token),
      resetExpiresAt: new Date(Date.now() + this.config.jwt.resetTtl * 1000),
    });
    // In Phase 2 this enqueues an email/WhatsApp via the Notifications module.
    this.logger.log(`Password reset requested for user ${user.id} (token issued)`);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const user = await this.users.findByResetTokenHash(sha256(dto.token));
    if (!user || !user.resetExpiresAt || user.resetExpiresAt <= new Date()) {
      throw new UnauthorizedError('Invalid or expired reset token', 'INVALID_RESET_TOKEN');
    }
    const passwordHash = await this.passwords.hash(dto.newPassword);
    await this.users.update(user.id, {
      passwordHash,
      resetTokenHash: null,
      resetExpiresAt: null,
      status: 'ACTIVE',
    });
    await this.refreshTokens.revokeAllForUser(user.id);
  }

  async acceptInvite(dto: AcceptInviteDto): Promise<TokenPair> {
    const user = await this.users.findByInviteTokenHash(sha256(dto.token));
    if (!user || !user.inviteExpiresAt || user.inviteExpiresAt <= new Date()) {
      throw new UnauthorizedError('Invalid or expired invite token', 'INVALID_INVITE_TOKEN');
    }
    const passwordHash = await this.passwords.hash(dto.password);
    await this.users.update(user.id, {
      passwordHash,
      status: 'ACTIVE',
      inviteTokenHash: null,
      inviteExpiresAt: null,
    });
    // Activate the linked employee, if any. In a fuller design this is an
    // `EmployeeActivated` domain event handled by the Employees context.
    await this.prisma.employee.updateMany({
      where: { userId: user.id, status: 'INVITED' },
      data: { status: 'ACTIVE' },
    });
    const full = await this.users.findById(user.companyId, user.id);
    return this.issueTokenPair(full!);
  }

  async me(authUser: AuthUser): Promise<MeDto> {
    const employee = await this.prisma.employee.findFirst({
      where: { userId: authUser.userId, companyId: authUser.companyId },
      select: { id: true },
    });
    return {
      userId: authUser.userId,
      companyId: authUser.companyId,
      email: authUser.email,
      roles: authUser.roles,
      employeeId: employee?.id ?? null,
    };
  }

  /** Issues a fresh token pair for a known user (used after signup/auto-login). */
  async issueTokensForUserId(userId: string): Promise<TokenPair> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });
    return this.issueTokenPair(user);
  }

  /** Builds the JWT payload, issues + persists a rotated refresh token. */
  private async issueTokenPair(
    user: UserWithRoles | User,
    onRotate?: (newHash: string) => Promise<void>,
  ): Promise<TokenPair> {
    const roles = this.rolesOf(user);
    const accessToken = await this.tokens.signAccessToken({
      sub: user.id,
      companyId: user.companyId,
      email: user.email,
      roles,
    });
    const { token: refreshToken, expiresAt } = this.tokens.generateRefreshToken();
    const newHash = sha256(refreshToken);
    if (onRotate) {
      await onRotate(newHash);
    }
    await this.refreshTokens.store(user.id, newHash, expiresAt);
    return { accessToken, refreshToken, expiresIn: this.tokens.accessTtl };
  }

  private rolesOf(user: UserWithRoles | User): RoleName[] {
    if ('roles' in user && Array.isArray((user as UserWithRoles).roles)) {
      return (user as UserWithRoles).roles.map((r) => r.role.name);
    }
    return [];
  }
}
