import { WhatsAppProvider, WhatsAppWebhookEvent } from './provider';
import crypto from 'crypto';

export class MetaProvider implements WhatsAppProvider {
  private accessToken: string;
  private phoneNumberId: string;

  constructor(accessToken?: string, phoneNumberId?: string) {
    this.accessToken = accessToken || process.env.META_ACCESS_TOKEN || process.env.META_CLOUD_API_ACCESS_TOKEN || '';
    this.phoneNumberId = phoneNumberId || process.env.META_PHONE_NUMBER_ID || process.env.META_CLOUD_API_PHONE_NUMBER_ID || '';
  }


  private ensureConfig() {
    if (!this.accessToken || !this.phoneNumberId) {
      throw new Error('Meta WhatsApp configuration is missing. Please set META_ACCESS_TOKEN and META_PHONE_NUMBER_ID in environment variables.');
    }
  }

  async sendText(to: string, body: string): Promise<{ messageId: string }> {
    this.ensureConfig();
    const cleanTo = to.replace(/\D/g, ''); // Meta API expects numbers only (without + or sandbox formatting)

    const url = `https://graph.facebook.com/v20.0/${this.phoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'text',
      text: {
        preview_url: false,
        body
      }
    };

    console.log(`[Meta WhatsApp] Outbound Request: POST ${url}`);
    console.log(`[Meta WhatsApp] Request Payload:`, JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json() as any;
    console.log(`[Meta WhatsApp] Response Status: ${response.status}`);
    console.log(`[Meta WhatsApp] Response Data:`, JSON.stringify(data, null, 2));

    if (!response.ok) {
      throw new Error(data.error?.message || `Meta API send text failed with status ${response.status}`);
    }

    const messageId = data.messages?.[0]?.id || '';
    return { messageId };
  }

  async sendMedia(
    to: string,
    body: string,
    mediaUrl: string,
    mediaType: 'image' | 'document'
  ): Promise<{ messageId: string }> {
    this.ensureConfig();
    const cleanTo = to.replace(/\D/g, '');

    const url = `https://graph.facebook.com/v20.0/${this.phoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: mediaType,
      [mediaType]: {
        link: mediaUrl,
        caption: body
      }
    };

    console.log(`[Meta WhatsApp] Outbound Media Request: POST ${url}`);
    console.log(`[Meta WhatsApp] Request Payload:`, JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json() as any;
    console.log(`[Meta WhatsApp] Response Status: ${response.status}`);
    console.log(`[Meta WhatsApp] Response Data:`, JSON.stringify(data, null, 2));

    if (!response.ok) {
      throw new Error(data.error?.message || `Meta API send media failed with status ${response.status}`);
    }

    const messageId = data.messages?.[0]?.id || '';
    return { messageId };
  }

