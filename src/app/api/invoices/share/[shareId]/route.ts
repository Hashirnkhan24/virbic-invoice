import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;

    // Fetch the invoice by publicShareId
    const invoice = await prisma.invoice.findFirst({
      where: { publicShareId: shareId },
      include: {
        business: {
          select: {
            name: true,
            gstin: true,
            pan: true,
            address: true,
            city: true,
            state: true,
            pincode: true,
            phone: true,
            email: true,
            bankName: true,
            accountNumber: true,
            ifscCode: true,
            upiId: true,
            logo: true,
            signature: true,
            brandColor: true,
          },
        },
        client: {
          select: {
            name: true,
            gstin: true,
            email: true,
            phone: true,
            billingAddress: true,
            billingCity: true,
            billingState: true,
            billingPincode: true,
          },
        },
        lineItems: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check password protection
    if (invoice.sharePassword) {
      // Get password from header or query param
      const searchParams = request.nextUrl.searchParams;
      const queryPassword = searchParams.get('password');
      const headerPassword = request.headers.get('x-share-password');
      const password = queryPassword || headerPassword;

      if (!password) {
        return NextResponse.json(
          { error: 'Password required', passwordProtected: true },
          { status: 401 }
        );
      }

      if (password !== invoice.sharePassword) {
        return NextResponse.json(
          { error: 'Invalid password', passwordProtected: true },
          { status: 403 }
        );
      }
    }

    // Increment view count in database on successful access
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        viewCount: { increment: 1 },
      },
    });

    // Strip password from the response for security
    const { sharePassword, ...safeInvoice } = invoice;

    return NextResponse.json({ invoice: safeInvoice });
  } catch (error: any) {
    console.error('Error fetching shared invoice:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch shared invoice' },
      { status: 500 }
    );
  }
}
