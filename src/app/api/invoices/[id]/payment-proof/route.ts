import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { sendUserNotification } from '@/lib/notifications';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Verify invoice exists and is payable
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        status: { in: ['SENT', 'OVERDUE', 'PARTIAL'] }
      },
      include: { business: true, client: true, user: true }
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found or not in a payable status' }, { status: 404 });
    }

    // Validate UTR format (UPI UTR numbers are exactly 12 digits)
    const utr = body.utr?.trim().toUpperCase();
    if (!utr) {
      return NextResponse.json({ error: 'UTR number is required' }, { status: 400 });
    }

    const utrRegex = /^\d{12}$/;
    if (!utrRegex.test(utr)) {
      return NextResponse.json({ error: 'Invalid UTR format. Must be exactly 12 numeric digits.' }, { status: 400 });
    }

    // Check UTR uniqueness across this user's invoices to prevent double submissions
    const existingProof = await prisma.paymentProof.findFirst({
      where: {
        userId: invoice.userId,
        utr,
        status: { in: ['APPROVED', 'AUTO_APPROVED', 'PENDING'] }
      }
    });

    if (existingProof) {
      return NextResponse.json({ error: 'This UTR has already been submitted for verification' }, { status: 400 });
    }

    // Validate amount
    const amountPaid = parseFloat(body.amountPaid);
    const balanceDue = Number(invoice.grandTotal) - Number(invoice.amountPaid);

    if (isNaN(amountPaid) || amountPaid <= 0) {
      return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 });
    }

    if (amountPaid > balanceDue + 0.01) {
      return NextResponse.json({ error: `Amount exceeds balance due of ₹${balanceDue.toFixed(2)}` }, { status: 400 });
    }

    // Generate unique ID for this proof
    const proofId = 'proof_' + Math.random().toString(36).substring(2, 15);

    // Handle screenshot upload (if provided)
    let screenshotUrl = null;
    if (body.screenshotBase64) {
      try {
        const matches = body.screenshotBase64.match(/^data:image\/([A-Za-z+]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          
          const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'proofs');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          
          const filename = `${proofId}.${extension}`;
          const filepath = path.join(uploadDir, filename);
          fs.writeFileSync(filepath, buffer);
          
          screenshotUrl = `/uploads/proofs/${filename}`;
        }
      } catch (uploadErr) {
        console.error('[PROOF_UPLOAD_ERROR] Failed to save screenshot:', uploadErr);
        // Do not fail the whole request if only screenshot file save fails
      }
    }

    // Check user preference for auto-approval
    const userPrefs = await prisma.userPreference.findUnique({
      where: { userId: invoice.userId }
    });

    const autoApproveEnabled = userPrefs ? userPrefs.upiAutoApproveEnabled : false;
    const autoApproveHours = userPrefs ? userPrefs.upiAutoApproveHours : 72;
    const autoApproveAt = autoApproveEnabled 
      ? new Date(Date.now() + autoApproveHours * 60 * 60 * 1000) 
      : null;

    // Create payment proof
    const proof = await prisma.paymentProof.create({
      data: {
        id: proofId,
        invoiceId: invoice.id,
        userId: invoice.userId,
        utr,
        screenshotUrl,
        amountPaid,
        status: 'PENDING',
        autoApproveAt
      }
    });

    // Send notification to user (in-app + email)
    const formattedAmount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amountPaid);
    await sendUserNotification({
      userId: invoice.userId,
      type: 'PAYMENT_PROOF_SUBMITTED',
      title: 'UPI Payment Proof Submitted',
      body: `${invoice.client.name} has submitted a payment of ${formattedAmount} for Invoice #${invoice.invoiceNumber}. UTR: ${utr}. Please verify this in your bank account.`,
      data: { invoiceId: invoice.id, proofId: proof.id }
    });

    return NextResponse.json({
      success: true,
      proofId: proof.id,
      message: 'Payment proof submitted successfully'
    });
  } catch (err: any) {
    console.error('[PAYMENT_PROOF_POST_API] Failed to submit payment proof:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
