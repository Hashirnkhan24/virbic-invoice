import { prisma } from '../prisma';
import { ConversationContext } from './intents';

export async function getContext(sessionId: string): Promise<ConversationContext> {
  const conv = await prisma.whatsAppConversation.findUnique({
    where: { id: sessionId },
    select: { conversationContext: true, userId: true, clientId: true }
  });

  if (conv) {
    let parsedContext: any = {};
    if (conv.conversationContext) {
      try {
        parsedContext = typeof conv.conversationContext === 'string' 
          ? JSON.parse(conv.conversationContext) 
          : conv.conversationContext;
      } catch {
        parsedContext = {};
      }
    }

    // Check context expiry (30 minutes)
    const lastActive = parsedContext.lastActiveAt ? new Date(parsedContext.lastActiveAt) : new Date(0);
    const hasExpired = Date.now() - lastActive.getTime() > 30 * 60 * 1000;

    if (hasExpired) {
      return {
        sessionId,
        actor: conv.clientId ? 'CLIENT' : 'USER',
        userId: conv.userId,
        clientId: conv.clientId,
        turnCount: 0,
        lastActiveAt: new Date()
      };
    }

    return {
      sessionId,
      actor: parsedContext.actor || (conv.clientId ? 'CLIENT' : 'USER'),
      userId: conv.userId,
      clientId: conv.clientId,
      lastIntent: parsedContext.lastIntent,
      lastEntities: parsedContext.lastEntities,
      draftInvoice: parsedContext.draftInvoice,
      pendingConfirmationId: parsedContext.pendingConfirmationId,
      turnCount: parsedContext.turnCount || 0,
      lastActiveAt: parsedContext.lastActiveAt || new Date()
    };
  }

  return {
    sessionId,
    actor: 'USER',
    turnCount: 0,
    lastActiveAt: new Date()
  };
}

export async function updateContext(sessionId: string, context: ConversationContext) {
  try {
    await prisma.whatsAppConversation.update({
      where: { id: sessionId },
      data: {
        conversationContext: context as any,
        lastMessageAt: new Date()
      }
    });
  } catch (err) {
    console.error(`[AI Context] Failed to update context for session ${sessionId}:`, err);
  }
}
