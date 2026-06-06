import { Inject, Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, Prisma } from '@prisma/client';
import { Paginated, paginate } from 'src/common/dto/pagination.dto';
import { NotificationTemplateRepository } from './repositories/notification-template.repository';
import { NotificationRepository } from './repositories/notification.repository';
import {
  EMAIL_PROVIDER,
  NotificationProvider,
  WHATSAPP_PROVIDER,
} from './providers/notification-provider.port';

export interface DispatchInput {
  companyId: string;
  eventKey: string;
  recipient: string;
  channel: NotificationChannel;
  data: Record<string, unknown>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly templates: NotificationTemplateRepository,
    private readonly notifications: NotificationRepository,
    @Inject(WHATSAPP_PROVIDER) private readonly whatsapp: NotificationProvider,
    @Inject(EMAIL_PROVIDER) private readonly email: NotificationProvider,
  ) {}

  /** Renders the template, persists the notification, and attempts delivery. */
  async dispatch(input: DispatchInput): Promise<void> {
    const template = await this.templates.resolve(input.companyId, input.eventKey, input.channel);
    const subject = template?.subject ? this.render(template.subject, input.data) : null;
    const body = template
      ? this.render(template.body, input.data)
      : `[${input.eventKey}] ${JSON.stringify(input.data)}`;

    const record = await this.notifications.create({
      companyId: input.companyId,
      templateId: template?.id ?? null,
      eventKey: input.eventKey,
      channel: input.channel,
      recipient: input.recipient,
      payload: { subject, body, data: input.data } as Prisma.InputJsonValue,
    });

    const provider =
      input.channel === NotificationChannel.WHATSAPP ? this.whatsapp : this.email;
    try {
      const result = await provider.send(input.recipient, subject, body);
      if (result.ok) {
        await this.notifications.markSent(record.id, result.providerMessageId);
      } else {
        await this.notifications.markFailed(record.id, result.error ?? 'unknown');
      }
    } catch (err) {
      await this.notifications.markFailed(record.id, String(err));
      this.logger.error(`Delivery failed for ${input.eventKey}: ${String(err)}`);
    }
  }

  list(companyId: string, page: number, pageSize: number): Promise<Paginated<unknown>> {
    return this.notifications
      .list(companyId, (page - 1) * pageSize, pageSize)
      .then(({ rows, total }) => paginate(rows, total, page, pageSize));
  }

  /** Replaces {{key}} placeholders with values from data. */
  private render(template: string, data: Record<string, unknown>): string {
    return template.replace(/{{\s*(\w+)\s*}}/g, (_m, key: string) =>
      data[key] !== undefined ? String(data[key]) : '',
    );
  }
}
