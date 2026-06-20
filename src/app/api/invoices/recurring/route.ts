import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// Calculate the next due date based on frequency
function calculateNextDueDate(startDate: Date, frequency: string): Date {
  const next = new Date(startDate);
  if (frequency === 'WEEKLY') {
    next.setDate(next.getDate() + 7);
  } else if (frequency === 'MONTHLY') {
    next.setMonth(next.getMonth() + 1);
  } else if (frequency === 'QUARTERLY') {
    next.setMonth(next.getMonth() + 3);
  } else if (frequency === 'YEARLY') {
    next.setFullYear(next.getFullYear() + 1);
  }
  return next;
}

const itemSchema = z.object({
  description: z.string(),
  hsnCode: z.string().optional().nullable(),
  quantity: z.number(),
  unit: z.string().default('PCS'),
  rate: z.number(),
  discount: z.number().default(0),
  discountType: z.enum(['PERCENTAGE', 'AMOUNT']).default('PERCENTAGE'),
  gstRate: z.number().default(18),
});

const recurringCreateSchema = z.object({
  templateName: z.string().min(1, 'Template name is required'),
  clientId: z.string().min(1, 'Client is required'),
  businessId: z.string().min(1, 'Business is required'),
  recurringFrequency: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
  recurringStartDate: z.string(),
  recurringEndDate: z.string().optional().nullable(),
  generateFirstNow: z.boolean().default(false),
  
  // Blueprint details
  template: z.string().default('modern'),
  currency: z.string().default('INR'),
  placeOfSupply: z.string(),
  isInterState: z.boolean().default(false),
  reverseCharge: z.boolean().default(false),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  lineItems: z.array(itemSchema),
  
  // Totals
  subTotal: z.number(),
  discountTotal: z.number().default(0),
  taxableAmount: z.number(),
  cgstTotal: z.number().default(0),
  sgstTotal: z.number().default(0),
  igstTotal: z.number().default(0),
  cessTotal: z.number().default(0),
  roundOff: z.number().default(0),
  grandTotal: z.number(),
});

