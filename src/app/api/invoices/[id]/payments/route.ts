import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import {
  recalculateInvoicePayments,
  getPaymentHistory,
  validatePaymentAmount
} from '@/lib/payment-engine';
import { logClientActivity } from '@/lib/db/client-analytics';
import { formatCurrency } from '@/lib/helpers';
import { PaymentMethod } from '@prisma/client';
import { sendPaymentConfirmation } from '@/lib/confirmation-service';

// GET — list payments for an invoice
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const { id: invoiceId } = await params;

    // Verify invoice ownership
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId: user.id }
    });
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const payments = await getPaymentHistory(invoiceId, user.id);
    return NextResponse.json(payments);
  } catch (err: any) {
    console.error('[PAYMENTS GET API]', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST — record a new payment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const { id: invoiceId } = await params;

    // Verify invoice ownership
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId: user.id }
    });
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Can't record payments on draft/cancelled invoices
    if (invoice.status === 'DRAFT') {
      return NextResponse.json({ error: 'Cannot record payment on a draft invoice' }, { status: 400 });
    }
    if (invoice.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Cannot record payment on a cancelled invoice' }, { status: 400 });
    }

    const body = await request.json();
    const amount = parseFloat(body.amount);
    
    // Validate amount
    const validation = validatePaymentAmount(
      amount,
      Number(invoice.amountPaid),
      Number(invoice.grandTotal)
    );
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        userId: user.id,
        amount: amount,
        method: (body.method as PaymentMethod) || 'UPI',
        reference: body.reference || null,
        notes: body.notes || null,
        paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
        status: 'CONFIRMED'
      }
    });

    // Recalculate invoice totals and status
    const result = await recalculateInvoicePayments(invoiceId);

    // Log activity
    await logClientActivity({
      clientId: invoice.clientId,
      userId: user.id,
      action: 'PAYMENT_RECEIVED',
      details: `Payment of ${formatCurrency(amount, invoice.currency)} recorded for invoice ${invoice.invoiceNumber}`,
      amount: amount
    });

    // Auto payment confirmation
    let preferences = null;
    try {
      if (prisma.userPreference) {
        preferences = await prisma.userPreference.findUnique({
          where: { userId: user.id },
        });
      } else {
        console.warn('[PAYMENTS POST API] prisma.userPreference is undefined (outdated cached client).');
      }
    } catch (prefErr: any) {
      console.error('[PAYMENTS POST API] Failed to query user preferences:', prefErr.message);
    }

    const autoConfirmation = preferences ? preferences.autoConfirmation : true;

    let whatsappUrl = null;
    let whatsappMessage = null;
    let emailSent = false;

    if (autoConfirmation) {
      const isPaid = result?.newStatus === 'PAID';
      const isSignificant = amount >= Number(invoice.grandTotal) * 0.3;

      if (isPaid || isSignificant) {
        try {
          const confirmationResult = await sendPaymentConfirmation({
            invoiceId,
            paymentId: payment.id,
          });
          whatsappUrl = confirmationResult.whatsappUrl;
          whatsappMessage = confirmationResult.whatsappMessage;
          emailSent = confirmationResult.emailSent;
        } catch (err: any) {
          console.error('[PAYMENTS POST API] Failed to send payment confirmation:', err.message);
        }
      }
    }

    return NextResponse.json({
      payment,
      invoiceUpdate: result,
      whatsappUrl,
      whatsappMessage,
      emailSent
    });
  } catch (err: any) {
    console.error('[PAYMENTS POST API]', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PUT — update a payment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const { id: invoiceId } = await params;

    // Verify ownership through invoice
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId: user.id }
    });
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const body = await request.json();
    const { paymentId, amount, method, reference, notes, paidAt } = body;

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, invoiceId, userId: user.id }
    });
    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (method !== undefined) updateData.method = method as PaymentMethod;
    if (reference !== undefined) updateData.reference = reference || null;
    if (notes !== undefined) updateData.notes = notes || null;
    if (paidAt !== undefined) updateData.paidAt = new Date(paidAt);

    // If amount is being changed, validate
    if (amount !== undefined) {
      const targetAmount = parseFloat(amount);
      
      const otherPaymentsTotal = await prisma.payment.aggregate({
        where: {
          invoiceId,
          userId: user.id,
          id: { not: paymentId },
          status: { in: ['CONFIRMED', 'PENDING'] }
        },
        _sum: { amount: true }
      });

      const currentPaid = Number(otherPaymentsTotal._sum.amount || 0);
      const validation = validatePaymentAmount(targetAmount, currentPaid, Number(invoice.grandTotal));
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      updateData.amount = targetAmount;
    }

    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: updateData
    });

    // Recalculate
    const result = await recalculateInvoicePayments(invoiceId);

    return NextResponse.json({ payment: updated, invoiceUpdate: result });
  } catch (err: any) {
    console.error('[PAYMENTS PUT API]', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE — remove a payment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const { id: invoiceId } = await params;

    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');
    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    // Verify ownership of the invoice
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId: user.id }
    });
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Verify payment belongs to this invoice/user
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, invoiceId, userId: user.id }
    });
    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    await prisma.payment.delete({
      where: { id: paymentId }
    });

    // Recalculate
    const result = await recalculateInvoicePayments(invoiceId);

    return NextResponse.json({ success: true, invoiceUpdate: result });
  } catch (err: any) {
    console.error('[PAYMENTS DELETE API]', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
