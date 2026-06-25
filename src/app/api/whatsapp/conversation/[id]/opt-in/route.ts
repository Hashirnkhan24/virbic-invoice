import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const { id } = await params;

    const body = await request.json();
    const { optInStatus } = body;

    if (!['PENDING', 'CONFIRMED', 'DECLINED'].includes(optInStatus)) {
      return NextResponse.json({ error: 'Invalid opt-in status value' }, { status: 400 });
    }

    // Verify conversation ownership
    const conversation = await prisma.whatsAppConversation.findFirst({
      where: { id, userId: user.id }
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found or unauthorized' }, { status: 404 });
    }

    const updated = await prisma.whatsAppConversation.update({
      where: { id },
      data: {
        optInStatus,
        status: optInStatus === 'DECLINED' ? 'OPTED_OUT' : 'ACTIVE',
        optInAt: optInStatus === 'CONFIRMED' ? new Date() : null,
        optInMethod: optInStatus === 'CONFIRMED' ? 'manual' : null
      }
    });

    return NextResponse.json({
      success: true,
      conversation: updated
    });
  } catch (err: any) {
    console.error('[API_CONVERSATION_OPTIN_PUT_ERROR]', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
