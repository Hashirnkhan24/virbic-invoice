import { prisma } from '../prisma';
import { getWhatsAppProvider } from './index';

export async function sendWhatsAppMessage({
  to,
  body,
  mediaUrl,
  mediaType,
  buttons,
  conversationId,
  userId
}: {
  to: string;
  body: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'document';
  buttons?: Array<{ id: string; title: string }>;
  conversationId?: string;
  userId?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    let providerConfig: any = undefined;

    if (userId) {
      const preferences = await prisma.userPreference.findUnique({
        where: { userId }
      });
      if (preferences && preferences.whatsAppEnabled) {
        providerConfig = {
          provider: preferences.whatsAppProvider,
          twilioAccountSid: preferences.twilioAccountSid || undefined,
          twilioAuthToken: preferences.twilioAuthToken || undefined,
          twilioWhatsAppNumber: preferences.twilioWhatsAppNumber || undefined,
          metaAccessToken: preferences.metaAccessToken || undefined,
          metaPhoneNumberId: preferences.metaPhoneNumberId || undefined
        };
      }
    }

    const provider = getWhatsAppProvider(providerConfig);
    let result: { messageId: string };

    if (mediaUrl && mediaType) {
      result = await provider.sendMedia(to, body, mediaUrl, mediaType);
    } else if (buttons && buttons.length > 0) {
      result = await provider.sendInteractive(to, body, buttons);
    } else {
      result = await provider.sendText(to, body);
    }

    // Log outbound message if conversationId exists
    if (conversationId) {
      await prisma.whatsAppMessage.create({
        data: {
          conversationId,
          direction: 'OUTBOUND',
          messageType: mediaType ? mediaType.toUpperCase() : buttons ? 'INTERACTIVE' : 'TEXT',
          content: body,
          mediaUrl,
          providerMessageId: result.messageId,
          deliveryStatus: 'SENT'
        }
      });
    }

    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.error('[WhatsApp] Outbound send failed:', error);
    return { success: false, error: error.message || 'Send failed' };
  }
}