export async function GET() {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const templates = await prisma.invoice.findMany({
      where: {
        userId: user.id,
        isRecurringTemplate: true,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ templates }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching recurring templates:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const body = await request.json();
    const validatedData = recurringCreateSchema.parse(body);

    const startDate = new Date(validatedData.recurringStartDate);
    const endDate = validatedData.recurringEndDate ? new Date(validatedData.recurringEndDate) : null;
    
    // Default invoice number for the blueprint (just a placeholder)
    const blueprintInvoiceNumber = `TEMP-${Date.now()}`;

    // Determine initial nextDueDate
    let nextDueDate = startDate;
    if (validatedData.generateFirstNow) {
      // If we generate the first invoice now, the next run will be after one frequency cycle
      nextDueDate = calculateNextDueDate(startDate, validatedData.recurringFrequency);
    }

    // 1. Create the blueprint recurring template
    const template = await prisma.invoice.create({
      data: {
        userId: user.id,
        businessId: validatedData.businessId,
        clientId: validatedData.clientId,
        invoiceNumber: blueprintInvoiceNumber,
        isRecurring: true,
        isRecurringTemplate: true,
        templateName: validatedData.templateName,
        recurringFrequency: validatedData.recurringFrequency,
        recurringStartDate: startDate,
        recurringEndDate: endDate,
        nextDueDate,
        recurringStatus: 'ACTIVE',
        template: validatedData.template,
        currency: validatedData.currency,
        placeOfSupply: validatedData.placeOfSupply,
        isInterState: validatedData.isInterState,
        reverseCharge: validatedData.reverseCharge,
        notes: validatedData.notes,
        terms: validatedData.terms,
        subTotal: validatedData.subTotal,
        discountTotal: validatedData.discountTotal,
        taxableAmount: validatedData.taxableAmount,
        cgstTotal: validatedData.cgstTotal,
        sgstTotal: validatedData.sgstTotal,
        igstTotal: validatedData.igstTotal,
        cessTotal: validatedData.cessTotal,
        roundOff: validatedData.roundOff,
        grandTotal: validatedData.grandTotal,
        status: 'DRAFT', // Templates stay as draft
        dueDate: startDate, // placeholder
        lineItems: {
          create: validatedData.lineItems.map(item => ({
            description: item.description,
            hsnCode: item.hsnCode,
            quantity: item.quantity,
            unit: item.unit,
            rate: item.rate,
            discount: item.discount,
            discountType: item.discountType,
            gstRate: item.gstRate,
            taxableValue: item.quantity * item.rate, // placeholder
            totalAmount: item.quantity * item.rate, // placeholder
          })),
        },
      },
      include: {
        lineItems: true,
      },
    });

    // 2. If generateFirstNow is true, trigger immediate generation of first invoice
    if (validatedData.generateFirstNow) {
      const activeBiz = await prisma.business.findUnique({
        where: { id: validatedData.businessId },
      });

      const nextNum = activeBiz ? activeBiz.invoiceNumber : 1;
      const prefix = activeBiz ? activeBiz.invoicePrefix : 'INV';
      const year = activeBiz ? activeBiz.financialYear : `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}`;
      
      const formattedNum = `${prefix}/${year}/${String(nextNum).padStart(3, '0')}`;

      // Calculate invoice due date
      const dueDays = activeBiz ? activeBiz.defaultDueDateDays : 30;
      const invoiceDueDate = new Date();
      invoiceDueDate.setDate(invoiceDueDate.getDate() + dueDays);

      await prisma.invoice.create({
        data: {
          userId: user.id,
          businessId: validatedData.businessId,
          clientId: validatedData.clientId,
          invoiceNumber: formattedNum,
          parentInvoiceId: template.id,
          isRecurring: false,
          isRecurringTemplate: false,
          template: validatedData.template,
          currency: validatedData.currency,
          placeOfSupply: validatedData.placeOfSupply,
          isInterState: validatedData.isInterState,
          reverseCharge: validatedData.reverseCharge,
          notes: validatedData.notes,
          terms: validatedData.terms,
          subTotal: validatedData.subTotal,
          discountTotal: validatedData.discountTotal,
          taxableAmount: validatedData.taxableAmount,
          cgstTotal: validatedData.cgstTotal,
          sgstTotal: validatedData.sgstTotal,
          igstTotal: validatedData.igstTotal,
          cessTotal: validatedData.cessTotal,
          roundOff: validatedData.roundOff,
          grandTotal: validatedData.grandTotal,
          status: 'DRAFT',
          issueDate: new Date(),
          dueDate: invoiceDueDate,
          lineItems: {
            create: validatedData.lineItems.map(item => ({
              description: item.description,
              hsnCode: item.hsnCode,
              quantity: item.quantity,
              unit: item.unit,
              rate: item.rate,
              discount: item.discount,
              discountType: item.discountType,
              gstRate: item.gstRate,
              taxableValue: item.quantity * item.rate,
              totalAmount: item.quantity * item.rate,
            })),
          },
        },
      });

      // Increment business invoice counter
      if (activeBiz) {
        await prisma.business.update({
          where: { id: activeBiz.id },
          data: { invoiceNumber: nextNum + 1 },
        });
      }
    }

    return NextResponse.json({ template }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating recurring template:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message || 'Failed to create template' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const body = await request.json();
    const { id, action, templateName, recurringFrequency, recurringStartDate, recurringEndDate } = body;

    if (!id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    const template = await prisma.invoice.findUnique({ where: { id } });
    if (!template || template.userId !== user.id || !template.isRecurringTemplate) {
      return NextResponse.json({ error: 'Template not found or unauthorized' }, { status: 404 });
    }

    const updateData: any = {};

    if (action === 'pause') {
      updateData.recurringStatus = 'PAUSED';
    } else if (action === 'resume') {
      updateData.recurringStatus = 'ACTIVE';
    } else {
      // General update
      if (templateName) updateData.templateName = templateName;
      if (recurringFrequency) updateData.recurringFrequency = recurringFrequency;
      if (recurringStartDate) updateData.recurringStartDate = new Date(recurringStartDate);
      if (recurringEndDate !== undefined) {
        updateData.recurringEndDate = recurringEndDate ? new Date(recurringEndDate) : null;
      }
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ template: updated }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating template:', error);
    return NextResponse.json({ error: error.message || 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    const template = await prisma.invoice.findUnique({ where: { id } });
    if (!template || template.userId !== user.id || !template.isRecurringTemplate) {
      return NextResponse.json({ error: 'Template not found or unauthorized' }, { status: 404 });
    }

    await prisma.invoice.delete({ where: { id } });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ error: error.message || 'Delete failed' }, { status: 500 });
  }
}
