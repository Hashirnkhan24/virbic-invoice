import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePublicShareId } from '@/lib/helpers';
import { getAuthUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const { id } = await params;

    // 1. Fetch original invoice with line items
    const originalInvoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        lineItems: true,
      },
    });

    if (!originalInvoice) {
      return NextResponse.json({ error: 'Original invoice not found' }, { status: 404 });
    }

    if (originalInvoice.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 2. Fetch business profile to auto-generate unique duplicate number
    const business = await prisma.business.findUnique({
      where: { id: originalInvoice.businessId },
    });

    if (!business) {
      return NextResponse.json({ error: 'Business profile not found' }, { status: 404 });
    }

    // Generate next unique invoice number
    let nextCount = business.invoiceNumber;
    let finalNumber = '';
    
    while (true) {
      const formattedNum = `${business.invoicePrefix}/${business.financialYear}/${String(nextCount).padStart(3, '0')}`;
      const exists = await prisma.invoice.findFirst({
        where: {
          userId: user.id,
          invoiceNumber: formattedNum,
        },
      });
      if (!exists) {
        finalNumber = formattedNum;
        break;
      }
      nextCount++;
    }

    const publicShareId = generatePublicShareId();

    // 3. Create duplicate invoice in transaction
    const duplicatedInvoice = await prisma.$transaction(async (tx) => {
      // Create clone
      const clone = await tx.invoice.create({
        data: {
          invoiceNumber: finalNumber,
          userId: user.id,
          businessId: originalInvoice.businessId,
          clientId: originalInvoice.clientId,
          template: originalInvoice.template,
          currency: originalInvoice.currency,
          exchangeRate: originalInvoice.exchangeRate,
          issueDate: new Date(), // Set issue date to today
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // Default 15 days from now
          placeOfSupply: originalInvoice.placeOfSupply,
          isInterState: originalInvoice.isInterState,
          reverseCharge: originalInvoice.reverseCharge,
          subTotal: originalInvoice.subTotal,
          discountTotal: originalInvoice.discountTotal,
          taxableAmount: originalInvoice.taxableAmount,
          cgstTotal: originalInvoice.cgstTotal,
          sgstTotal: originalInvoice.sgstTotal,
          igstTotal: originalInvoice.igstTotal,
          cessTotal: originalInvoice.cessTotal,
          roundOff: originalInvoice.roundOff,
          grandTotal: originalInvoice.grandTotal,
          notes: originalInvoice.notes,
          terms: originalInvoice.terms,
          customFields: originalInvoice.customFields || [],
          status: 'DRAFT', // Duplicate starts as draft
          publicShareId,
        },
      });

      // Create duplicate line items
      await Promise.all(
        originalInvoice.lineItems.map((item) =>
          tx.invoiceLineItem.create({
            data: {
              invoiceId: clone.id,
              itemId: item.itemId,
              description: item.description,
              hsnCode: item.hsnCode,
              quantity: item.quantity,
              unit: item.unit,
              rate: item.rate,
              discount: item.discount,
              discountType: item.discountType,
              gstRate: item.gstRate,
              cgstAmount: item.cgstAmount,
              sgstAmount: item.sgstAmount,
              igstAmount: item.igstAmount,
              taxableValue: item.taxableValue,
              totalAmount: item.totalAmount,
            },
          })
        )
      );

      // Increment business counter
      await tx.business.update({
        where: { id: business.id },
        data: {
          invoiceNumber: nextCount + 1,
        },
      });

      return clone;
    });

    return NextResponse.json({ invoice: duplicatedInvoice }, { status: 201 });
  } catch (error: any) {
    console.error('Error duplicating invoice:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to duplicate invoice' },
      { status: 500 }
    );
  }
}
