import { prisma } from '../../prisma';
import { createConfirmation } from '../confirmation';
import { ConversationContext, UserIntent } from '../intents';
import { formatCurrency, formatDate, getFinancialYear, formatInvoiceNumber } from '../../helpers';
import { determineTaxType, calculateLineItemTotal, calculateInvoiceTotals } from '../../tax-engine';
import { syncClientCounters } from '../../db/invoice-hooks';
import { logClientActivity } from '../../db/client-analytics';
import { generatePublicShareId } from '../../helpers';
import { sendInvoiceEmail } from '../../email-service';
import { sendWhatsAppMessage } from '../../whatsapp/outbound';
import { compileTemplate } from '../../whatsapp/template-compiler';

export async function handleUserIntent(
  intent: UserIntent,
  entities: Record<string, any>,
  context: ConversationContext
): Promise<{ response: string; actions: Array<() => Promise<any>> }> {
  switch (intent) {
    case UserIntent.CREATE_INVOICE:
      return handleCreateInvoice(entities, context);

    case UserIntent.QUERY_OUTSTANDING:
      return handleQueryOutstanding(context);

    case UserIntent.QUERY_REVENUE:
      return handleQueryRevenue(context);

    case UserIntent.SEND_REMINDER:
      return handleSendReminder(entities, context);

    case UserIntent.MARK_PAID:
      return handleMarkPaid(entities, context);

    case UserIntent.GENERAL_HELP:
      return { response: getHelpMessage(), actions: [] };

    default:
      return {
        response: 'Main thoda confused hoon. Aap niche diye gaye commands me se kuch pucch sakte hain:\n' + getHelpMessage(),
        actions: []
      };
  }
}

function getHelpMessage(): string {
  return `💡 *Virbic Bot Commands*
━━━━━━━━━━━━━━━━━━
• *Invoice Banao*: "create invoice for clientName amount 5000"
• *Outstanding Check Karo*: "what is my outstanding amount?" or "kis kis ka baki hai?"
• *Revenue Dekho*: "how much did I make this month?" or "is mahine ka revenue kitna hai?"
• *Reminder Bhejo*: "remind Elevate Tech to pay" or "Elevate Tech ko remind karo"
• *Mark Paid*: "mark invoice INV/2026-27/001 as paid" or "INV-001 pay ho gaya"`;
}

async function handleCreateInvoice(entities: any, context: ConversationContext) {
  const { clientName, amount, description, dueDate } = entities;

  if (!clientName) {
    return {
      response: 'Kis client ke liye invoice banana hai? Please client ka naam batayein. (e.g. "Create invoice for Elevate Tech")',
      actions: []
    };
  }

  if (amount === undefined || amount === null) {
    return {
      response: `Client "${clientName}" ke liye kitne amount ka invoice banana hai? Please amount batayein. (e.g. "5000 INR")`,
      actions: []
    };
  }

  // Find client
  const client = await prisma.client.findFirst({
    where: {
      userId: context.userId,
      name: { contains: clientName, mode: 'insensitive' },
      isDeleted: false
    }
  });

  if (!client) {
    const clients = await prisma.client.findMany({
      where: { userId: context.userId, isDeleted: false },
      take: 5,
      select: { name: true }
    });
    const clientList = clients.map(c => `• ${c.name}`).join('\n');
    return {
      response: `Client "${clientName}" nahi mila. Aapke clients list:\n${clientList || 'No clients found.'}\n\nKya aap sahi client name batayenge?`,
      actions: []
    };
  }

  const amountNum = parseFloat(amount);
  const gstAmount = amountNum * 0.18;
  const total = amountNum + gstAmount;

  const draft = {
    clientId: client.id,
    amount: amountNum,
    description: description || 'Professional Services',
    dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
  };

  // Create confirmation record
  await createConfirmation(context.sessionId, 'CREATE_INVOICE', draft);

  const response = `📄 *Invoice Draft*
━━━━━━━━━━━━━━━━━━
• *Client*: ${client.name}
• *Item*: ${draft.description}
• *Subtotal*: ₹${amountNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
• *GST (18%)*: ₹${gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
• *Total*: *₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}*
• *Due Date*: ${formatDate(draft.dueDate)}

Reply:
1️⃣ *YES* — Confirm & send invoice
2️⃣ *NO* — Cancel draft
3️⃣ *EDIT* — Modify details`;

  return { response, actions: [] };
}

