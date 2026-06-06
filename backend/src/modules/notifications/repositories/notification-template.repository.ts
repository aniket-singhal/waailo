import { Injectable } from '@nestjs/common';
import { NotificationChannel, NotificationTemplate } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class NotificationTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves a template, preferring a company-specific override over the system
   * default (companyId = null).
   */
  async resolve(
    companyId: string,
    eventKey: string,
    channel: NotificationChannel,
    locale = 'en',
  ): Promise<NotificationTemplate | null> {
    const specific = await this.prisma.notificationTemplate.findFirst({
      where: { companyId, eventKey, channel, locale },
    });
    if (specific) return specific;
    return this.prisma.notificationTemplate.findFirst({
      where: { companyId: null, eventKey, channel, locale },
    });
  }

  list(companyId: string): Promise<NotificationTemplate[]> {
    return this.prisma.notificationTemplate.findMany({
      where: { OR: [{ companyId }, { companyId: null }] },
      orderBy: { eventKey: 'asc' },
    });
  }
}
