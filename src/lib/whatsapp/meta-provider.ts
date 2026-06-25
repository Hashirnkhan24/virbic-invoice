import { WhatsAppProvider, WhatsAppWebhookEvent } from './provider';

export class MetaProvider implements WhatsAppProvider {
  constructor(accessToken?: string, phoneNumberId?: string) {
    // Stub constructor
  }

  async sendText(to: string, body: string): Promise<{ messageId: string }> {
    throw new Error('Meta Cloud API not yet implemented. Use Twilio provider.');
  }

  async sendMedia(
    to: string,
    body: string,
    mediaUrl: string,
    mediaType: 'image' | 'document'
  ): Promise<{ messageId: string }> {
    throw new Error('Meta Cloud API not yet implemented. Use Twilio provider.');
  }

  async sendInteractive(
    to: string,
    body: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<{ messageId: string }> {
    throw new Error('Meta Cloud API not yet implemented. Use Twilio provider.');
  }

  parseWebhook(payload: unknown): WhatsAppWebhookEvent {
    throw new Error('Meta Cloud API not yet implemented. Use Twilio provider.');
  }

  verifySignature(payload: string, signature: string, secret: string): boolean {
    throw new Error('Meta Cloud API not yet implemented. Use Twilio provider.');
  }
}
