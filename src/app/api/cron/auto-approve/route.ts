import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recalculateInvoicePayments } from '@/lib/payment-engine';
import { sendPaymentConfirmation } from '@/lib/confirmation-service';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'virbic-cron-secret-123';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[CRON AUTO APPROVE] Unauthorized access attempt');
      return new Response('Unauthorized', { status: 401 });
    }

    const now = new Date();

    // Find proofs where status is PENDING and autoApproveAt is <= now
    const proofsToAutoApprove = await prisma.paymentProof.findMany({
      where: {
        status: 'PENDING',
        autoApproveAt: { lte: now },
        autoApproved: false
      }
    });

    const results = [];

    for (const proof of proofsToAutoApprove) {
      try {
        // 1. Create Payment record
        const payment = await prisma.payment.create({
          data: {
            invoiceId: proof.invoiceId,
            userId: proof.userId,
            amount: proof.amountPaid,
            method: 'UPI',
            reference: proof.utr,
            notes: `Auto-approved after verification window. UTR: ${proof.utr}`,
            gatewayRef: proof.utr,
            gatewayName: 'upi_manual',
            paidAt: proof.submittedAt,
            status: 'CONFIRMED',
            paymentProofId: proof.id
          }
        });

        // 2. Mark proof as AUTO_APPROVED
        await prisma.paymentProof.update({
          where: { id: proof.id },
          data: {
            status: 'AUTO_APPROVED',
            autoApproved: true,
            verifiedAt: now
          }
        });

        // 3. Recalculate invoice
        await recalculateInvoicePayments(proof.invoiceId);

        // 4. Send receipt to client
        try {
          await sendPaymentConfirmation({
            invoiceId: proof.invoiceId,
            paymentId: payment.id,
            channel: 'both'
          });
        } catch (confirmErr: any) {
          console.error(`[CRON AUTO APPROVE] Failed to send receipt for proof ${proof.id}:`, confirmErr.message);
        }

        results.push({ proofId: proof.id, status: 'auto_approved' });
      } catch (err: any) {
        console.error(`[CRON AUTO APPROVE] Failed to auto-approve proof ${proof.id}:`, err);
        results.push({ proofId: proof.id, status: 'error', error: err.message });
      }
    }

    return NextResponse.json({ processed: results.length, results });
  } catch (err: any) {
    console.error('[CRON AUTO APPROVE ERROR]', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
