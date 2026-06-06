import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NotificationProvider, ProviderResult } from './notification-provider.port';

/**
 * Development providers that "deliver" by logging. In production these are
 * replaced by real WhatsApp Business API / email (SES/Postmark) adapters behind
 * the same NotificationProvider port.
 */
@Injectable()
export class EmailLogProvider implements NotificationProvider {
  private readonly logger = new Logger('EmailProvider');

  async send(to: string, subject: string | null, body: string): Promise<ProviderResult> {
    this.logger.log(`EMAIL → ${to} | ${subject ?? '(no subject)'} | ${body}`);
    return { ok: true, providerMessageId: `email_${randomUUID()}` };
  }
}

@Injectable()
export class WhatsappLogProvider implements NotificationProvider {
  private readonly logger = new Logger('WhatsappProvider');

  async send(to: string, _subject: string | null, body: string): Promise<ProviderResult> {
    this.logger.log(`WHATSAPP → ${to} | ${body}`);
    return { ok: true, providerMessageId: `wa_${randomUUID()}` };
  }
}
