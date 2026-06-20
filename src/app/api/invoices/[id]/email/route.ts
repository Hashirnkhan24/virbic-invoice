import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendInvoiceEmail } from '@/lib/email-service';
import { getAuthUser } from '@/lib/auth';

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

    const { to, subject, message } = body;

    if (!to || !subject || !message) {
      return NextResponse.json(
        { error: 'Fields "to", "subject", and "message" are required.' },
        { status: 400 }
      );
    }

    // Fetch invoice to verify ownership
    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Call mock email service
    const result = await sendInvoiceEmail(id, to, subject, message);

    let updatedInvoice = null;
    if (body.isReminder) {
      await prisma.invoiceReminder.create({
        data: {
          invoiceId: id,
          subject,
          body: message,
          recipient: to,
        },
      });

      updatedInvoice = await prisma.invoice.update({
        where: { id },
        data: {
          reminderCount: { increment: 1 },
          lastReminderAt: new Date(),
          status: 'OVERDUE',
        },
        include: {
          business: true,
          client: true,
          lineItems: true,
          reminders: true,
        },
      });
    }

    // Helper to format decimals in updatedInvoice if it exists
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
      message: 'Invoice emailed successfully',
      messageId: result.messageId,
      invoice: serializeInvoice,
    });
  } catch (error: any) {
    console.error('Error sending invoice email API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
