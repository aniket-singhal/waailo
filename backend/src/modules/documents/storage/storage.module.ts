import { Module } from '@nestjs/common';
import { AppConfigService } from 'src/common/config/app-config.service';
import { STORAGE_PORT } from './storage.port';
import { LocalStorageAdapter } from './local-storage.adapter';

/**
 * Binds STORAGE_PORT to the configured driver. Only the local adapter ships in
 * Phase 1; an S3 adapter can be added and selected via STORAGE_DRIVER=s3.
 */
@Module({
  providers: [
    LocalStorageAdapter,
    {
      provide: STORAGE_PORT,
      useFactory: (config: AppConfigService, local: LocalStorageAdapter) => {
        switch (config.storage.driver) {
          case 'local':
          default:
            return local;
        }
      },
      inject: [AppConfigService, LocalStorageAdapter],
    },
  ],
  exports: [STORAGE_PORT],
})
export class StorageModule {}