async function handleQueryOutstanding(context: ConversationContext) {
  const invoices = await prisma.invoice.findMany({
    where: {
      userId: context.userId,
      status: { in: ['SENT', 'OVERDUE', 'PARTIAL'] }
    },
    include: { client: { select: { name: true } } }
  });

  if (invoices.length === 0) {
    return { response: '🎉 Badhiya! Aapka koi outstanding payment pending nahi hai.', actions: [] };
  }

  let totalOutstanding = 0;
  const list = invoices.map(inv => {
    const outstanding = Number(inv.grandTotal) - Number(inv.amountPaid);
    totalOutstanding += outstanding;
    return `• *${inv.invoiceNumber}* (${inv.client.name}): ₹${outstanding.toLocaleString('en-IN')}`;
  });

  const response = `📊 *Outstanding Summary*
━━━━━━━━━━━━━━━━━━
Total Outstanding: *₹${totalOutstanding.toLocaleString('en-IN')}*

Pending Invoices:
${list.join('\n')}`;

  return { response, actions: [] };
}

async function handleQueryRevenue(context: ConversationContext) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Sum grandTotal for invoices issued this month
  const invoices = await prisma.invoice.findMany({
    where: {
      userId: context.userId,
      issueDate: { gte: startOfMonth, lte: endOfMonth },
      status: { notIn: ['DRAFT', 'CANCELLED'] }
    },
    select: { grandTotal: true }
  });

  const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.grandTotal), 0);

  // Sum confirmed payments received this month
  const payments = await prisma.payment.findMany({
    where: {
      userId: context.userId,
      paidAt: { gte: startOfMonth, lte: endOfMonth },
      status: 'CONFIRMED'
    },
    select: { amount: true }
  });

  const totalCollected = payments.reduce((sum, pay) => sum + Number(pay.amount), 0);

  const response = `📈 *Revenue report (Is month)*
━━━━━━━━━━━━━━━━━━
• *Total Billed (Invoiced)*: ₹${totalBilled.toLocaleString('en-IN')}
• *Total Collected (Paid)*: ₹${totalCollected.toLocaleString('en-IN')}

Keep it up! 🚀`;

  return { response, actions: [] };
}

async function handleSendReminder(entities: any, context: ConversationContext) {
  const { clientName } = entities;

  if (!clientName) {
    return { response: 'Kise remind karna hai? Please client ka naam batayein. (e.g. "Remind Elevate Tech")', actions: [] };
  }

  const client = await prisma.client.findFirst({
    where: {
      userId: context.userId,
      name: { contains: clientName, mode: 'insensitive' },
      isDeleted: false
    }
  });

  if (!client) {
    return { response: `Client "${clientName}" nahi mila. Please client ka sahi name batayein.`, actions: [] };
  }

  const unpaidInvoices = await prisma.invoice.findMany({
    where: {
      clientId: client.id,
      status: { in: ['SENT', 'OVERDUE', 'PARTIAL'] }
    }
  });

  if (unpaidInvoices.length === 0) {
    return { response: `Client "${client.name}" ke pass koi pending or overdue invoices nahi hain!`, actions: [] };
  }

  const invoice = unpaidInvoices[0]; // remind the oldest or latest one
  const amountDue = Number(invoice.grandTotal) - Number(invoice.amountPaid);

  // Auto dispatch directly via WhatsApp API trigger to minimize friction
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://virbic.com';
  const paymentLink = `${appUrl}/i/${invoice.publicShareId}`;

  // Call sendWhatsAppMessage directly in background action
  const action = async () => {
    // Find or create conversation
    let conversation = await prisma.whatsAppConversation.findFirst({
      where: {
        userId: context.userId,
        clientId: client.id
      }
    });

    if (!conversation) {
      conversation = await prisma.whatsAppConversation.create({
        data: {
          userId: context.userId!,
          clientId: client.id,
          clientPhone: client.phone || '',
          status: 'ACTIVE',
          optInStatus: 'CONFIRMED'
        }
      });
    }

    const messageText = `Hi ${client.name}! 👋\n\nFriendly reminder: Pending payment for Invoice *${invoice.invoiceNumber}* (outstanding *₹${amountDue.toFixed(2)}*) is due.\n\nLink to pay and upload proof: ${paymentLink}\n\nThank you!`;

    if (client.phone) {
      await sendWhatsAppMessage({
        to: client.phone,
        body: messageText,
        conversationId: conversation.id,
        userId: context.userId
      });

      // Log reminder
      await prisma.reminderLog.create({
        data: {
          invoiceId: invoice.id,
          userId: context.userId!,
          clientId: client.id,
          stage: invoice.reminderCount + 1,
          channel: 'whatsapp',
          content: messageText,
          triggeredBy: 'manual'
        }
      });

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          reminderCount: { increment: 1 },
          lastReminderAt: new Date(),
          status: 'OVERDUE'
        }
      });
    }
  };

  return {
    response: `✅ Reminder details scheduled for Client *${client.name}* (Invoice *${invoice.invoiceNumber}*, amount *₹${amountDue.toLocaleString('en-IN')}*). Sharing immediately.`,
    actions: [action]
  };
}

