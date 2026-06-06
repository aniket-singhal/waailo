import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationService } from './notification.service';
import { NotificationEventHandlers } from './notification.event-handlers';
import { NotificationRepository } from './repositories/notification.repository';
import { NotificationTemplateRepository } from './repositories/notification-template.repository';
import { EmailLogProvider, WhatsappLogProvider } from './providers/log-providers';
import { EMAIL_PROVIDER, WHATSAPP_PROVIDER } from './providers/notification-provider.port';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationService,
    NotificationEventHandlers,
    NotificationRepository,
    NotificationTemplateRepository,
    { provide: EMAIL_PROVIDER, useClass: EmailLogProvider },
    { provide: WHATSAPP_PROVIDER, useClass: WhatsappLogProvider },
  ],
  exports: [NotificationService],
})
export class NotificationsModule {}
