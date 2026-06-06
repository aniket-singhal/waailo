export interface ProviderResult {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
}

/** A delivery channel (WhatsApp, email). Adapters implement real sending. */
export interface NotificationProvider {
  send(to: string, subject: string | null, body: string): Promise<ProviderResult>;
}

export const WHATSAPP_PROVIDER = Symbol('WHATSAPP_PROVIDER');
export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');
