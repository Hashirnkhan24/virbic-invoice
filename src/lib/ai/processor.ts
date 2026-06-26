import { prisma } from '../prisma';
import { getContext, updateContext } from './context';
import { parseIntent } from './openai-parser';
import { handleConfirmationReply } from './confirmation';
import { handleUserIntent, executeUserAction } from './handlers/user';
import { handleClientIntent } from './handlers/client';
import { sendWhatsAppMessage } from '../whatsapp/outbound';
import { UserIntent, ClientIntent } from './intents';
import { processVoiceMessage } from './voice';
import { downloadWhatsAppMedia, parseReceiptVision } from './vision-parser';
import fs from 'fs';
import path from 'path';

export async function processMessage(
  messageId: string,
  conversationId: string
): Promise<void> {
  const startTime = Date.now();

  const message = await prisma.whatsAppMessage.findUnique({
    where: { id: messageId },
    include: { conversation: true }
  });

  if (!message || message.aiProcessed) return;

  const context = await getContext(conversationId);
  const actor = context.actor;

  let contentText = message.content || '';

  // If the message is a voice note, transcribe it first
  if (message.messageType === 'VOICE' && message.mediaUrl) {
    try {
      contentText = await processVoiceMessage(message.mediaUrl, conversationId);
      // Update message text content in DB
      await prisma.whatsAppMessage.update({
        where: { id: messageId },
        data: { content: contentText }
      });
    } catch (voiceErr: any) {
      console.error(`[AI Voice Process Error] Failed to transcribe:`, voiceErr.message);
    }
  }

  // Handle client screenshot upload via WhatsApp (AI Vision OCR)
  let visionExtractedData = null;
  if (message.messageType === 'IMAGE' && message.mediaUrl && actor === 'CLIENT') {
    try {
      const providerType = process.env.WHATSAPP_PROVIDER || 'twilio';
      const { buffer, extension } = await downloadWhatsAppMedia(message.mediaUrl, providerType);
      
      const proofId = 'proof_' + Math.random().toString(36).substring(2, 15);
      const filename = `${proofId}.${extension}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'proofs');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filepath = path.join(uploadDir, filename);
      fs.writeFileSync(filepath, buffer);
      
      const ocrResult = await parseReceiptVision(buffer, extension);
      if (ocrResult.utr || ocrResult.amount) {
        visionExtractedData = {
          ...ocrResult,
          screenshotUrl: `/uploads/proofs/${filename}`
        };
      }
    } catch (err: any) {
      console.error('[AI Vision OCR Process Error] Failed to process screenshot:', err.message || err);
    }
  }

  // Check for pending confirmation
  const pending = await prisma.pendingConfirmation.findUnique({
    where: { sessionId: conversationId }
  });

  let responseText = '';
  let actions: Array<() => Promise<any>> = [];
  let parsed = null;

  if (pending && !pending.confirmedAt && !pending.cancelledAt && pending.expiresAt > new Date()) {
    // Handle confirmation reply
    const result = await handleConfirmationReply(conversationId, contentText);
    
    switch (result.action) {
      case 'CONFIRM':
        if (actor === 'USER') {
          responseText = await executeUserAction(pending.actionType, result.data, context);
        } else {
          // Client confirms (if any, standard clients don't have confirmation loops yet)
          responseText = 'Action confirmed!';
        }
        // Delete pending confirmation record upon resolution
        await prisma.pendingConfirmation.delete({ where: { id: pending.id } }).catch(() => {});
        break;

      case 'REJECT':
        responseText = '❌ Draft cancel kar diya gaya hai. Kuch aur chahiye?';
        await prisma.pendingConfirmation.delete({ where: { id: pending.id } }).catch(() => {});
        break;

      case 'EDIT':
        responseText = 'Aap kya badalna chahte hain? Bataiye (e.g. "change amount to 4000" ya "change date to tomorrow").';
        // Keep the pending confirmation active so they can confirm after editing
        break;

      case 'EXPIRED':
        responseText = '⚠️ Session confirmation expire ho gaya hai. Please request again.';
        await prisma.pendingConfirmation.delete({ where: { id: pending.id } }).catch(() => {});
        break;

      default:
        responseText = `Main samajh nahi paya. Reply karein:
1️⃣ *YES* — Confirm
2️⃣ *NO* — Cancel
3️⃣ *EDIT* — Modify details`;
    }
  } else {
    // Clean up expired confirmations silently if any exist
    if (pending) {
      await prisma.pendingConfirmation.delete({ where: { id: pending.id } }).catch(() => {});
    }

    // Parse new intent
    if (visionExtractedData) {
      parsed = {
        intent: ClientIntent.SUBMIT_PAYMENT_PROOF,
        actor: 'CLIENT',
        entities: {
          utr: visionExtractedData.utr,
          amount: visionExtractedData.amount,
          screenshotUrl: visionExtractedData.screenshotUrl
        },
        confidence: 0.95,
        missingFields: [],
        requiresConfirmation: false,
        suggestedResponse: ''
      };
    } else {
      parsed = await parseIntent(contentText, context);
    }

    // Track processing metrics
    const duration = Date.now() - startTime;

    // Log AI action log
    await prisma.aIActionLog.create({
      data: {
        userId: context.userId,
        clientId: context.clientId,
        rawInput: contentText,
        inputType: message.messageType,
        parsedIntent: String(parsed.intent),
        parsedEntities: parsed.entities || {},
        confidence: parsed.confidence,
        missingFields: parsed.missingFields,
        actionTaken: parsed.requiresConfirmation ? 'AWAIT_CONFIRMATION' : 'DIRECT_EXECUTION',
        sessionId: conversationId,
        processingTimeMs: duration
      }
    });

    if (parsed.confidence < 0.5) {
      responseText = parsed.suggestedResponse || 'Main thoda confused hoon. Aap "help" likh ke valid command templates dekh sakte hain.';
    } else if (parsed.missingFields.length > 0) {
      responseText = `Aapki request me ye details missing hain: *${parsed.missingFields.join(', ')}*. Please check and correct.`;
    } else {
      // Route to handlers
      if (actor === 'USER') {
        const result = await handleUserIntent(parsed.intent as UserIntent, parsed.entities, context);
        responseText = result.response;
        actions = result.actions;
      } else {
        const result = await handleClientIntent(parsed.intent as ClientIntent, parsed.entities, context);
        responseText = result.response;
        actions = result.actions;
      }
    }
  }

  // Send reply back to the user
  if (responseText) {
    await sendWhatsAppMessage({
      to: message.conversation.clientPhone,
      body: responseText,
      conversationId
    });
  }

  // Execute background actions
  for (const action of actions) {
    await action().catch((err) => {
      console.error('[AI Action Execution Error]', err);
    });
  }

  // Mark message processed
  await prisma.whatsAppMessage.update({
    where: { id: messageId },
    data: {
      aiProcessed: true,
      aiIntent: parsed ? String(parsed.intent) : message.aiIntent,
      aiConfidence: parsed ? parsed.confidence : message.aiConfidence
    }
  });

  // Update conversation context
  await updateContext(conversationId, {
    ...context,
    lastIntent: parsed ? String(parsed.intent) : context.lastIntent,
    lastEntities: parsed ? parsed.entities : context.lastEntities,
    turnCount: context.turnCount + 1,
    lastActiveAt: new Date()
  });
}