async function handleMarkPaid(entities: any, context: ConversationContext) {
  const { invoiceNumber } = entities;

  if (!invoiceNumber) {
    return { response: 'Konse invoice ko paid mark karna hai? Please Invoice number batayein. (e.g. "Mark INV/2026-27/001 as paid")', actions: [] };
  }

  const invoice = await prisma.invoice.findFirst({
    where: {
      userId: context.userId,
      invoiceNumber: { contains: invoiceNumber, mode: 'insensitive' }
    },
    include: { client: true }
  });

  if (!invoice) {
    return { response: `Invoice "${invoiceNumber}" nahi mila. Please invoice number sahi se batayein.`, actions: [] };
  }

  if (invoice.status === 'PAID') {
    return { response: `Invoice *${invoice.invoiceNumber}* already fully paid marked hai!`, actions: [] };
  }

  const draft = {
    invoiceId: invoice.id
  };

  await createConfirmation(context.sessionId, 'MARK_PAID', draft);

  const response = `💳 *Mark Paid Request*
━━━━━━━━━━━━━━━━━━
• *Invoice*: ${invoice.invoiceNumber}
• *Client*: ${invoice.client.name}
• *Amount*: ₹${Number(invoice.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}

Confirm payment of total amount?
1️⃣ *YES* — Confirm Payment
2️⃣ *NO* — Cancel`;

  return { response, actions: [] };
}

