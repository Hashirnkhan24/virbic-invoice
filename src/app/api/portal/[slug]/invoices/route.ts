import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// GET /api/portal/[slug]/invoices
// Public endpoint to get client portal invoices list
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const searchParams = request.nextUrl.searchParams;
    const passwordQuery = searchParams.get('password');
    const passwordHeader = request.headers.get('x-portal-password');
    const passwordAttempt = passwordQuery || passwordHeader || '';

    const portal = await prisma.clientPortal.findUnique({
      where: { slug }
    });

    if (!portal || !portal.enabled) {
      return NextResponse.json({ error: 'Portal not found or disabled' }, { status: 404 });
    }

    if (portal.password) {
      let isAuthorized = false;
      if (passwordAttempt) {
        try {
          isAuthorized = bcrypt.compareSync(passwordAttempt, portal.password);
        } catch (e) {}
      }

      if (!isAuthorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Fetch client's invoices (SENT, PAID, OVERDUE, PARTIAL)
    const invoices = await prisma.invoice.findMany({
      where: {
        clientId: portal.clientId,
        userId: portal.userId,
        status: { in: ['SENT', 'PAID', 'OVERDUE', 'PARTIAL'] }
      },
      orderBy: { issueDate: 'desc' }
    });

    // Fetch payments history
    let payments: any[] = [];
    if (portal.showPaymentHistory) {
      payments = await prisma.payment.findMany({
        where: {
          invoice: {
            clientId: portal.clientId
          },
          status: 'CONFIRMED'
        },
        include: {
          invoice: {
            select: { invoiceNumber: true }
          }
        },
        orderBy: { paidAt: 'desc' }
      });
    }

    // Serialize Decimals
    const serializedInvoices = invoices.map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      issueDate: inv.issueDate.toISOString(),
      dueDate: inv.dueDate.toISOString(),
      currency: inv.currency,
      grandTotal: Number(inv.grandTotal),
      amountPaid: Number(inv.amountPaid),
      publicShareId: inv.publicShareId,
      razorpayPaymentLinkId: inv.razorpayPaymentLinkId,
      razorpayPaymentLinkUrl: inv.razorpayPaymentLinkUrl,
      razorpayPaymentLinkStatus: inv.razorpayPaymentLinkStatus
    }));

    const serializedPayments = payments.map(p => ({
      id: p.id,
      invoiceId: p.invoiceId,
      invoiceNumber: p.invoice.invoiceNumber,
      amount: Number(p.amount),
      method: p.method,
      reference: p.reference,
      paidAt: p.paidAt.toISOString(),
      notes: p.notes
    }));

    return NextResponse.json({
      invoices: serializedInvoices,
      payments: serializedPayments
    });
  } catch (err: any) {
    console.error('[PORTAL_INVOICES_GET]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
