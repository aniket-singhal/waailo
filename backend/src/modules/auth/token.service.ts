import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccessTokenPayload } from 'src/common/tenant/auth-user';
import { AppConfigService } from 'src/common/config/app-config.service';
import { generateOpaqueToken } from 'src/common/utils/crypto.util';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Issues and verifies JWT access tokens and opaque refresh tokens.
 * Refresh tokens are random opaque strings stored hashed (see RefreshTokenRepository).
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {}

  async signAccessToken(payload: AccessTokenPayload): Promise<string> {
    const { accessSecret, accessTtl } = this.config.jwt;
    return this.jwt.signAsync(payload, { secret: accessSecret, expiresIn: accessTtl });
  }

  generateRefreshToken(): { token: string; expiresAt: Date } {
    const token = generateOpaqueToken();
    const expiresAt = new Date(Date.now() + this.config.jwt.refreshTtl * 1000);
    return { token, expiresAt };
  }

  get accessTtl(): number {
    return this.config.jwt.accessTtl;
  }
}
