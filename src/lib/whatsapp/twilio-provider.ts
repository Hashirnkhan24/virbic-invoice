import twilio from 'twilio';
import { WhatsAppProvider, WhatsAppWebhookEvent } from './provider';

export class TwilioProvider implements WhatsAppProvider {
  private client: twilio.Twilio | null = null;
  private whatsappNumber: string;

  constructor(accountSid?: string, authToken?: string, whatsappNumber?: string) {
    const sid = accountSid || process.env.TWILIO_ACCOUNT_SID;
    const token = authToken || process.env.TWILIO_AUTH_TOKEN;
    this.whatsappNumber = whatsappNumber || process.env.TWILIO_WHATSAPP_NUMBER || '';

    if (sid && token) {
      this.client = twilio(sid, token);
    }
  }

  private ensureClient() {
    if (!this.client) {
      throw new Error('Twilio provider is not configured. Please check your credentials.');
    }
  }

  // Helper for exponential backoff retries
  private async retry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 1) throw error;
      console.warn(`[Twilio] Send failed, retrying in ${delay}ms... Error:`, error);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.retry(fn, retries - 1, delay * 2);
    }
  }

  private formatPhoneNumber(phone: string): string {
    // If it already has the 'whatsapp:' prefix, return as is
    if (phone.startsWith('whatsapp:')) {
      return phone;
    }
    // Clean and ensure it has '+' sign
    const cleanPhone = phone.startsWith('+') ? phone : `+${phone}`;
    return `whatsapp:${cleanPhone}`;
  }

  async sendText(to: string, body: string): Promise<{ messageId: string }> {
    this.ensureClient();
    const formattedTo = this.formatPhoneNumber(to);
    const formattedFrom = this.formatPhoneNumber(this.whatsappNumber);

    return this.retry(async () => {
      const message = await this.client!.messages.create({
        to: formattedTo,
        from: formattedFrom,
        body,
      });
      return { messageId: message.sid };
    });
  }

  async sendMedia(
    to: string,
    body: string,
    mediaUrl: string,
    mediaType: 'image' | 'document'
  ): Promise<{ messageId: string }> {
    this.ensureClient();
    const formattedTo = this.formatPhoneNumber(to);
    const formattedFrom = this.formatPhoneNumber(this.whatsappNumber);

    return this.retry(async () => {
      const message = await this.client!.messages.create({
        to: formattedTo,
        from: formattedFrom,
        body,
        mediaUrl: [mediaUrl],
      });
      return { messageId: message.sid };
    });
  }

  async sendInteractive(
    to: string,
    body: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<{ messageId: string }> {
    this.ensureClient();
    const formattedTo = this.formatPhoneNumber(to);
    const formattedFrom = this.formatPhoneNumber(this.whatsappNumber);

    // Sandbox fallback: Twilio Sandbox doesn't support raw interactive messages
    // without approved templates, so we format options into the body.
    let fullBody = body;
    if (buttons.length > 0) {
      fullBody += '\n\n' + buttons.map((btn) => `• Reply *"${btn.title}"*`).join('\n');
    }

    return this.retry(async () => {
      const message = await this.client!.messages.create({
        to: formattedTo,
        from: formattedFrom,
        body: fullBody,
      });
      return { messageId: message.sid };
    });
  }

  parseWebhook(payload: any): WhatsAppWebhookEvent {
    // Twilio sends MessageStatus for status callbacks
    const isStatusUpdate = !!(payload.MessageStatus || payload.SmsStatus) && 
                           (payload.MessageStatus !== 'received' && payload.SmsStatus !== 'received');

    const from = payload.From ? payload.From.replace('whatsapp:', '') : '';
    const to = payload.To ? payload.To.replace('whatsapp:', '') : '';

    let mediaType: string | undefined;
    if (payload.MediaContentType0) {
      if (payload.MediaContentType0.startsWith('image/')) {
        mediaType = 'IMAGE';
      } else {
        mediaType = 'DOCUMENT';
      }
    }

    return {
      type: isStatusUpdate ? 'status_update' : 'message',
      from: from.startsWith('+') ? from : `+${from}`,
      to: to.startsWith('+') ? to : `+${to}`,
      body: payload.Body || undefined,
      mediaUrl: payload.MediaUrl0 || undefined,
      mediaType,
      messageId: payload.MessageSid || '',
      timestamp: new Date(),
      rawPayload: payload,
    };
  }

  verifySignature(payload: string, signature: string, secret: string): boolean {
    // In local development we bypass verification
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }

    if (!signature || !secret) return false;

    try {
      // Basic validation wrapper
      // Twilio request validation requires absolute url + params + signature.
      // We can also return true if verification is configured to be skipped for tests.
      return twilio.validateRequest(
        secret,
        signature,
        process.env.WHATSAPP_WEBHOOK_URL || '',
        JSON.parse(payload)
      );
    } catch {
      return false;
    }
  }
}
