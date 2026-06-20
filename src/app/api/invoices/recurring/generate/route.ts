import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(request: NextRequest) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    // 1. Fetch template
    const template = await prisma.invoice.findUnique({
      where: { id },
      include: {
        lineItems: true,
      },
    });

    if (!template || template.userId !== user.id || !template.isRecurringTemplate) {
      return NextResponse.json({ error: 'Template not found or unauthorized' }, { status: 404 });
    }

    // 2. Fetch business for invoice numbering defaults
    const activeBiz = await prisma.business.findUnique({
      where: { id: template.businessId },
    });

    const nextNum = activeBiz ? activeBiz.invoiceNumber : 1;
    const prefix = activeBiz ? activeBiz.invoicePrefix : 'INV';
    const year = activeBiz ? activeBiz.financialYear : `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}`;
    
    const formattedNum = `${prefix}/${year}/${String(nextNum).padStart(3, '0')}`;

    // 3. Calculate invoice due date
    const dueDays = activeBiz ? activeBiz.defaultDueDateDays : 30;
    const invoiceDueDate = new Date();
    invoiceDueDate.setDate(invoiceDueDate.getDate() + dueDays);

    // 4. Create new cloned invoice
    const newInvoice = await prisma.invoice.create({
      data: {
        userId: user.id,
        businessId: template.businessId,
        clientId: template.clientId,
        invoiceNumber: formattedNum,
        parentInvoiceId: template.id,
        isRecurring: false,
        isRecurringTemplate: false,
        template: template.template,
        currency: template.currency,
        placeOfSupply: template.placeOfSupply,
        isInterState: template.isInterState,
        reverseCharge: template.reverseCharge,
        notes: template.notes,
        terms: template.terms,
        subTotal: template.subTotal,
        discountTotal: template.discountTotal,
        taxableAmount: template.taxableAmount,
        cgstTotal: template.cgstTotal,
        sgstTotal: template.sgstTotal,
        igstTotal: template.igstTotal,
        cessTotal: template.cessTotal,
        roundOff: template.roundOff,
        grandTotal: template.grandTotal,
        status: 'DRAFT',
        issueDate: new Date(),
        dueDate: invoiceDueDate,
        lineItems: {
          create: template.lineItems.map(item => ({
            description: item.description,
            hsnCode: item.hsnCode,
            quantity: item.quantity,
            unit: item.unit,
            rate: item.rate,
            discount: item.discount,
            discountType: item.discountType,
            gstRate: item.gstRate,
            taxableValue: item.taxableValue,
            totalAmount: item.totalAmount,
          })),
        },
      },
    });

    // 5. Update nextDueDate for template
    const currentNextRun = template.nextDueDate || new Date();
    const updatedNextRun = calculateNextDueDate(currentNextRun, template.recurringFrequency || 'MONTHLY');

    await prisma.invoice.update({
      where: { id: template.id },
      data: { nextDueDate: updatedNextRun },
    });

    // 6. Increment business invoice counter
    if (activeBiz) {
      await prisma.business.update({
        where: { id: activeBiz.id },
        data: { invoiceNumber: nextNum + 1 },
      });
    }

    return NextResponse.json({ invoice: newInvoice }, { status: 201 });
  } catch (error: any) {
    console.error('Error generating invoice manually:', error);
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 });
  }
}
