import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { createInvoicePaymentLink, cancelPaymentLink } from '@/lib/razorpay-payment-links';

// POST /api/invoices/[id]/payment-link
// Create a new Razorpay payment link for an invoice
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const { id: invoiceId } = await params;

    // Fetch invoice with client details
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId: user.id },
      include: { client: true }
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.status === 'DRAFT') {
      return NextResponse.json({ error: 'Cannot create payment link for a draft invoice' }, { status: 400 });
    }

    if (invoice.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Cannot create payment link for a cancelled invoice' }, { status: 400 });
    }

    if (invoice.status === 'PAID') {
      return NextResponse.json({ error: 'Invoice is already fully paid' }, { status: 400 });
    }

    if (invoice.currency.toUpperCase() !== 'INR') {
      return NextResponse.json({ error: 'Razorpay payment links only support INR currency' }, { status: 400 });
    }

    // If an active payment link already exists, return it
    if (invoice.razorpayPaymentLinkId && invoice.razorpayPaymentLinkStatus === 'created') {
      return NextResponse.json({
        id: invoice.razorpayPaymentLinkId,
        short_url: invoice.razorpayPaymentLinkUrl,
        status: invoice.razorpayPaymentLinkStatus
      });
    }

    // Generate a new link
    const linkResult = await createInvoicePaymentLink(invoice);

    // Save link information to the invoice database
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        razorpayPaymentLinkId: linkResult.id,
        razorpayPaymentLinkUrl: linkResult.short_url,
        razorpayPaymentLinkStatus: linkResult.status
      }
    });

    return NextResponse.json({
      id: updatedInvoice.razorpayPaymentLinkId,
      short_url: updatedInvoice.razorpayPaymentLinkUrl,
      status: updatedInvoice.razorpayPaymentLinkStatus
    });
  } catch (err: any) {
    console.error('[PAYMENT_LINK_POST_API] Failed to create Razorpay payment link:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE /api/invoices/[id]/payment-link
// Cancel a Razorpay payment link for an invoice
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const { id: invoiceId } = await params;

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId: user.id }
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (!invoice.razorpayPaymentLinkId) {
      return NextResponse.json({ error: 'No active payment link exists for this invoice' }, { status: 400 });
    }

    // Cancel on Razorpay if it is still created/active
    if (invoice.razorpayPaymentLinkStatus === 'created') {
      await cancelPaymentLink(invoice.razorpayPaymentLinkId);
    }

    // Update status in db
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        razorpayPaymentLinkStatus: 'cancelled'
      }
    });

    return NextResponse.json({
      success: true,
      status: updatedInvoice.razorpayPaymentLinkStatus
    });
  } catch (err: any) {
    console.error('[PAYMENT_LINK_DELETE_API] Failed to cancel Razorpay payment link:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
