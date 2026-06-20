import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

export async function GET(request: NextRequest) {
  try {
    // 1. Verify cron authorization secret
    const authHeader = request.headers.get('Authorization');
    const secret = process.env.CRON_SECRET || 'virbic-cron-secret-123';
    
    if (!authHeader || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999); // capture anything due today

    // 2. Fetch all active recurring templates whose nextDueDate is <= today
    const templates = await prisma.invoice.findMany({
      where: {
        isRecurringTemplate: true,
        recurringStatus: 'ACTIVE',
        nextDueDate: { lte: today },
        OR: [
          { recurringEndDate: null },
          { recurringEndDate: { gte: new Date() } },
        ],
      },
      include: {
        lineItems: true,
      },
    });

    let generatedCount = 0;
    const results = [];

    for (const template of templates) {
      // Fetch business to get next invoice number series
      const activeBiz = await prisma.business.findUnique({
        where: { id: template.businessId },
      });

      const nextNum = activeBiz ? activeBiz.invoiceNumber : 1;
      const prefix = activeBiz ? activeBiz.invoicePrefix : 'INV';
      const year = activeBiz ? activeBiz.financialYear : `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}`;
      
      const formattedNum = `${prefix}/${year}/${String(nextNum).padStart(3, '0')}`;

      // Calculate invoice due date
      const dueDays = activeBiz ? activeBiz.defaultDueDateDays : 30;
      const invoiceDueDate = new Date();
      invoiceDueDate.setDate(invoiceDueDate.getDate() + dueDays);

      // Create cloned invoice
      const invoice = await prisma.invoice.create({
        data: {
          userId: template.userId,
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

      // Update business numbering series
      if (activeBiz) {
        await prisma.business.update({
          where: { id: activeBiz.id },
          data: { invoiceNumber: nextNum + 1 },
        });
      }

      // Calculate next due date for the template
      const currentNextRun = template.nextDueDate || new Date();
      const updatedNextRun = calculateNextDueDate(currentNextRun, template.recurringFrequency || 'MONTHLY');

      // Update template next run date
      await prisma.invoice.update({
        where: { id: template.id },
        data: {
          nextDueDate: updatedNextRun,
        },
      });

      generatedCount++;
      results.push({
        templateId: template.id,
        templateName: template.templateName,
        generatedInvoiceId: invoice.id,
        invoiceNumber: formattedNum,
      });
    }

    return NextResponse.json({
      success: true,
      processed: templates.length,
      generated: generatedCount,
      details: results,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error in recurring invoice generator CRON:', error);
    return NextResponse.json({ error: error.message || 'Cron execution failed' }, { status: 500 });
  }
}
