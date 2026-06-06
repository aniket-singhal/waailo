import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from './env.validation';

/**
 * Typed accessor over validated env. Modules depend on this rather than
 * reading process.env directly.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  get<K extends keyof Env>(key: K): Env[K] {
    return this.config.get(key, { infer: true });
  }

  get isProduction(): boolean {
    return this.get('NODE_ENV') === 'production';
  }

  get jwt() {
    return {
      accessSecret: this.get('JWT_ACCESS_SECRET'),
      accessTtl: this.get('JWT_ACCESS_TTL'),
      refreshSecret: this.get('JWT_REFRESH_SECRET'),
      refreshTtl: this.get('JWT_REFRESH_TTL'),
      inviteTtl: this.get('INVITE_TOKEN_TTL'),
      resetTtl: this.get('RESET_TOKEN_TTL'),
    };
  }

  get storage() {
    return {
      driver: this.get('STORAGE_DRIVER'),
      localDir: this.get('STORAGE_LOCAL_DIR'),
      s3: {
        endpoint: this.get('S3_ENDPOINT'),
        region: this.get('S3_REGION'),
        bucket: this.get('S3_BUCKET'),
        accessKeyId: this.get('S3_ACCESS_KEY_ID'),
        secretAccessKey: this.get('S3_SECRET_ACCESS_KEY'),
      },
    };
  }
}