export async function executeUserAction(
  actionType: string,
  data: any,
  context: ConversationContext
): Promise<string> {
  if (actionType === 'CREATE_INVOICE') {
    const { clientId, amount, description, dueDate } = data;

    const business = await prisma.business.findFirst({
      where: { userId: context.userId, isDefault: true }
    }) || await prisma.business.findFirst({
      where: { userId: context.userId }
    });

    if (!business) {
      return '❌ No business profile found. Please create a business profile on the website first.';
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return '❌ Client not found.';
    }

    // Determine tax & totals
    const taxType = determineTaxType(business.state || '', client.billingState || business.state || '');
    const isInterState = taxType === 'inter';

    const lineItems = [{
      description,
      quantity: 1,
      rate: amount,
      discount: 0,
      discountType: 'PERCENTAGE' as const,
      gstRate: 18
    }];

    const serverTotals = calculateInvoiceTotals(lineItems, 0, 'PERCENTAGE', isInterState, 0);
    const itemCalc = calculateLineItemTotal(lineItems[0], isInterState);

    const prefix = business.invoicePrefix || 'INV';
    const number = business.invoiceNumber || 1;
    const fy = business.financialYear || getFinancialYear(new Date());
    const invoiceNumber = formatInvoiceNumber(prefix, number, fy);

    const publicShareId = generatePublicShareId();

    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          invoiceNumber,
          userId: context.userId!,
          businessId: business.id,
          clientId: client.id,
          template: 'modern',
          currency: 'INR',
          exchangeRate: 1,
          issueDate: new Date(),
          dueDate: new Date(dueDate),
          placeOfSupply: client.billingState || business.state || '',
          isInterState,
          reverseCharge: false,
          overallDiscount: 0,
          overallDiscountType: 'PERCENTAGE',
          cessRate: 0,
          subTotal: serverTotals.subTotal,
          discountTotal: serverTotals.discountTotal,
          taxableAmount: serverTotals.taxableAmount,
          cgstTotal: serverTotals.cgstTotal,
          sgstTotal: serverTotals.sgstTotal,
          igstTotal: serverTotals.igstTotal,
          cessTotal: serverTotals.cessTotal,
          roundOff: serverTotals.roundOff,
          grandTotal: serverTotals.grandTotal,
          notes: 'Thank you for your business!',
          terms: '1. Please pay within the due date.',
          status: 'SENT',
          publicShareId
        }
      });

      await tx.invoiceLineItem.create({
        data: {
          invoiceId: inv.id,
          description,
          quantity: 1,
          unit: 'PCS',
          rate: amount,
          discount: 0,
          discountType: 'PERCENTAGE',
          gstRate: 18,
          cgstAmount: itemCalc.cgstAmount,
          sgstAmount: itemCalc.sgstAmount,
          igstAmount: itemCalc.igstAmount,
          taxableValue: itemCalc.taxableValue,
          totalAmount: itemCalc.totalAmount
        }
      });

      await tx.business.update({
        where: { id: business.id },
        data: { invoiceNumber: { increment: 1 } }
      });

      return inv;
    });

    // Sync metrics & log activity
    try {
      await syncClientCounters(client.id, context.userId!);
      await logClientActivity({
        clientId: client.id,
        userId: context.userId!,
        action: 'INVOICE_CREATED',
        details: `Invoice ${invoice.invoiceNumber} created via WhatsApp Bot`,
        amount: Number(invoice.grandTotal)
      });
    } catch (err) {
      console.error('Error syncing client counters:', err);
    }

    // Auto-email client if email exists
    if (client.email) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://virbic.com';
        const shareLink = `${appUrl}/i/${invoice.publicShareId}`;
        const subject = `Invoice ${invoice.invoiceNumber} from ${business.name}`;
        const messageHtml = `Hello ${client.name},<br/><br/>Please find our invoice ${invoice.invoiceNumber} for ₹${Number(invoice.grandTotal).toLocaleString('en-IN')}.<br/><br/>View and pay here: <a href="${shareLink}">${shareLink}</a><br/><br/>Thank you!`;
        await sendInvoiceEmail(invoice.id, client.email, subject, messageHtml);
      } catch (emailErr) {
        console.error('Error auto-emailing client:', emailErr);
      }
    }

    // Auto-WhatsApp client if phone exists
    if (client.phone) {
      try {
        // Find or create client conversation
        let conversation = await prisma.whatsAppConversation.findFirst({
          where: {
            userId: context.userId!,
            clientId: client.id
          }
        });

        if (!conversation) {
          conversation = await prisma.whatsAppConversation.create({
            data: {
              userId: context.userId!,
              clientId: client.id,
              clientPhone: client.phone,
              status: 'ACTIVE',
              optInStatus: 'CONFIRMED'
            }
          });
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://virbic.com';
        const invoiceLink = `${appUrl}/i/${invoice.publicShareId}`;
        const waTemplate = await prisma.whatsAppTemplate.findUnique({
          where: { name: 'invoice_delivered' }
        });

        const formattedDate = new Date(invoice.dueDate).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });

        const compiled = compileTemplate(waTemplate?.content || `*Invoice from {{businessName}}*\n\nInvoice #: {{invoiceNumber}}\nAmount: *₹{{amount}}*\nDue: {{dueDate}}\n\nView & Pay: {{invoiceLink}}`, {
          businessName: business.name,
          invoiceNumber: invoice.invoiceNumber,
          amount: Number(invoice.grandTotal).toFixed(2),
          dueDate: formattedDate,
          invoiceLink
        });

        await sendWhatsAppMessage({
          to: client.phone,
          body: compiled,
          conversationId: conversation.id,
          userId: context.userId!
        });
      } catch (waErr) {
        console.error('Error auto-WhatsApping client:', waErr);
      }
    }

    return `✅ Invoice *${invoice.invoiceNumber}* successfully created, emailed, and shared with Client *${client.name}* on WhatsApp!`;
  }

  if (actionType === 'MARK_PAID') {
    const { invoiceId } = data;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: true }
    });

    if (!invoice) {
      return '❌ Invoice not found.';
    }

    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID',
        amountPaid: invoice.grandTotal,
        paidAt: new Date()
      }
    });

    // Record the payment
    await prisma.payment.create({
      data: {
        invoiceId: invoiceId,
        userId: context.userId!,
        amount: invoice.grandTotal,
        method: 'UPI',
        status: 'CONFIRMED',
        paidAt: new Date(),
        notes: 'Payment confirmed via WhatsApp Bot'
      }
    });

    try {
      await syncClientCounters(invoice.clientId, context.userId!);
      await logClientActivity({
        clientId: invoice.clientId,
        userId: context.userId!,
        action: 'PAYMENT_RECEIVED',
        details: `Payment recorded via WhatsApp Bot for Invoice ${invoice.invoiceNumber}`,
        amount: Number(invoice.grandTotal)
      });
    } catch (err) {
      console.error('Error syncing markers:', err);
    }

    // Auto-receipt to client on WhatsApp
    if (invoice.client.phone) {
      try {
        let conversation = await prisma.whatsAppConversation.findFirst({
          where: {
            userId: context.userId!,
            clientId: invoice.clientId
          }
        });

        const receiptLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://virbic.com'}/i/${invoice.publicShareId}`;
        const waTemplate = await prisma.whatsAppTemplate.findUnique({
          where: { name: 'payment_confirmed_receipt' }
        });

        const compiled = compileTemplate(waTemplate?.content || `*Payment Received! 🎉*\n\nInvoice: {{invoiceNumber}}\nAmount Paid: *₹{{amount}}*\nBalance: *₹0.00* (Fully Paid)\n\nThank you for your business!\n\nDownload receipt: {{receiptLink}}`, {
          invoiceNumber: invoice.invoiceNumber,
          amount: Number(invoice.grandTotal).toFixed(2),
          receiptLink
        });

        await sendWhatsAppMessage({
          to: invoice.client.phone,
          body: compiled,
          conversationId: conversation?.id,
          userId: context.userId!
        });
      } catch (waErr) {
        console.error('Error sharing receipt:', waErr);
      }
    }

    return `✅ Invoice *${invoice.invoiceNumber}* marked as paid. Payment recorded and receipt sent to client!`;
  }

  return '❌ Action not recognized.';
}
