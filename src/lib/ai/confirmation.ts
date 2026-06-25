import { prisma } from '../prisma';

export async function createConfirmation(
  sessionId: string,
  actionType: string,
  draftData: any
) {
  // Upsert to handle multiple confirmations on the same session
  const confirmation = await prisma.pendingConfirmation.upsert({
    where: { sessionId },
    update: {
      actionType,
      draftData: draftData as any,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      confirmedAt: null,
      cancelledAt: null,
      createdAt: new Date()
    },
    create: {
      sessionId,
      actionType,
      draftData: draftData as any,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    }
  });

  return confirmation;
}

export async function handleConfirmationReply(
  sessionId: string,
  reply: string
): Promise<{ action: 'CONFIRM' | 'REJECT' | 'EDIT' | 'EXPIRED' | 'UNKNOWN'; data?: any; actionType?: string }> {
  const normalized = reply.toLowerCase().trim();

  const pending = await prisma.pendingConfirmation.findUnique({
    where: { sessionId }
  });

  if (!pending) {
    return { action: 'UNKNOWN' };
  }

  if (pending.confirmedAt || pending.cancelledAt) {
    return { action: 'UNKNOWN' };
  }

  if (pending.expiresAt < new Date()) {
    return { action: 'EXPIRED' };
  }

  const draftData = typeof pending.draftData === 'string'
    ? JSON.parse(pending.draftData)
    : pending.draftData;

  // Yes / Haan / Confirm patterns
  if (normalized.match(/^(yes|y|haan|ha|theek|theek hai|ok|okay|confirm|approve|approved|1|confirm karein|banao|send)$/)) {
    await prisma.pendingConfirmation.update({
      where: { id: pending.id },
      data: { confirmedAt: new Date() }
    });
    return { action: 'CONFIRM', data: draftData, actionType: pending.actionType };
  }

  // No / Cancel patterns
  if (normalized.match(/^(no|n|na|nahi|nah|cancel|reject|2|radd karein|cancel karein)$/)) {
    await prisma.pendingConfirmation.update({
      where: { id: pending.id },
      data: { cancelledAt: new Date() }
    });
    return { action: 'REJECT', actionType: pending.actionType };
  }

  // Edit / Modify patterns
  if (normalized.match(/^(edit|change|modify|badlo|3|sahi karein|change karein)$/)) {
    return { action: 'EDIT', data: draftData, actionType: pending.actionType };
  }

  return { action: 'UNKNOWN' };
}
