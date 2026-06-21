import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { convertCurrency } from '@/lib/currency';

export async function GET(request: NextRequest) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;

    const searchParams = request.nextUrl.searchParams;
    let businessId = searchParams.get('businessId');
    if (businessId) {
      businessId = businessId.replace(/^"|"$/g, '');
      if (businessId === 'null' || businessId === 'undefined') {
        businessId = null;
      }
    }

    const whereCondition: any = {
      userId: user.id,
      status: {
        in: ['SENT', 'PARTIAL', 'OVERDUE'],
      },
    };

    if (businessId && businessId !== 'all') {
      whereCondition.businessId = businessId;
    }

    const invoices = await prisma.invoice.findMany({
      where: whereCondition,
      include: {
        client: true,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Initialize aging buckets
    const buckets = {
      notDue: {
        label: 'Not Due',
        totalOutstanding: 0,
        invoiceCount: 0,
        invoices: [] as any[],
      },
      aging1to30: {
        label: '1 - 30 Days Overdue',
        totalOutstanding: 0,
        invoiceCount: 0,
        invoices: [] as any[],
      },
      aging31to60: {
        label: '31 - 60 Days Overdue',
        totalOutstanding: 0,
        invoiceCount: 0,
        invoices: [] as any[],
      },
      aging61to90: {
        label: '61 - 90 Days Overdue',
        totalOutstanding: 0,
        invoiceCount: 0,
        invoices: [] as any[],
      },
      aging90Plus: {
        label: '90+ Days Overdue',
        totalOutstanding: 0,
        invoiceCount: 0,
        invoices: [] as any[],
      },
    };

    invoices.forEach((inv) => {
      const grandTotalINR = convertCurrency(Number(inv.grandTotal), inv.currency, 'INR');
      const amountPaidINR = convertCurrency(Number(inv.amountPaid), inv.currency, 'INR');
      const outstandingINR = Math.max(0, grandTotalINR - amountPaidINR);

      if (outstandingINR <= 0) return; // double check

      const dueDate = new Date(inv.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      const invData = {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.client.name,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        grandTotal: Math.round(grandTotalINR),
        amountPaid: Math.round(amountPaidINR),
        outstandingAmount: Math.round(outstandingINR),
        daysOverdue: 0,
      };

      if (dueDate >= today) {
        buckets.notDue.totalOutstanding += outstandingINR;
        buckets.notDue.invoiceCount++;
        buckets.notDue.invoices.push(invData);
      } else {
        const timeDiff = today.getTime() - dueDate.getTime();
        const daysOverdue = Math.max(1, Math.round(timeDiff / (1000 * 60 * 60 * 24)));
        invData.daysOverdue = daysOverdue;

        if (daysOverdue <= 30) {
          buckets.aging1to30.totalOutstanding += outstandingINR;
          buckets.aging1to30.invoiceCount++;
          buckets.aging1to30.invoices.push(invData);
        } else if (daysOverdue <= 60) {
          buckets.aging31to60.totalOutstanding += outstandingINR;
          buckets.aging31to60.invoiceCount++;
          buckets.aging31to60.invoices.push(invData);
        } else if (daysOverdue <= 90) {
          buckets.aging61to90.totalOutstanding += outstandingINR;
          buckets.aging61to90.invoiceCount++;
          buckets.aging61to90.invoices.push(invData);
        } else {
          buckets.aging90Plus.totalOutstanding += outstandingINR;
          buckets.aging90Plus.invoiceCount++;
          buckets.aging90Plus.invoices.push(invData);
        }
      }
    });

    // Round total outstanding amounts
    buckets.notDue.totalOutstanding = Math.round(buckets.notDue.totalOutstanding);
    buckets.aging1to30.totalOutstanding = Math.round(buckets.aging1to30.totalOutstanding);
    buckets.aging31to60.totalOutstanding = Math.round(buckets.aging31to60.totalOutstanding);
    buckets.aging61to90.totalOutstanding = Math.round(buckets.aging61to90.totalOutstanding);
    buckets.aging90Plus.totalOutstanding = Math.round(buckets.aging90Plus.totalOutstanding);

    // Calculate total accounts receivable outstanding
    const totalAR = 
      buckets.notDue.totalOutstanding +
      buckets.aging1to30.totalOutstanding +
      buckets.aging31to60.totalOutstanding +
      buckets.aging61to90.totalOutstanding +
      buckets.aging90Plus.totalOutstanding;

    return NextResponse.json({
      totalReceivables: totalAR,
      buckets,
    });
  } catch (err: any) {
    console.error('[API_REPORTS_AGING] Error:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
