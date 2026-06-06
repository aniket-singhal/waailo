import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from 'src/common/config/app-config.service';
import { AccessTokenPayload, AuthUser } from 'src/common/tenant/auth-user';

/**
 * Validates the access token and projects it into the request-scoped AuthUser.
 * passport-jwt already verifies signature + expiry before `validate` is called.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: AppConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwt.accessSecret,
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthUser> {
    return {
      userId: payload.sub,
      companyId: payload.companyId,
      email: payload.email,
      roles: payload.roles,
    };
  }
}
