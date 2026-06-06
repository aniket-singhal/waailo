import { Injectable } from '@nestjs/common';
import { RefreshToken } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  store(userId: string, hashedToken: string, expiresAt: Date): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({ data: { userId, hashedToken, expiresAt } });
  }

  findValid(hashedToken: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findFirst({
      where: { hashedToken, revokedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  findByHash(hashedToken: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({ where: { hashedToken } });
  }

  async revoke(id: string, replacedBy?: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date(), replacedBy: replacedBy ?? null },
    });
  }

  /** Revoke every active token for a user (e.g. on reuse detection or offboarding). */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
