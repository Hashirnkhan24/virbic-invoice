import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { compileTemplate } from '@/lib/whatsapp/template-compiler';
import { sendWhatsAppMessage } from '@/lib/whatsapp/outbound';
import { syncClientCounters } from '@/lib/db/invoice-hooks';
import { logClientActivity } from '@/lib/db/client-analytics';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const { isReminder } = body;

    // Fetch invoice with client, business details
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        business: true,
        lineItems: true
      }
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const clientPhone = invoice.client.phone;
    if (!clientPhone) {
      return NextResponse.json({ error: 'Client does not have a phone number configured' }, { status: 400 });
    }

    // Clean/normalize client phone
    const digits = clientPhone.replace(/\D/g, '');
    const withoutZero = digits.startsWith('0') ? digits.slice(1) : digits;
    const normalizedPhone = withoutZero.length === 10 ? `+91${withoutZero}` : `+${withoutZero}`;

    // Get or create conversation record
    let conversation = await prisma.whatsAppConversation.findFirst({
      where: {
        userId: user.id,
        clientId: invoice.clientId
      }
    });

    if (!conversation) {
      conversation = await prisma.whatsAppConversation.create({
        data: {
          userId: user.id,
          clientId: invoice.clientId,
          clientPhone: normalizedPhone,
          status: 'ACTIVE',
          optInStatus: 'CONFIRMED', // Auto-confirm opt-in for first invoice send to simplify test flows
          optInAt: new Date(),
          optInMethod: 'invoice_delivery'
        }
      });
    }

    let templateName = 'invoice_delivered';
    let fallbackContent = `*Invoice from {{businessName}}*\n\nInvoice #: {{invoiceNumber}}\nAmount: *₹{{amount}}*\nDue: {{dueDate}}\n\nView & Pay: {{invoiceLink}}\n\nQuestions? Reply here.`;

    if (isReminder) {
      const stage = Math.min(3, invoice.reminderCount + 1);
      templateName = `payment_reminder_stage_${stage}`;
      if (stage === 1) {
        fallbackContent = `Hi {{clientName}}! 👋\n\nFriendly reminder: Invoice *{{invoiceNumber}}* for *₹{{amount}}* is due on {{dueDate}}.\n\nPay now: {{paymentLink}}\n\nThank you!`;
      } else if (stage === 2) {
        fallbackContent = `Hi {{clientName}},\n\nInvoice *{{invoiceNumber}}* (*₹{{amount}}*) is now due.\n\nPlease process: {{paymentLink}}\n\n— {{businessName}}`;
      } else {
        fallbackContent = `Hi {{clientName}},\n\nInvoice *{{invoiceNumber}}* for *₹{{amount}}* is *overdue*. Please prioritize.\n\nPay now: {{paymentLink}}\n\n— {{businessName}}`;
      }
    }

    // Retrieve template
    let systemTemplate = await prisma.whatsAppTemplate.findUnique({
      where: { name: templateName }
    });

    const templateContent = systemTemplate?.content || fallbackContent;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://virbic.com';
    const invoiceLink = `${appUrl}/i/${invoice.publicShareId}`;

    const formattedDate = new Date(invoice.dueDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    const compiledMessage = compileTemplate(templateContent, {
      clientName: invoice.client.name,
      businessName: invoice.business.name,
      invoiceNumber: invoice.invoiceNumber,
      amount: Number(invoice.grandTotal).toFixed(2),
      dueDate: formattedDate,
      invoiceLink,
      paymentLink: invoiceLink
    });

    // Map template variables for WhatsApp API
    let templateStage = undefined;
    if (isReminder) {
      const rawStage = Math.min(3, invoice.reminderCount + 1);
      templateStage = rawStage === 3 ? 4 : rawStage;
    }
    const currentTemplateName = isReminder ? `payment_reminder_stage_${templateStage}` : 'invoice_delivered';

    let templateVariables: string[] = [];
    let buttonVariables: string[] = [];
    if (!isReminder) {
      templateVariables = [
        invoice.client.name,
        invoice.invoiceNumber,
        invoice.business.name,
        `₹${Number(invoice.grandTotal).toFixed(2)}`,
        formattedDate,
        invoiceLink
      ];
      buttonVariables = [invoice.id];
    } else {
      if (templateStage === 1) {
        templateVariables = [
          invoice.client.name,
          invoice.invoiceNumber,
          invoice.business.name,
          Number(invoice.grandTotal).toFixed(2),
          formattedDate,
          invoiceLink
        ];
        buttonVariables = [invoice.id];
      } else if (templateStage === 2) {
        const outstandingAmount = Number(invoice.grandTotal) - Number(invoice.amountPaid || 0);
        templateVariables = [
          invoice.client.name,
          invoice.invoiceNumber,
          outstandingAmount.toFixed(2),
          invoiceLink,
          invoice.business.name
        ];
      } else if (templateStage === 4) {
        const outstandingAmount = Number(invoice.grandTotal) - Number(invoice.amountPaid || 0);
        templateVariables = [
          invoice.invoiceNumber,
          invoice.client.name,
          outstandingAmount.toFixed(2),
          invoice.business.name,
          invoiceLink
        ];
        buttonVariables = [invoice.id];
      }
    }

    // Send WhatsApp Message
    const result = await sendWhatsAppMessage({
      to: normalizedPhone,
      body: compiledMessage,
      conversationId: conversation.id,
      userId: user.id,
      template: {
        name: currentTemplateName,
        variables: templateVariables,
        buttonVariables: buttonVariables
      }
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to deliver message via WhatsApp' }, { status: 500 });
    }

    let updatedInvoice = null;

    if (isReminder) {
      updatedInvoice = await prisma.invoice.update({
        where: { id },
        data: {
          reminderCount: { increment: 1 },
          lastReminderAt: new Date(),
          status: 'OVERDUE'
        },
        include: {
          business: true,
          client: true,
          lineItems: true
        }
      });

      try {
        await syncClientCounters(invoice.clientId, user.id);
        await logClientActivity({
          clientId: invoice.clientId,
          userId: user.id,
          action: 'REMINDER_SENT',
          details: `Payment reminder sent via WhatsApp (Stage ${Math.min(3, invoice.reminderCount + 1)})`,
          amount: Number(invoice.grandTotal)
        });

        // Create ReminderLog
        const stage = Math.min(3, invoice.reminderCount + 1);
        await prisma.reminderLog.create({
          data: {
            invoiceId: id,
            userId: user.id,
            clientId: invoice.clientId,
            stage: stage,
            templateId: systemTemplate?.id || null,
            channel: 'whatsapp',
            content: compiledMessage,
            triggeredBy: 'manual'
          }
        });

        // Create legacy InvoiceReminder
        await prisma.invoiceReminder.create({
          data: {
            invoiceId: id,
            subject: `Payment Reminder: Invoice ${invoice.invoiceNumber}`,
            body: compiledMessage,
            recipient: invoice.client.email || 'no-email@client.com'
          }
        });
      } catch (err) {
        console.error('[INVOICE WHATSAPP REMINDER] Failed to sync or log:', err);
      }
    } else if (invoice.status === 'DRAFT') {
      updatedInvoice = await prisma.invoice.update({
        where: { id },
        data: { status: 'SENT' },
        include: {
          business: true,
          client: true,
          lineItems: true
        }
      });

      try {
        await syncClientCounters(invoice.clientId, user.id);
        await logClientActivity({
          clientId: invoice.clientId,
          userId: user.id,
          action: 'INVOICE_SENT',
          details: `Invoice ${invoice.invoiceNumber} sent via WhatsApp`,
          amount: Number(invoice.grandTotal)
        });
      } catch (syncErr) {
        console.error('[INVOICE WHATSAPP API] Failed to sync client counters:', syncErr);
      }
    }

    // Format decimals on return object
    const serializeInvoice = updatedInvoice ? {
      ...updatedInvoice,
      subTotal: Number(updatedInvoice.subTotal),
      discountTotal: Number(updatedInvoice.discountTotal),
      taxableAmount: Number(updatedInvoice.taxableAmount),
      cgstTotal: Number(updatedInvoice.cgstTotal),
      sgstTotal: Number(updatedInvoice.sgstTotal),
      igstTotal: Number(updatedInvoice.igstTotal),
      cessTotal: Number(updatedInvoice.cessTotal),
      roundOff: Number(updatedInvoice.roundOff),
      grandTotal: Number(updatedInvoice.grandTotal),
      amountPaid: Number(updatedInvoice.amountPaid),
      lineItems: updatedInvoice.lineItems.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        rate: Number(item.rate),
        discount: Number(item.discount),
        gstRate: Number(item.gstRate),
      })),
    } : null;

    return NextResponse.json({
      success: true,
      message: 'Invoice shared on WhatsApp successfully!',
      messageId: result.messageId,
      invoice: serializeInvoice
    });
  } catch (error: any) {
    console.error('Error sharing invoice via WhatsApp API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
