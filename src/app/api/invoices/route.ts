import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  determineTaxType,
  calculateLineItemTotal,
  calculateInvoiceTotals,
} from '@/lib/tax-engine';
import { generatePublicShareId, formatCurrency } from '@/lib/helpers';
import { getAuthUser } from '@/lib/auth';
import { sendInvoiceEmail } from '@/lib/email-service';
import { syncClientCounters } from '@/lib/db/invoice-hooks';
import { logClientActivity } from '@/lib/db/client-analytics';

// Zod schema for invoice line item validation
const invoiceLineItemSchema = z.object({
  itemId: z.string().optional().nullable(),
  description: z.string().min(1, 'Item description is required'),
  hsnCode: z.string().optional().nullable(),
  quantity: z.coerce.number().positive('Quantity must be greater than 0'),
  unit: z.string().default('PCS'),
  rate: z.coerce.number().min(0, 'Rate must be greater than or equal to 0'),
  discount: z.coerce.number().default(0),
  discountType: z.enum(['PERCENTAGE', 'AMOUNT']).default('PERCENTAGE'),
  gstRate: z.coerce.number().default(18),
});

// Zod schema for invoice validation
const invoiceSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  clientId: z.string().min(1, 'Client ID is required'),
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  template: z.string().default('modern'),
  currency: z.string().default('INR'),
  exchangeRate: z.coerce.number().default(1),
  issueDate: z.string().transform((val) => new Date(val)),
  dueDate: z.string().transform((val) => new Date(val)),
  placeOfSupply: z.string().min(1, 'Place of supply is required'),
  reverseCharge: z.boolean().default(false),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  customFields: z.array(z.object({ key: z.string(), value: z.string() })).optional().default([]),
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED', 'PARTIAL']).default('DRAFT'),
  overallDiscount: z.coerce.number().default(0),
  overallDiscountType: z.enum(['PERCENTAGE', 'AMOUNT']).default('PERCENTAGE'),
  cessRate: z.coerce.number().default(0),
  lineItems: z.array(invoiceLineItemSchema).min(1, 'At least one line item is required'),
});

// POST: Create a new invoice
export async function POST(request: NextRequest) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const body = await request.json();

    const validatedData = invoiceSchema.parse(body);

    // 1. Fetch active business to compare states
    const business = await prisma.business.findUnique({
      where: { id: validatedData.businessId },
    });

    if (!business || business.userId !== user.id) {
      return NextResponse.json(
        { error: 'Business profile not found or unauthorized' },
        { status: 404 }
      );
    }

    // 2. Fetch selected client to verify ownership
    const client = await prisma.client.findUnique({
      where: { id: validatedData.clientId },
    });

    if (!client || client.userId !== user.id) {
      return NextResponse.json(
        { error: 'Client profile not found or unauthorized' },
        { status: 404 }
      );
    }

    // 3. Check for unique invoice number
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        userId: user.id,
        invoiceNumber: validatedData.invoiceNumber,
      },
    });

    if (existingInvoice) {
      return NextResponse.json(
        { error: `Invoice number "${validatedData.invoiceNumber}" already exists. Please choose a unique number.` },
        { status: 400 }
      );
    }

    // 4. Calculate Taxes Server-Side (Intra-state vs Inter-state)
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

    // 5. Generate a unique publicShareId
    const publicShareId = generatePublicShareId();

    // 6. DB Transaction creation
    const createdInvoice = await prisma.$transaction(async (tx) => {
      // Create Invoice
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber: validatedData.invoiceNumber,
          userId: user.id,
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
          publicShareId,
        },
      });

      // Create Line Items
      await Promise.all(
        itemCalculations.map((itemCalc, idx) => {
          const originalItem = validatedData.lineItems[idx];
          return tx.invoiceLineItem.create({
            data: {
              invoiceId: invoice.id,
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

      // Increment business invoice counter if the generated invoice number matches
      // the business's formatting convention
      await tx.business.update({
        where: { id: validatedData.businessId },
        data: {
          invoiceNumber: { increment: 1 },
        },
      });

      return invoice;
    });

    // 7. Auto-send email to client if invoice status is SENT and client has an email
    if (createdInvoice.status === 'SENT' && client.email) {
      try {
        const amountStr = formatCurrency(Number(createdInvoice.grandTotal), createdInvoice.currency);
        const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const shareLink = `${origin}/i/${createdInvoice.publicShareId}`;
        
        const subject = `Invoice ${createdInvoice.invoiceNumber} from ${business.name}`;
        const message = 
          `Hello ${client.name},<br /><br />` +
          `Please find attached our invoice ${createdInvoice.invoiceNumber} for ${amountStr}.<br /><br />` +
          `You can also view and pay the invoice online here: <a href="${shareLink}">${shareLink}</a><br /><br />` +
          `Thank you for your business!<br /><br />` +
          `Best regards,<br />` +
          `${business.name}`;

        await sendInvoiceEmail(createdInvoice.id, client.email, subject, message);
      } catch (emailErr: any) {
        console.error('[INVOICE POST API] Failed to auto-send email on creation:', emailErr.message);
      }
    }
    // Sync client counters and log activity
    try {
      await syncClientCounters(createdInvoice.clientId, user.id);
      await logClientActivity({
        clientId: createdInvoice.clientId,
        userId: user.id,
        action: 'INVOICE_CREATED',
        details: `Invoice ${createdInvoice.invoiceNumber} created for ${formatCurrency(Number(createdInvoice.grandTotal), createdInvoice.currency)}`,
        amount: Number(createdInvoice.grandTotal),
      });
    } catch (syncErr) {
      console.error('[INVOICE POST API] Failed to sync client counters or log activity:', syncErr);
    }

    return NextResponse.json({ invoice: createdInvoice }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create invoice' },
      { status: 500 }
    );
  }
}

// GET: List invoices with filtering, search, and pagination
export async function GET(request: NextRequest) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const searchParams = request.nextUrl.searchParams;

    const status = searchParams.get('status') || 'ALL';
    const clientId = searchParams.get('clientId');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    let businessId = searchParams.get('businessId');
    if (businessId) {
      businessId = businessId.replace(/^"|"$/g, '');
      if (businessId === 'null' || businessId === 'undefined') {
        businessId = null;
      }
    }
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const where: any = { userId: user.id };

    // Filter by business profile
    if (businessId && businessId !== 'all') {
      where.businessId = businessId;
    }

    // Filter by status (unless 'ALL')
    if (status !== 'ALL') {
      where.status = status;
    }

    // Filter by client
    if (clientId) {
      where.clientId = clientId;
    }

    // Filter by date range
    if (dateFrom || dateTo) {
      where.issueDate = {};
      if (dateFrom) {
        where.issueDate.gte = new Date(dateFrom);
      }
      if (dateTo) {
        // Extend to end of day
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        where.issueDate.lte = toDate;
      }
    }

    // Full text search by invoice number or client name
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Fetch count
    const total = await prisma.invoice.count({ where });

    // Fetch paginated invoices
    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        issueDate: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      invoices,
      total,
      page,
      limit,
    });
  } catch (error: any) {
    console.error('Error listing invoices:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}
