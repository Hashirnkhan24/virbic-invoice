import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import {
  generateUPIDeepLink,
  generateUPIQRData,
  generateUPITransactionRef
} from '@/lib/upi-generator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, userId: user.id },
      include: { business: true, client: true }
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Only allow for SENT, OVERDUE, PARTIAL invoices
    if (!['SENT', 'OVERDUE', 'PARTIAL'].includes(invoice.status)) {
      return NextResponse.json({ error: 'Invoice is not in a payable status' }, { status: 400 });
    }

    // Check if business has UPI ID configured
    if (!invoice.business.upiId) {
      return NextResponse.json({ error: 'Business UPI ID not configured' }, { status: 400 });
    }

    const balanceDue = Number(invoice.grandTotal) - Number(invoice.amountPaid);
    if (balanceDue <= 0) {
      return NextResponse.json({ error: 'Invoice is already paid' }, { status: 400 });
    }

    // Generate transaction reference
    const transactionRef = generateUPITransactionRef(invoice.id);

    // Generate UPI deep-link
    const upiLink = generateUPIDeepLink({
      upiId: invoice.business.upiId,
      payeeName: invoice.business.name,
      amount: balanceDue,
      description: `INV-${invoice.invoiceNumber}`,
      transactionRef
    });

    // Generate QR data
    const qrData = generateUPIQRData({
      upiId: invoice.business.upiId,
      payeeName: invoice.business.name,
      amount: balanceDue,
      description: `INV-${invoice.invoiceNumber}`,
      transactionRef
    });

    // Store on invoice
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        upiPaymentLink: upiLink,
        upiQrGeneratedAt: new Date()
      }
    });

    return NextResponse.json({
      upiLink,
      qrData,
      upiId: invoice.business.upiId,
      amount: balanceDue,
      transactionRef,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
    });
  } catch (err: any) {
    console.error('[UPI_PAYMENT_GET_API] Error generating UPI data:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
