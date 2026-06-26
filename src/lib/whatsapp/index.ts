import { TwilioProvider } from './twilio-provider';
import { MetaProvider } from './meta-provider';
import { WhatsAppProvider } from './provider';

export function getWhatsAppProvider(config?: {
  provider?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioWhatsAppNumber?: string;
  metaAccessToken?: string;
  metaPhoneNumberId?: string;
}): WhatsAppProvider {
  const providerType = config?.provider || process.env.WHATSAPP_PROVIDER || 'meta';

  switch (providerType) {
    case 'twilio':
      return new TwilioProvider(
        config?.twilioAccountSid,
        config?.twilioAuthToken,
        config?.twilioWhatsAppNumber
      );
    case 'meta':
      return new MetaProvider(
        config?.metaAccessToken,
        config?.metaPhoneNumberId
      );
    default:
      throw new Error(`Unknown WhatsApp provider: ${providerType}`);
  }
}

export * from './provider';
export * from './twilio-provider';
export * from './meta-provider';
