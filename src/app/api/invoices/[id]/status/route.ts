import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { InvoiceStatus } from '@prisma/client';
import { getAuthUser } from '@/lib/auth';
import { syncClientCounters } from '@/lib/db/invoice-hooks';
import { logClientActivity } from '@/lib/db/client-analytics';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const { id } = await params;
    const body = await request.json();

    const { status, amountPaid, paidAt, paymentNotes } = body;

    if (!status) {
      return NextResponse.json({ error: 'Field "status" is required.' }, { status: 400 });
    }

    // Verify ownership
    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Construct update data
    const updateData: any = {
      status: status as InvoiceStatus,
    };

    if (amountPaid !== undefined) {
      updateData.amountPaid = Number(amountPaid);
    }
    if (paidAt !== undefined) {
      updateData.paidAt = paidAt ? new Date(paidAt) : null;
    }
    if (paymentNotes !== undefined) {
      updateData.paymentNotes = paymentNotes;
    }

    // Perform update
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        business: true,
        client: true,
        lineItems: true,
      },
    });

    // Sync client counters and log activity
    try {
      await syncClientCounters(updatedInvoice.clientId, user.id);
      
      const isNewPayment = status === 'PAID' && invoice.status !== 'PAID';
      if (isNewPayment) {
        const amt = amountPaid ? Number(amountPaid) : Number(updatedInvoice.grandTotal);
        await logClientActivity({
          clientId: updatedInvoice.clientId,
          userId: user.id,
          action: 'PAYMENT_RECEIVED',
          details: `Payment received: Invoice ${updatedInvoice.invoiceNumber} marked as PAID`,
          amount: amt,
        });
      } else {
        await logClientActivity({
          clientId: updatedInvoice.clientId,
          userId: user.id,
          action: 'INVOICE_UPDATED',
          details: `Invoice ${updatedInvoice.invoiceNumber} status updated to ${status}`,
          amount: Number(updatedInvoice.grandTotal),
        });
      }
    } catch (syncErr) {
      console.error('[INVOICE STATUS PUT API] Failed to sync client counters or log activity:', syncErr);
    }

    return NextResponse.json({ invoice: updatedInvoice });
  } catch (error: any) {
    console.error('Error updating invoice status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update invoice status' },
      { status: 500 }
    );
  }
}
