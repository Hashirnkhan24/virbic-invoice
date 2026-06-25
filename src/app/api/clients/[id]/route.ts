import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { getClientFinancials, getClientActivity } from '@/lib/db/client-analytics';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const { id } = await params;

    const searchParams = request.nextUrl.searchParams;
    let businessId = searchParams.get('businessId');
    if (businessId) {
      businessId = businessId.replace(/^"|"$/g, '');
      if (businessId === 'null' || businessId === 'undefined') {
        businessId = null;
      }
    }

    const client = await prisma.client.findUnique({
      where: { id },
      include: { portal: true }
    });

    if (!client || client.userId !== user.id) {
      return NextResponse.json({ error: 'Client not found or unauthorized' }, { status: 404 });
    }

    // Fetch client financials, activities, notes, and invoices
    const [financials, activities, notes, invoices] = await Promise.all([
      getClientFinancials(id, user.id, businessId || undefined),
      getClientActivity(id, user.id, 10),
      prisma.clientNote.findMany({
        where: { clientId: id, userId: user.id },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.invoice.findMany({
        where: { 
          clientId: id, 
          userId: user.id,
          ...(businessId && businessId !== 'all' ? { businessId } : {})
        },
        orderBy: { issueDate: 'desc' },
        take: 10,
      }),
    ]);

    // Serialize all decimals to numbers
    const serializedClient = {
      ...client,
      totalBilled: financials.totalBilled,
      totalOutstanding: financials.totalOutstanding,
      invoiceCount: financials.invoiceCount,
      lastInvoiceDate: financials.lastInvoiceDate,
    };

    const serializedInvoices = invoices.map(inv => ({
      ...inv,
      subTotal: Number(inv.subTotal),
      discountTotal: Number(inv.discountTotal),
      taxableAmount: Number(inv.taxableAmount),
      cgstTotal: Number(inv.cgstTotal),
      sgstTotal: Number(inv.sgstTotal),
      igstTotal: Number(inv.igstTotal),
      cessTotal: Number(inv.cessTotal),
      roundOff: Number(inv.roundOff),
      grandTotal: Number(inv.grandTotal),
      amountPaid: Number(inv.amountPaid),
    }));

    const serializedActivities = activities.map(act => ({
      ...act,
      amount: act.amount ? Number(act.amount) : null,
    }));

    return NextResponse.json({
      client: serializedClient,
      financials,
      activities: serializedActivities,
      notes,
      invoices: serializedInvoices,
    });
  } catch (err: any) {
    console.error('[CLIENT DETAIL GET]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const { id } = await params;

    const existingClient = await prisma.client.findUnique({
      where: { id },
    });

    if (!existingClient || existingClient.userId !== user.id) {
      return NextResponse.json({ error: 'Client not found or unauthorized' }, { status: 404 });
    }

    const invoicesCount = await prisma.invoice.count({
      where: { clientId: id },
    });

    if (invoicesCount > 0) {
      // Soft-delete
      await prisma.client.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });
      return NextResponse.json({ success: true, isSoftDeleted: true, message: 'Client soft-deleted successfully' });
    }

    await prisma.client.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, isSoftDeleted: false, message: 'Client deleted permanently' });
  } catch (err: any) {
    console.error('[CLIENT DETAIL DELETE]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
