import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendInvoiceEmail } from '@/lib/email-service';
import { getAuthUser } from '@/lib/auth';
import { generateWhatsAppReminder } from '@/lib/reminder-engine';
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
    
    const body = await request.json();
    const { subject, body: messageText, sendEmail, sendWhatsapp, stage } = body;

    if (!subject || !messageText) {
      return NextResponse.json(
        { error: 'Fields "subject" and "body" are required.' },
        { status: 400 }
      );
    }

    // Fetch invoice to verify ownership
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const recipient = invoice.client.email || 'no-email@client.com';
    let emailSent = false;
    let whatsappUrl = "";

    // 1. Send Email reminder if requested
    if (sendEmail && invoice.client.email) {
      try {
        const htmlMessage = messageText.replace(/\n/g, '<br />');
        await sendInvoiceEmail(id, recipient, subject, htmlMessage);
        emailSent = true;
      } catch (emailErr: any) {
        console.error(`[MANUAL REMIND] Failed to send email for invoice ${id} to ${recipient}:`, emailErr.message);
        return NextResponse.json(
          { error: `Failed to send email: ${emailErr.message}` },
          { status: 500 }
        );
      }
    }

    // 2. Generate WhatsApp reminder link if requested
    if (sendWhatsapp) {
      whatsappUrl = generateWhatsAppReminder(invoice.client.phone, messageText);
    }

    // Determine channel string
    let channel = 'none';
    if (sendEmail && sendWhatsapp) channel = 'both';
    else if (sendEmail) channel = 'email';
    else if (sendWhatsapp) channel = 'whatsapp';

    // 3. Create ReminderLog entry
    await prisma.reminderLog.create({
      data: {
        invoiceId: id,
        userId: user.id,
        clientId: invoice.clientId,
        stage: stage || 1,
        channel: channel,
        content: messageText,
        triggeredBy: 'manual',
      },
    });

    // 4. Create InvoiceReminder (legacy fallback)
    await prisma.invoiceReminder.create({
      data: {
        invoiceId: id,
        subject,
        body: messageText,
        recipient,
      },
    });

    // 5. Update Invoice reminder stats and change status to OVERDUE if applicable
    const isUnpaid = ['SENT', 'PARTIAL', 'OVERDUE'].includes(invoice.status);
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        reminderCount: { increment: 1 },
        lastReminderAt: new Date(),
        status: isUnpaid ? 'OVERDUE' : invoice.status,
      },
      include: {
        business: true,
        client: true,
        lineItems: true,
        reminders: true,
      },
    });

    // 6. Sync client counters and log client activity
    try {
      await syncClientCounters(invoice.clientId, user.id);
      await logClientActivity({
        clientId: invoice.clientId,
        userId: user.id,
        action: 'REMINDER_SENT',
        details: `Manual reminder (Stage ${stage || 1}) sent for Invoice ${invoice.invoiceNumber}`,
        amount: Number(invoice.grandTotal),
      });
    } catch (syncErr) {
      console.error('[MANUAL REMIND API] Failed to sync client counters or log activity:', syncErr);
    }

    // Helper to format decimals in updatedInvoice
    const serializeInvoice = {
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
    };

    return NextResponse.json({
      success: true,
      emailSent,
      whatsappUrl,
      invoice: serializeInvoice,
    });
  } catch (error: any) {
    console.error('Error in manual remind API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to dispatch manual reminder' },
      { status: 500 }
    );
  }
}
