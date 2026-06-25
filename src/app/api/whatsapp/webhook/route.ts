import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWhatsAppProvider } from '@/lib/whatsapp';
import { compileTemplate } from '@/lib/whatsapp/template-compiler';
import { sendWhatsAppMessage } from '@/lib/whatsapp/outbound';
import { processMessage } from '@/lib/ai/processor';

// GET - Webhook verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Verify token matching Meta verification pattern
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'virbic-webhook-verify-123';

  if (mode === 'subscribe' && token === verifyToken) {
    return new Response(challenge, { status: 200 });
  }

  // Twilio also supports simple ping verification or standard signature check on POST
  return new Response('Verification mismatch', { status: 403 });
}

// POST - Incoming Webhook handler
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let payload: any = {};

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        payload[key] = value;
      });
    } else {
      payload = await request.json();
    }

    const provider = getWhatsAppProvider();
    const event = provider.parseWebhook(payload);

    // Fire and forget: process webhook in the background without blocking the response
    processWebhookEvent(event).catch((err) => {
      console.error('[WhatsApp Webhook Error]', err);
    });

    // Always respond with 200 to prevent retries
    return new Response('OK', { status: 200 });
  } catch (err: any) {
    console.error('[WhatsApp Webhook Handler Error]', err);
    return new Response('Error parsing payload', { status: 400 });
  }
}