  async sendInteractive(
    to: string,
    body: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<{ messageId: string }> {
    this.ensureConfig();
    
    // Meta interactive buttons are limited to maximum 3. 
    // If more than 3, fall back to sending a text message with options listed.
    if (buttons.length > 3) {
      let fullBody = body;
      fullBody += '\n\n' + buttons.map((btn) => `• Reply *"${btn.title}"*`).join('\n');
      return this.sendText(to, fullBody);
    }

    const cleanTo = to.replace(/\D/g, '');
    const url = `https://graph.facebook.com/v20.0/${this.phoneNumberId}/messages`;

    const formattedButtons = buttons.map(btn => ({
      type: 'reply',
      reply: {
        id: btn.id,
        title: btn.title.slice(0, 20) // Meta button titles are limited to 20 chars
      }
    }));

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: body
        },
        action: {
          buttons: formattedButtons
        }
      }
    };

    console.log(`[Meta WhatsApp] Outbound Interactive Request: POST ${url}`);
    console.log(`[Meta WhatsApp] Request Payload:`, JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json() as any;
    console.log(`[Meta WhatsApp] Response Status: ${response.status}`);
    console.log(`[Meta WhatsApp] Response Data:`, JSON.stringify(data, null, 2));

    if (!response.ok) {
      throw new Error(data.error?.message || `Meta API send interactive failed with status ${response.status}`);
    }

    const messageId = data.messages?.[0]?.id || '';
    return { messageId };
  }

  async sendTemplate(
    to: string,
    templateName: string,
    languageCode: string = 'en',
    variables: string[],
    buttonVariables?: string[]
  ): Promise<{ messageId: string }> {
    this.ensureConfig();
    const cleanTo = to.replace(/\D/g, '');

    const url = `https://graph.facebook.com/v20.0/${this.phoneNumberId}/messages`;
    const parameters = variables.map(v => ({
      type: 'text',
      text: v
    }));

    const components: any[] = [
      {
        type: 'body',
        parameters: parameters
      }
    ];

    if (buttonVariables && buttonVariables.length > 0) {
      components.push({
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: buttonVariables.map(bv => ({
          type: 'text',
          text: bv
        }))
      });
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode
        },
        components: components
      }
    };

    console.log(`[Meta WhatsApp] Outbound Template Request: POST ${url}`);
    console.log(`[Meta WhatsApp] Request Payload:`, JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json() as any;
    console.log(`[Meta WhatsApp] Response Status: ${response.status}`);
    console.log(`[Meta WhatsApp] Response Data:`, JSON.stringify(data, null, 2));

    if (!response.ok) {
      throw new Error(data.error?.message || `Meta API send template failed with status ${response.status}`);
    }

    const messageId = data.messages?.[0]?.id || '';
    return { messageId };
  }

  parseWebhook(payload: any): WhatsAppWebhookEvent {
    const entry = payload.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (!value) {
      return {
        type: 'unknown',
        from: '',
        to: '',
        messageId: '',
        timestamp: new Date(),
        rawPayload: payload
      };
    }

    // Check if status update (sent, delivered, read, failed, etc)
    if (value.statuses && value.statuses.length > 0) {
      const statusObj = value.statuses[0];
      return {
        type: 'status_update',
        from: statusObj.recipient_id ? `+${statusObj.recipient_id}` : '',
        to: '',
        messageId: statusObj.id,
        timestamp: new Date(parseInt(statusObj.timestamp) * 1000),
        rawPayload: payload
      };
    }

    // Check if incoming message
    if (value.messages && value.messages.length > 0) {
      const msgObj = value.messages[0];
      const from = msgObj.from ? `+${msgObj.from}` : '';
      const to = value.metadata?.display_phone_number ? `+${value.metadata.display_phone_number}` : '';

      let body = '';
      let mediaUrl: string | undefined;
      let mediaType: string | undefined;

      if (msgObj.type === 'text') {
        body = msgObj.text?.body || '';
      } else if (msgObj.type === 'button') {
        body = msgObj.button?.text || '';
      } else if (msgObj.type === 'interactive') {
        if (msgObj.interactive?.type === 'button_reply') {
          body = msgObj.interactive.button_reply?.title || '';
        } else if (msgObj.interactive?.type === 'list_reply') {
          body = msgObj.interactive.list_reply?.title || '';
        }
      } else if (msgObj.type === 'image') {
        mediaType = 'IMAGE';
        mediaUrl = msgObj.image?.id;
        body = msgObj.image?.caption || '';
      } else if (msgObj.type === 'document') {
        mediaType = 'DOCUMENT';
        mediaUrl = msgObj.document?.id;
        body = msgObj.document?.caption || '';
      } else if (msgObj.type === 'audio' || msgObj.type === 'voice') {
        mediaType = 'VOICE';
        mediaUrl = msgObj.audio?.id || msgObj.voice?.id;
      }

      return {
        type: 'message',
        from,
        to,
        body: body || undefined,
        mediaUrl,
        mediaType,
        messageId: msgObj.id,
        timestamp: new Date(parseInt(msgObj.timestamp) * 1000),
        rawPayload: payload
      };
    }

    return {
      type: 'unknown',
      from: '',
      to: '',
      messageId: '',
      timestamp: new Date(),
      rawPayload: payload
    };
  }

  verifySignature(payload: string, signature: string, secret: string): boolean {
    if (process.env.NODE_ENV !== 'production') {
      return true; // Bypass signature checks in local development
    }

    if (!signature || !secret) return false;

    try {
      const hash = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      const expected = `sha256=${hash}`;
      return expected === signature;
    } catch {
      return false;
    }
  }
}
