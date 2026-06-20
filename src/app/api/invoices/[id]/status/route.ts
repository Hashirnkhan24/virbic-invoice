import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { InvoiceStatus } from '@prisma/client';
import { getAuthUser } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const { id } = await params;
    const body = await request.json();

    const { status, amountPaid, paidAt, paymentNotes } = body;

    if (!status) {
      return NextResponse.json({ error: 'Field "status" is required.' }, { status: 400 });
    }

    // Verify ownership
    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Construct update data
    const updateData: any = {
      status: status as InvoiceStatus,
    };

    if (amountPaid !== undefined) {
      updateData.amountPaid = Number(amountPaid);
    }
    if (paidAt !== undefined) {
      updateData.paidAt = paidAt ? new Date(paidAt) : null;
    }
    if (paymentNotes !== undefined) {
      updateData.paymentNotes = paymentNotes;
    }

    // Perform update
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        business: true,
        client: true,
        lineItems: true,
      },
    });

    return NextResponse.json({ invoice: updatedInvoice });
  } catch (error: any) {
    console.error('Error updating invoice status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update invoice status' },
      { status: 500 }
    );
  }
}
