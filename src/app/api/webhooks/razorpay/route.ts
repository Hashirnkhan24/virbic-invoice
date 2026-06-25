import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { recalculateInvoicePayments } from '@/lib/payment-engine';
import { logClientActivity } from '@/lib/db/client-analytics';
import { sendPaymentConfirmation } from '@/lib/confirmation-service';

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-razorpay-signature');
    if (!signature) {
      console.warn('[RAZORPAY WEBHOOK] Missing signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const rawBody = await request.text();
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.warn('[RAZORPAY WEBHOOK] Invalid signature signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const body = JSON.parse(rawBody);
    const event = body.event;
    console.log(`[RAZORPAY WEBHOOK] Received event: ${event}`);

    const payload = body.payload;

    if (event === 'payment_link.paid') {
      const paymentLinkEntity = payload.payment_link?.entity;
      const paymentEntity = payload.payment?.entity;

      if (!paymentLinkEntity || !paymentEntity) {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
      }

      // Try finding the invoice by notes first, then by paymentLinkId
      let invoiceId = paymentLinkEntity.notes?.invoiceId;
      let invoice = null;

      if (invoiceId) {
        invoice = await prisma.invoice.findUnique({
          where: { id: invoiceId }
        });
      }

      if (!invoice) {
        invoice = await prisma.invoice.findFirst({
          where: { razorpayPaymentLinkId: paymentLinkEntity.id }
        });
      }

      if (!invoice) {
        console.error(`[RAZORPAY WEBHOOK] Invoice not found for payment link ${paymentLinkEntity.id}`);
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      // Check for duplicate payment (idempotency check)
      const existingPayment = await prisma.payment.findFirst({
        where: {
          OR: [
            { gatewayRef: paymentEntity.id },
            { razorpayPaymentId: paymentEntity.id }
          ]
        }
      });

      if (existingPayment) {
        console.log(`[RAZORPAY WEBHOOK] Payment ${paymentEntity.id} already processed`);
        return NextResponse.json({ success: true, message: 'Payment already processed' });
      }

      // Map Razorpay payment method to internal PaymentMethod enum
      const rpMethod = (paymentEntity.method || '').toLowerCase();
      let method: 'UPI' | 'CARD' | 'NEFT' | 'OTHER' = 'OTHER';
      if (rpMethod === 'upi') {
        method = 'UPI';
      } else if (rpMethod === 'card') {
        method = 'CARD';
      } else if (rpMethod === 'netbanking') {
        method = 'NEFT';
      }

      const amount = paymentEntity.amount / 100; // convert paise to Rupees

      // Create Payment record
      const payment = await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          userId: invoice.userId,
          amount: amount,
          method: method,
          reference: paymentEntity.acquirer_data?.bank_transaction_id || paymentEntity.id,
          notes: `Razorpay Payment Link: ${paymentLinkEntity.id}`,
          status: 'CONFIRMED',
          gatewayRef: paymentEntity.id,
          gatewayName: 'razorpay',
          razorpayPaymentId: paymentEntity.id,
          razorpayOrderId: paymentEntity.order_id || null,
          paidAt: new Date(paymentEntity.created_at * 1000)
        }
      });

      // Update Invoice payment state and status
      const result = await recalculateInvoicePayments(invoice.id);

      // Update the invoice payment link status
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          razorpayPaymentLinkStatus: 'paid'
        }
      });

      // Log activity
      await logClientActivity({
        clientId: invoice.clientId,
        userId: invoice.userId,
        action: 'PAYMENT_RECEIVED',
        details: `Razorpay payment of INR ${amount.toFixed(2)} received for invoice ${invoice.invoiceNumber}`,
        amount: amount
      });

      // Send automated receipt and whatsapp
      try {
        await sendPaymentConfirmation({
          invoiceId: invoice.id,
          paymentId: payment.id,
          channel: 'both' // Force receipt to go via both channels when settled
        });
        console.log(`[RAZORPAY WEBHOOK] Auto-confirmations triggered successfully for invoice ${invoice.id}`);
      } catch (notifyErr: any) {
        console.error('[RAZORPAY WEBHOOK] Failed to trigger payment confirmations:', notifyErr.message);
      }

      return NextResponse.json({ success: true, message: 'Payment recorded and confirmed' });
    }

    if (event === 'payment_link.cancelled') {
      const paymentLinkEntity = payload.payment_link?.entity;
      if (paymentLinkEntity) {
        await prisma.invoice.updateMany({
          where: { razorpayPaymentLinkId: paymentLinkEntity.id },
          data: { razorpayPaymentLinkStatus: 'cancelled' }
        });
        console.log(`[RAZORPAY WEBHOOK] Payment link ${paymentLinkEntity.id} marked as cancelled`);
      }
      return NextResponse.json({ success: true });
    }

    if (event === 'payment_link.expired') {
      const paymentLinkEntity = payload.payment_link?.entity;
      if (paymentLinkEntity) {
        await prisma.invoice.updateMany({
          where: { razorpayPaymentLinkId: paymentLinkEntity.id },
          data: { razorpayPaymentLinkStatus: 'expired' }
        });
        console.log(`[RAZORPAY WEBHOOK] Payment link ${paymentLinkEntity.id} marked as expired`);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true, message: 'Event ignored' });
  } catch (err: any) {
    console.error('[RAZORPAY WEBHOOK ERROR]', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
