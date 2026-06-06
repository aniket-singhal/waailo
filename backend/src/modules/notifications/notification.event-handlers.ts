import { Injectable, OnModuleInit } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import { DomainEventBus } from 'src/common/events/event-bus';
import { DomainEvent } from 'src/common/events/domain-events';
import { NotificationService } from './notification.service';

/**
 * Subscribes the Notifications context to the domain event bus. Every published
 * event becomes a rendered, delivered notification (default channel: email).
 */
@Injectable()
export class NotificationEventHandlers implements OnModuleInit {
  constructor(
    private readonly bus: DomainEventBus,
    private readonly notifications: NotificationService,
  ) {}

  onModuleInit(): void {
    this.bus.subscribe((event) => this.handle(event));
  }

  private async handle(event: DomainEvent): Promise<void> {
    await this.notifications.dispatch({
      companyId: event.companyId,
      eventKey: event.key,
      recipient: event.recipient,
      channel: event.channel ?? NotificationChannel.EMAIL,
      data: event.data,
    });
  }
}
