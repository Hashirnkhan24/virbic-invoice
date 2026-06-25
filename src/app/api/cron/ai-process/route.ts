import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processMessage } from '@/lib/ai/processor';

// Runs every minute
export async function GET(request: NextRequest) {
  try {
    // 1. Verify cron authorization secret
    const authHeader = request.headers.get('Authorization');
    const secret = process.env.CRON_SECRET || 'virbic-cron-secret-123';

    if (!authHeader || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch all unprocessed inbound messages
    const messages = await prisma.whatsAppMessage.findMany({
      where: {
        aiProcessed: false,
        direction: 'INBOUND'
      },
      take: 20, // Batch limit per execution run to prevent timeouts
      orderBy: { createdAt: 'asc' }
    });

    const results = [];

    for (const message of messages) {
      try {
        await processMessage(message.id, message.conversationId);
        results.push({
          messageId: message.id,
          status: 'SUCCESS'
        });
      } catch (err: any) {
        console.error(`[AI CRON PROCESSOR] Failed to process message ${message.id}:`, err.message);
        results.push({
          messageId: message.id,
          status: 'ERROR',
          error: err.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: messages.length,
      details: results
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error running AI background processor:', error);
    return NextResponse.json({ error: error.message || 'Cron job failed' }, { status: 500 });
  }
}
