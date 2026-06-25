import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getWhatsAppProvider } from '@/lib/whatsapp';

export async function POST(request: NextRequest) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;

    const body = await request.json();
    const {
      phone,
      provider,
      twilioAccountSid,
      twilioAuthToken,
      twilioWhatsAppNumber,
      metaAccessToken,
      metaPhoneNumberId,
    } = body;

    if (!phone) {
      return NextResponse.json({ error: 'Test phone number is required' }, { status: 400 });
    }

    // Initialize provider with the draft credentials passed in the test body
    const testProvider = getWhatsAppProvider({
      provider,
      twilioAccountSid,
      twilioAuthToken,
      twilioWhatsAppNumber,
      metaAccessToken,
      metaPhoneNumberId,
    });

    const testMessage = `👋 Hello! This is a test message from BillCraft WhatsApp integration. If you receive this, your WhatsApp configuration is correct.`;

    const result = await testProvider.sendText(phone, testMessage);

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: 'Test message sent successfully!',
    });
  } catch (err: any) {
    console.error('[SETTINGS WHATSAPP TEST ERROR]', err);
    return NextResponse.json(
      { error: err.message || 'Failed to send test message. Check credentials.' },
      { status: 500 }
    );
  }
}
