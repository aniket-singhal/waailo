import { Injectable } from '@nestjs/common';
import { AppConfigService } from 'src/common/config/app-config.service';
import { StoragePort } from './storage.port';

/**
 * Development storage adapter. Emulates presigned URLs against a local path.
 * Production uses an S3 adapter (not bundled in Phase 1) behind the same port.
 */
@Injectable()
export class LocalStorageAdapter implements StoragePort {
  constructor(private readonly config: AppConfigService) {}

  async presignPut(key: string, _mimeType: string): Promise<string> {
    return `${this.base()}/${key}?op=put`;
  }

  async presignGet(key: string): Promise<string> {
    return `${this.base()}/${key}?op=get`;
  }

  async exists(_key: string): Promise<boolean> {
    // In local dev we assume the client completed the (emulated) upload.
    return true;
  }

  private base(): string {
    return `local://${this.config.storage.localDir}`;
  }
}
