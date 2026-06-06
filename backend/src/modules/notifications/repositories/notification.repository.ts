import { Injectable } from '@nestjs/common';
import { Notification, NotificationChannel, NotificationStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    companyId: string;
    templateId?: string | null;
    eventKey: string;
    channel: NotificationChannel;
    recipient: string;
    payload: Prisma.InputJsonValue;
  }): Promise<Notification> {
    return this.prisma.notification.create({
      data: { ...data, status: NotificationStatus.QUEUED },
    });
  }

  markSent(id: string, providerMessageId?: string): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data: { status: NotificationStatus.SENT, providerMessageId, sentAt: new Date() },
    });
  }

  markFailed(id: string, error: string): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data: { status: NotificationStatus.FAILED, error, retryCount: { increment: 1 } },
    });
  }

  async list(
    companyId: string,
    skip: number,
    take: number,
  ): Promise<{ rows: Notification[]; total: number }> {
    const where = { companyId };
    const [rows, total] = await Promise.all([
      this.prisma.notification.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.notification.count({ where }),
    ]);
    return { rows, total };
  }
}
