import React from 'react';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ConversationLogsClient from '@/components/whatsapp/ConversationLogsClient';

export const dynamic = 'force-dynamic';

export default async function WhatsAppLogsPage() {
  const { error, dbUser } = await getAuthUser();
  if (error || !dbUser) redirect('/sign-in');
  const user = dbUser;

  // Retrieve WhatsApp conversations for this user
  const conversations = await prisma.whatsAppConversation.findMany({
    where: { userId: user.id },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true
        }
      },
      messages: {
        orderBy: { createdAt: 'asc' }
      }
    },
    orderBy: { lastMessageAt: 'desc' }
  });

  const serializableConversations = conversations.map((conv) => ({
    id: conv.id,
    userId: conv.userId,
    clientId: conv.clientId,
    clientPhone: conv.clientPhone,
    status: conv.status,
    lastMessageAt: conv.lastMessageAt ? conv.lastMessageAt.toISOString() : null,
    messageCount: conv.messageCount,
    optInStatus: conv.optInStatus as 'PENDING' | 'CONFIRMED' | 'DECLINED',
    optInAt: conv.optInAt ? conv.optInAt.toISOString() : null,
    optInMethod: conv.optInMethod,
    client: conv.client,
    messages: conv.messages.map((msg) => ({
      id: msg.id,
      direction: msg.direction as 'INBOUND' | 'OUTBOUND',
      messageType: msg.messageType as any,
      content: msg.content,
      mediaUrl: msg.mediaUrl,
      deliveryStatus: msg.deliveryStatus,
      createdAt: msg.createdAt.toISOString()
    }))
  }));

  return (
    <div className="flex-1 h-[calc(100vh-4rem)] p-4 md:p-6 bg-slate-50 dark:bg-slate-950 flex flex-col">
      <ConversationLogsClient initialConversations={serializableConversations} />
    </div>
  );
}
