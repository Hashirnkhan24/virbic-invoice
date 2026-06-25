import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { recalculateInvoicePayments } from '@/lib/payment-engine';
import { sendPaymentConfirmation } from '@/lib/confirmation-service';
import { sendReceiptEmail } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;

    const body = await request.json();
    const { proofId, action, rejectionReason } = body;

    if (!proofId || !action) {
      return NextResponse.json({ error: 'Proof ID and Action are required' }, { status: 400 });
    }

    // Fetch the payment proof and verify ownership
    const proof = await prisma.paymentProof.findFirst({
      where: { id: proofId, userId: user.id },
      include: { invoice: { include: { client: true } } }
    });

    if (!proof) {
      return NextResponse.json({ error: 'Payment proof not found' }, { status: 404 });
    }

    if (proof.status !== 'PENDING') {
      return NextResponse.json({ error: `Payment proof has already been processed (${proof.status})` }, { status: 400 });
    }

    const now = new Date();

    if (action === 'APPROVE') {
      // 1. Create a Payment record
      const payment = await prisma.payment.create({
        data: {
          invoiceId: proof.invoiceId,
          userId: user.id,
          amount: proof.amountPaid,
          method: 'UPI',
          reference: proof.utr,
          notes: `Approved via Payments Inbox. UTR: ${proof.utr}`,
          gatewayRef: proof.utr,
          gatewayName: 'upi_manual',
          paidAt: proof.submittedAt,
          status: 'CONFIRMED',
          paymentProofId: proof.id
        }
      });

      // 2. Mark proof as APPROVED
      await prisma.paymentProof.update({
        where: { id: proof.id },
        data: {
          status: 'APPROVED',
          verifiedAt: now,
          verifiedBy: user.id
        }
      });

      // 3. Recalculate invoice totals and status
      await recalculateInvoicePayments(proof.invoiceId);

      // 4. Send official automated receipt email
      try {
        await sendPaymentConfirmation({
          invoiceId: proof.invoiceId,
          paymentId: payment.id,
          channel: 'both' // Send email and WhatsApp if configured
        });
      } catch (confirmErr: any) {
        console.error('[PAYMENTS_VERIFY_API] Failed to trigger payment confirmations:', confirmErr.message);
      }

      return NextResponse.json({
        success: true,
        message: 'Payment proof approved and recorded successfully'
      });

    } else if (action === 'REJECT') {
      const reason = rejectionReason || 'Payment details could not be verified.';

      // 1. Mark proof as REJECTED
      await prisma.paymentProof.update({
        where: { id: proof.id },
        data: {
          status: 'REJECTED',
          verifiedAt: now,
          verifiedBy: user.id,
          rejectionReason: reason
        }
      });

      // 2. Send rejection email notification to client
      if (proof.invoice.client.email) {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const shareId = proof.invoice.publicShareId || proof.invoice.id;
          const reSubmitLink = `${appUrl}/i/${shareId}/verify`;
          
          await sendReceiptEmail({
            to: proof.invoice.client.email,
            subject: `[Payment Unverified] Invoice #${proof.invoice.invoiceNumber}`,
            htmlBody: `
              <div style="font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #fee2e2; border-radius: 12px; background-color: #fef2f2;">
                <h2 style="color: #dc2626; font-weight: 800; font-size: 20px; margin-top: 0; margin-bottom: 12px; letter-spacing: -0.025em;">Payment Verification Failed</h2>
                <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 16px;">
                  The payment proof you submitted for **Invoice #${proof.invoice.invoiceNumber}** could not be verified by the merchant.
                </p>
                <p style="font-size: 14px; line-height: 1.6; color: #7f1d1d; font-weight: bold; margin-bottom: 24px;">
                  Reason: "${reason}"
                </p>
                <p style="margin-bottom: 24px;">
                  <a href="${reSubmitLink}" style="display: inline-block; padding: 10px 18px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px; shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
                    Re-submit Payment Reference
                  </a>
                </p>
                <hr style="border: 0; border-top: 1px solid #fee2e2; margin: 24px 0;" />
                <p style="font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.5;">
                  If you believe this is an error, please reach out to the merchant directly with your bank transaction slip.
                </p>
              </div>
            `,
            fromName: 'BillCraft Verification',
            replyToEmail: user.email || 'support@billcraft.in'
          });
        } catch (emailErr) {
          console.error('[PAYMENTS_VERIFY_API] Failed to send rejection email to client:', emailErr);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Payment proof rejected and client notified'
      });

    } else {
      return NextResponse.json({ error: 'Invalid action. Must be APPROVE or REJECT' }, { status: 400 });
    }

  } catch (err: any) {
    console.error('[PAYMENTS_VERIFY_POST_API] Failed to verify payment proof:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
