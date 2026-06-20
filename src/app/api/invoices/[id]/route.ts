import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { z } from 'zod';
import {
  determineTaxType,
  calculateLineItemTotal,
  calculateInvoiceTotals,
} from '@/lib/tax-engine';

// Zod schema for invoice line item validation
const invoiceLineItemSchema = z.object({
  itemId: z.string().optional().nullable(),
  description: z.string().min(1, 'Item description is required'),
  hsnCode: z.string().optional().nullable(),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit: z.string().default('PCS'),
  rate: z.number().min(0, 'Rate must be greater than or equal to 0'),
  discount: z.number().default(0),
  discountType: z.enum(['PERCENTAGE', 'AMOUNT']).default('PERCENTAGE'),
  gstRate: z.number().default(18),
});

// Zod schema for invoice validation
const invoiceSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  clientId: z.string().min(1, 'Client ID is required'),
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  template: z.string().default('modern'),
  currency: z.string().default('INR'),
  exchangeRate: z.number().default(1),
  issueDate: z.string().transform((val) => new Date(val)),
  dueDate: z.string().transform((val) => new Date(val)),
  placeOfSupply: z.string().min(1, 'Place of supply is required'),
  reverseCharge: z.boolean().default(false),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  customFields: z.array(z.object({ key: z.string(), value: z.string() })).optional().default([]),
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED', 'PARTIAL']).default('DRAFT'),
  overallDiscount: z.number().default(0),
  overallDiscountType: z.enum(['PERCENTAGE', 'AMOUNT']).default('PERCENTAGE'),
  cessRate: z.number().default(0),
  lineItems: z.array(invoiceLineItemSchema).min(1, 'At least one line item is required'),
});

// GET: Retrieve a single invoice with all details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        business: true,
        client: true,
        lineItems: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ invoice });
  } catch (error: any) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

// PUT: Update an existing invoice
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const { id } = await params;

    // Verify ownership and existence
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (existingInvoice.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = invoiceSchema.parse(body);

    // Verify business ownership
    const business = await prisma.business.findUnique({
      where: { id: validatedData.businessId },
    });

    if (!business || business.userId !== user.id) {
      return NextResponse.json(
        { error: 'Business profile not found or unauthorized' },
        { status: 404 }
      );
    }

    // Verify client ownership
    const client = await prisma.client.findUnique({
      where: { id: validatedData.clientId },
    });

    if (!client || client.userId !== user.id) {
      return NextResponse.json(
        { error: 'Client profile not found or unauthorized' },
        { status: 404 }
      );
    }

    // Check for duplicate invoice number (excluding current invoice)
    const duplicateInvoice = await prisma.invoice.findFirst({
      where: {
        userId: user.id,
        invoiceNumber: validatedData.invoiceNumber,
        id: { not: id },
      },
    });

    if (duplicateInvoice) {
      return NextResponse.json(
        { error: `Invoice number "${validatedData.invoiceNumber}" already exists on another invoice. Please choose a unique number.` },
        { status: 400 }
      );
    }

    // Calculate Taxes Server-Side (Intra-state vs Inter-state)
    const taxType = determineTaxType(business.state, validatedData.placeOfSupply);
    const isInterState = taxType === 'inter';

    const serverTotals = calculateInvoiceTotals(
      validatedData.lineItems,
      validatedData.overallDiscount,
      validatedData.overallDiscountType,
      isInterState,
      validatedData.cessRate
    );

    const itemCalculations = validatedData.lineItems.map((item) =>
      calculateLineItemTotal(item, isInterState)
    );

    // Update in DB transaction
    const updatedInvoice = await prisma.$transaction(async (tx) => {
      // 1. Delete existing line items
      await tx.invoiceLineItem.deleteMany({
        where: { invoiceId: id },
      });

      // 2. Update the main invoice record
      const invoice = await tx.invoice.update({
        where: { id },
        data: {
          invoiceNumber: validatedData.invoiceNumber,
          businessId: validatedData.businessId,
          clientId: validatedData.clientId,
          template: validatedData.template,
          currency: validatedData.currency,
          exchangeRate: validatedData.exchangeRate,
          issueDate: validatedData.issueDate,
          dueDate: validatedData.dueDate,
          placeOfSupply: validatedData.placeOfSupply,
          isInterState,
          reverseCharge: validatedData.reverseCharge,
          overallDiscount: validatedData.overallDiscount,
          overallDiscountType: validatedData.overallDiscountType,
          cessRate: validatedData.cessRate,
          subTotal: serverTotals.subTotal,
          discountTotal: serverTotals.discountTotal,
          taxableAmount: serverTotals.taxableAmount,
          cgstTotal: serverTotals.cgstTotal,
          sgstTotal: serverTotals.sgstTotal,
          igstTotal: serverTotals.igstTotal,
          cessTotal: serverTotals.cessTotal,
          roundOff: serverTotals.roundOff,
          grandTotal: serverTotals.grandTotal,
          notes: validatedData.notes || null,
          terms: validatedData.terms || null,
          customFields: validatedData.customFields || [],
          status: validatedData.status,
        },
      });

      // 3. Re-create new line items
      await Promise.all(
        itemCalculations.map((itemCalc, idx) => {
          const originalItem = validatedData.lineItems[idx];
          return tx.invoiceLineItem.create({
            data: {
              invoiceId: id,
              itemId: originalItem.itemId || null,
              description: originalItem.description,
              hsnCode: originalItem.hsnCode || null,
              quantity: originalItem.quantity,
              unit: originalItem.unit,
              rate: originalItem.rate,
              discount: originalItem.discount,
              discountType: originalItem.discountType,
              gstRate: originalItem.gstRate,
              cgstAmount: itemCalc.cgstAmount,
              sgstAmount: itemCalc.sgstAmount,
              igstAmount: itemCalc.igstAmount,
              taxableValue: itemCalc.taxableValue,
              totalAmount: itemCalc.totalAmount,
            },
          });
        })
      );

      return invoice;
    });

    return NextResponse.json({ invoice: updatedInvoice });
  } catch (error: any) {
    console.error('Error updating invoice:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update invoice' },
      { status: 500 }
    );
  }
}

// DELETE: Delete an invoice
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const { id } = await params;

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

    // Delete invoice (cascade will automatically delete lineItems)
    await prisma.invoice.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Invoice deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}
