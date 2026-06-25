import { prisma } from '../../prisma';
import { ConversationContext, ClientIntent } from '../intents';

export async function handleClientIntent(
  intent: ClientIntent,
  entities: Record<string, any>,
  context: ConversationContext
): Promise<{ response: string; actions: Array<() => Promise<any>> }> {
  switch (intent) {
    case ClientIntent.REQUEST_PAYMENT_LINK:
      return handlePaymentLinkRequest(context);

    case ClientIntent.SUBMIT_UTR:
      return handleUTRSubmission(entities.utr, context);

    case ClientIntent.QUERY_INVOICES:
      return handleClientInvoiceQuery(context);

    case ClientIntent.GENERAL_HELP:
      return { response: getHelpMessage(), actions: [] };

    default:
      return {
        response: 'I can help you with:\n' + getHelpMessage(),
        actions: []
      };
  }
}

function getHelpMessage(): string {
  return `💡 *Client Helper Commands*
━━━━━━━━━━━━━━━━━━
• *Pay invoice*: reply "pay" or "payment link"
• *List invoices*: reply "invoices" or "my outstanding"
• *Submit UTR reference*: reply "UTR 1234567890" after bank transfer
• *Submit Screenshot*: send payment proof screenshot directly here`;
}

async function handlePaymentLinkRequest(context: ConversationContext) {
  const invoice = await prisma.invoice.findFirst({
    where: {
      clientId: context.clientId,
      status: { in: ['SENT', 'OVERDUE', 'PARTIAL'] }
    },
    orderBy: { dueDate: 'asc' }
  });

  if (!invoice) {
    return { response: '🎉 You have no outstanding invoices. Thank you!', actions: [] };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://virbic.com';
  const payUrl = `${appUrl}/i/${invoice.publicShareId}`;
  const amountDue = Number(invoice.grandTotal) - Number(invoice.amountPaid);

  return {
    response: `🔗 *Invoice Payment Link*
━━━━━━━━━━━━━━━━━━
• *Invoice*: ${invoice.invoiceNumber}
• *Pending Amount*: *₹${amountDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}*
• *Due Date*: ${invoice.dueDate.toLocaleDateString('en-IN')}

Scan UPI QR or click to pay: ${payUrl}

After making the transfer, please reply with the UTR transaction number or send a screenshot of the transaction proof here.`,
    actions: []
  };
}

async function handleUTRSubmission(utr: string, context: ConversationContext) {
  if (!utr) {
    return { response: 'Please provide a valid UTR transaction reference number. (e.g. "UTR 1234567890")', actions: [] };
  }

  // Find latest unpaid invoice
  const invoice = await prisma.invoice.findFirst({
    where: {
      clientId: context.clientId,
      status: { in: ['SENT', 'OVERDUE', 'PARTIAL'] }
    },
    orderBy: { dueDate: 'asc' }
  });

  if (!invoice) {
    return { response: 'I could not find any active outstanding invoice to link this UTR reference to. Please contact the business owner.', actions: [] };
  }

  const amountDue = Number(invoice.grandTotal) - Number(invoice.amountPaid);

  // Call database create for payment proof in action callback
  const action = async () => {
    // Create payment proof
    await prisma.paymentProof.create({
      data: {
        invoiceId: invoice.id,
        userId: invoice.userId,
        utr: utr,
        status: 'PENDING', // Pending verification by business owner
        amountPaid: amountDue
      }
    });

    // Notify business owner (simulated log / audit)
    console.log(`[UTR SUBMITTED] Proof created for Invoice ${invoice.invoiceNumber}, UTR: ${utr}`);
  };

  return {
    response: `✅ Thank you! UTR reference *${utr}* has been submitted for verification against Invoice *${invoice.invoiceNumber}*. The business owner will verify and confirm shortly.`,
    actions: [action]
  };
}

async function handleClientInvoiceQuery(context: ConversationContext) {
  const invoices = await prisma.invoice.findMany({
    where: {
      clientId: context.clientId,
      status: { in: ['SENT', 'OVERDUE', 'PARTIAL'] }
    },
    orderBy: { dueDate: 'asc' }
  });

  if (invoices.length === 0) {
    return { response: '🎉 You have no outstanding payments. Thank you!', actions: [] };
  }

  const list = invoices.map(inv => {
    const outstanding = Number(inv.grandTotal) - Number(inv.amountPaid);
    return `• *${inv.invoiceNumber}*: ₹${outstanding.toLocaleString('en-IN')} (Due: ${inv.dueDate.toLocaleDateString('en-IN')})`;
  });

  const response = `📄 *Your Outstanding Invoices*
━━━━━━━━━━━━━━━━━━
${list.join('\n')}`;

  return { response, actions: [] };
}
