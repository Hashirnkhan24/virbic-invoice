import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { sendWhatsAppMessage } from '@/lib/whatsapp/outbound';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;

    const body = await request.json();
    const { to, body: msgBody, conversationId } = body;

    if (!to || !msgBody) {
      return NextResponse.json({ error: 'Recipient number and message body are required' }, { status: 400 });
    }

    // Verify conversation ownership if conversationId is provided
    if (conversationId) {
      const conversation = await prisma.whatsAppConversation.findFirst({
        where: { id: conversationId, userId: user.id }
      });
      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found or unauthorized' }, { status: 403 });
      }
    }

    const result = await sendWhatsAppMessage({
      to,
      body: msgBody,
      conversationId,
      userId: user.id
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: 'Message sent successfully!'
    });
  } catch (err: any) {
    console.error('[API_WHATSAPP_SEND_ERROR]', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
