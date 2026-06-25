import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// GET /api/portal/[slug]
// Public endpoint to fetch client portal data
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
      where: { slug },
      include: {
        client: {
          include: {
            user: {
              include: {
                businesses: {
                  where: { isDefault: true }
                }
              }
            }
          }
        }
      }
    });

    if (!portal || !portal.enabled || portal.client.isDeleted) {
      return NextResponse.json({ error: 'Portal not found or disabled' }, { status: 404 });
    }

    const isPasswordProtected = !!portal.password;
    const branding = {
      title: portal.title || `${portal.client.user.businesses[0]?.name || 'Business'} Client Portal`,
      brandColor: portal.brandColor || portal.client.user.businesses[0]?.brandColor || '#10b981',
      logoUrl: portal.logoUrl || portal.client.user.businesses[0]?.logo || null,
      showPaidInvoices: portal.showPaidInvoices,
      allowPdfDownload: portal.allowPdfDownload,
      allowPayment: portal.allowPayment,
      showPaymentHistory: portal.showPaymentHistory
    };

    if (isPasswordProtected) {
      let isAuthorized = false;
      if (passwordAttempt) {
        try {
          isAuthorized = bcrypt.compareSync(passwordAttempt, portal.password!);
        } catch (e) {
          console.error('[PORTAL_AUTH_COMPARE_ERROR]', e);
        }
      }

      if (!isAuthorized) {
        return NextResponse.json({
          isPasswordProtected: true,
          branding
        }, { status: 200 }); // Status 200 with flag isPasswordProtected: true is easiest for frontend to handle nicely
      }
    }

    // Load business details (use default business or any business related to the client)
    const business = await prisma.business.findFirst({
      where: { userId: portal.userId, isDefault: true }
    }) || await prisma.business.findFirst({
      where: { userId: portal.userId }
    });

    if (!business) {
      return NextResponse.json({ error: 'Business configuration not found' }, { status: 404 });
    }

    // Load client's invoices (SENT, PAID, OVERDUE, PARTIAL - no DRAFT, no CANCELLED)
    const invoices = await prisma.invoice.findMany({
      where: {
        clientId: portal.clientId,
        userId: portal.userId,
        status: { in: ['SENT', 'PAID', 'OVERDUE', 'PARTIAL'] }
      },
      orderBy: { issueDate: 'desc' }
    });

    // Load payments history
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
      isPasswordProtected: false,
      branding,
      client: {
        id: portal.client.id,
        name: portal.client.name,
        email: portal.client.email,
        phone: portal.client.phone
      },
      business: {
        name: business.name,
        email: business.email,
        phone: business.phone,
        logo: business.logo,
        brandColor: business.brandColor
      },
      invoices: serializedInvoices,
      payments: serializedPayments
    });
  } catch (err: any) {
    console.error('[PORTAL_GET]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