async function processWebhookEvent(event: any) {
  if (event.type === 'status_update') {
    // Update outbound message status
    const status = event.rawPayload.MessageStatus || event.rawPayload.SmsStatus;
    const statusMap: Record<string, string> = {
      'sent': 'SENT',
      'delivered': 'DELIVERED',
      'read': 'READ',
      'failed': 'FAILED',
      'undelivered': 'FAILED'
    };
    const deliveryStatus = statusMap[status?.toLowerCase()] || 'SENT';

    await prisma.whatsAppMessage.updateMany({
      where: { providerMessageId: event.messageId },
      data: { deliveryStatus }
    });
    
    console.log(`[WhatsApp Status] Message ${event.messageId} status updated to: ${deliveryStatus}`);
    return;
  }

  // Incoming Message routing
  const normalizedFrom = normalizePhone(event.from);

  // 1. Check if the sender is a User/Business Owner
  const user = await prisma.user.findFirst({
    where: {
      phone: {
        contains: normalizedFrom.replace('+', '')
      }
    }
  });

  if (user) {
    console.log(`[WhatsApp Bot] User command received from ${user.name} (${normalizedFrom}): ${event.body}`);
    
    // Resolve or create a "System Bot" client for this user
    let botClient = await prisma.client.findFirst({
      where: {
        userId: user.id,
        name: 'Virbic System Bot',
        isDeleted: false
      }
    });

    if (!botClient) {
      botClient = await prisma.client.create({
        data: {
          userId: user.id,
          name: 'Virbic System Bot',
          email: 'bot@virbic.com',
          phone: normalizedFrom
        }
      });
    }

    // Find or create conversation
    let conversation = await prisma.whatsAppConversation.findFirst({
      where: {
        userId: user.id,
        clientId: botClient.id
      }
    });

    if (!conversation) {
      conversation = await prisma.whatsAppConversation.create({
        data: {
          userId: user.id,
          clientId: botClient.id,
          clientPhone: normalizedFrom,
          status: 'ACTIVE',
          optInStatus: 'CONFIRMED'
        }
      });
    }

    // Save message to DB
    const cleanBody = event.body?.trim() || '';
    const message = await prisma.whatsAppMessage.create({
      data: {
        conversationId: conversation.id,
        direction: 'INBOUND',
        messageType: event.mediaType || 'TEXT',
        content: cleanBody,
        mediaUrl: event.mediaUrl,
        providerMessageId: event.messageId,
        rawPayload: JSON.stringify(event.rawPayload)
      }
    });

    await prisma.whatsAppConversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        messageCount: { increment: 1 }
      }
    });

    // Trigger AI processor immediately in the background
    processMessage(message.id, conversation.id).catch((err) => {
      console.error('[WhatsApp Webhook User Process Error]', err);
    });

    return;
  }

  // 2. Otherwise, treat as Client replying to user
  const client = await prisma.client.findFirst({
    where: {
      phone: {
        contains: normalizedFrom.replace('+', '')
      },
      isDeleted: false
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  if (!client) {
    console.warn(`[WhatsApp Webhook] Message received from unregistered number: ${normalizedFrom}. Body: ${event.body}`);
    return;
  }

  // Find or create conversation
  let conversation = await prisma.whatsAppConversation.findFirst({
    where: {
      userId: client.userId,
      clientId: client.id
    }
  });

  if (!conversation) {
    conversation = await prisma.whatsAppConversation.create({
      data: {
        userId: client.userId,
        clientId: client.id,
        clientPhone: normalizedFrom,
        status: 'ACTIVE',
        optInStatus: 'PENDING'
      }
    });
  }

  const cleanBody = event.body?.trim() || '';
  const upperBody = cleanBody.toUpperCase();

  // 3. Opt-in / Opt-out compliance
  if (upperBody === 'STOP') {
    await prisma.whatsAppConversation.update({
      where: { id: conversation.id },
      data: {
        optInStatus: 'DECLINED',
        status: 'OPTED_OUT'
      }
    });
    console.log(`[WhatsApp Compliance] Client ${client.name} opted out (STOP).`);
    return;
  }

  if (upperBody === 'YES') {
    await prisma.whatsAppConversation.update({
      where: { id: conversation.id },
      data: {
        optInStatus: 'CONFIRMED',
        optInAt: new Date(),
        optInMethod: 'invoice_delivery'
      }
    });

    // Send opt-in confirmation message
    const user = await prisma.user.findUnique({
      where: { id: conversation.userId }
    });
    const business = await prisma.business.findFirst({
      where: { userId: user?.id, isDefault: true }
    }) || await prisma.business.findFirst({
      where: { userId: user?.id }
    });
    const businessName = business?.name || user?.name || 'the business owner';
    const freelancerName = businessName;
    const optInConfirmedTemplate = await prisma.whatsAppTemplate.findFirst({
      where: { name: 'opt_in_confirmed' }
    });

    if (optInConfirmedTemplate) {
      const compiled = compileTemplate(optInConfirmedTemplate.content, { businessName, freelancerName });
      await sendWhatsAppMessage({
        to: normalizedFrom,
        body: compiled,
        conversationId: conversation.id,
        userId: user?.id
      });
    }

    console.log(`[WhatsApp Compliance] Client ${client.name} opted in (YES).`);
    return;
  }

  // 4. Client Help Command auto-responders
  if (upperBody === 'INVOICE' || upperBody === 'PAY') {
    // Find latest unpaid invoice
    const invoice = await prisma.invoice.findFirst({
      where: {
        clientId: client.id,
        status: { in: ['SENT', 'OVERDUE', 'PARTIAL'] }
      },
      orderBy: { dueDate: 'asc' }
    });

    if (invoice) {
      const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://virbic.com'}/i/${invoice.publicShareId}`;
      const amountDue = Number(invoice.grandTotal) - Number(invoice.amountPaid);
      const text = upperBody === 'PAY'
        ? `Invoice *${invoice.invoiceNumber}* (₹${amountDue.toFixed(2)} due). Scan UPI QR or click to pay and upload proof: ${shareUrl}`
        : `Your outstanding invoice is *${invoice.invoiceNumber}* for *₹${amountDue.toFixed(2)}*. View invoice details: ${shareUrl}`;

      await sendWhatsAppMessage({
        to: normalizedFrom,
        body: text,
        conversationId: conversation.id,
        userId: client.userId
      });
      return;
    } else {
      await sendWhatsAppMessage({
        to: normalizedFrom,
        body: `You don't have any outstanding invoices. Thank you!`,
        conversationId: conversation.id,
        userId: client.userId
      });
      return;
    }
  }

  // 5. Store message in DB
  const message = await prisma.whatsAppMessage.create({
    data: {
      conversationId: conversation.id,
      direction: 'INBOUND',
      messageType: event.mediaType || 'TEXT',
      content: cleanBody,
      mediaUrl: event.mediaUrl,
      providerMessageId: event.messageId,
      rawPayload: JSON.stringify(event.rawPayload)
    }
  });

  // 6. Update conversation timestamp
  await prisma.whatsAppConversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: new Date(),
      messageCount: { increment: 1 }
    }
  });

  console.log(`[WhatsApp Message] Client ${client.name} sent message: ${cleanBody}`);

  // Trigger AI processor immediately in the background
  processMessage(message.id, conversation.id).catch((err) => {
    console.error('[WhatsApp Webhook Client Process Error]', err);
  });
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const withoutZero = digits.startsWith('0') ? digits.slice(1) : digits;

  if (withoutZero.length === 10) {
    return `+91${withoutZero}`;
  }

  if (withoutZero.length >= 12) {
    return `+${withoutZero}`;
  }

  if (phone.startsWith('+')) {
    return phone;
  }

  throw new Error(`Invalid phone number: ${phone}`);
}
