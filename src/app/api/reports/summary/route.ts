import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { convertCurrency } from '@/lib/currency';

function getFinancialYearDates() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0 = Jan, 3 = April
  let startYear = year;
  if (month < 3) {
    startYear = year - 1;
  }
  const startDate = new Date(startYear, 3, 1); // April 1st
  const endDate = new Date(startYear + 1, 2, 31, 23, 59, 59, 999); // March 31st
  return { startDate, endDate };
}

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
    
    // Date filter parsing
    let startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : null;
    let endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : null;

    if (!startDate || !endDate) {
      const defaultDates = getFinancialYearDates();
      if (!startDate) startDate = defaultDates.startDate;
      if (!endDate) endDate = defaultDates.endDate;
    }

    // Build Prisma query condition
    const whereCondition: any = {
      userId: user.id,
      issueDate: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (businessId && businessId !== 'all') {
      whereCondition.businessId = businessId;
    }

    // Fetch invoices in date range
    const invoices = await prisma.invoice.findMany({
      where: whereCondition,
      orderBy: {
        issueDate: 'asc',
      },
    });

    // Compute aggregations (standardized to INR for reporting)
    let totalRevenueBilled = 0;
    let totalRevenueCollected = 0;
    let invoiceCount = 0;
    
    // Status breakdowns
    let paidCount = 0;
    let partialCount = 0;
    let sentCount = 0;
    let overdueCount = 0;
    let draftCount = 0;
    let cancelledCount = 0;

    const today = new Date();

    invoices.forEach((inv) => {
      if (inv.status === 'DRAFT') {
        draftCount++;
        return; // Exclude drafts from financial revenue calculations
      }
      if (inv.status === 'CANCELLED') {
        cancelledCount++;
        return; // Exclude cancelled from active revenue calculations
      }

      invoiceCount++;

      const grandTotalINR = convertCurrency(Number(inv.grandTotal), inv.currency, 'INR');
      const amountPaidINR = convertCurrency(Number(inv.amountPaid), inv.currency, 'INR');

      totalRevenueBilled += grandTotalINR;
      totalRevenueCollected += amountPaidINR;

      // Status counters
      if (inv.status === 'PAID') {
        paidCount++;
      } else if (inv.status === 'PARTIAL') {
        partialCount++;
      } else if (inv.status === 'OVERDUE' || (new Date(inv.dueDate) < today)) {
        overdueCount++;
      } else if (inv.status === 'SENT') {
        sentCount++;
      }
    });

    const totalOutstanding = Math.max(0, totalRevenueBilled - totalRevenueCollected);
    const averageInvoiceValue = invoiceCount > 0 ? totalRevenueBilled / invoiceCount : 0;

    // Monthly chart data generation
    // Group invoices by month
    const monthlyDataMap: Record<string, { month: string; billed: number; collected: number; yearNum: number; monthNum: number }> = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Initialize all months in the date range to 0 to avoid gaps
    const iterDate = new Date(startDate);
    while (iterDate <= endDate) {
      const monthLabel = `${monthNames[iterDate.getMonth()]} ${String(iterDate.getFullYear()).slice(-2)}`;
      const key = `${iterDate.getFullYear()}-${String(iterDate.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyDataMap[key]) {
        monthlyDataMap[key] = {
          month: monthLabel,
          billed: 0,
          collected: 0,
          yearNum: iterDate.getFullYear(),
          monthNum: iterDate.getMonth(),
        };
      }
      // Add 1 month
      iterDate.setMonth(iterDate.getMonth() + 1);
    }

    // Populate data
    invoices.forEach((inv) => {
      if (inv.status === 'DRAFT' || inv.status === 'CANCELLED') return;
      
      const invDate = new Date(inv.issueDate);
      const key = `${invDate.getFullYear()}-${String(invDate.getMonth() + 1).padStart(2, '0')}`;
      
      const grandTotalINR = convertCurrency(Number(inv.grandTotal), inv.currency, 'INR');
      const amountPaidINR = convertCurrency(Number(inv.amountPaid), inv.currency, 'INR');

      if (monthlyDataMap[key]) {
        monthlyDataMap[key].billed += grandTotalINR;
        monthlyDataMap[key].collected += amountPaidINR;
      } else {
        // Fallback if iterDate loop didn't catch it
        const monthLabel = `${monthNames[invDate.getMonth()]} ${String(invDate.getFullYear()).slice(-2)}`;
        monthlyDataMap[key] = {
          month: monthLabel,
          billed: grandTotalINR,
          collected: amountPaidINR,
          yearNum: invDate.getFullYear(),
          monthNum: invDate.getMonth(),
        };
      }
    });

    // Sort by chronological order
    const monthlyTrends = Object.values(monthlyDataMap)
      .sort((a, b) => {
        if (a.yearNum !== b.yearNum) return a.yearNum - b.yearNum;
        return a.monthNum - b.monthNum;
      })
      .map((item) => ({
        month: item.month,
        billed: Math.round(item.billed),
        collected: Math.round(item.collected),
      }));

    return NextResponse.json({
      summary: {
        totalRevenueBilled: Math.round(totalRevenueBilled),
        totalRevenueCollected: Math.round(totalRevenueCollected),
        totalOutstanding: Math.round(totalOutstanding),
        averageInvoiceValue: Math.round(averageInvoiceValue),
        invoiceCount,
      },
      statusDistribution: [
        { name: 'Paid', value: paidCount, color: '#10b981' },
        { name: 'Partial', value: partialCount, color: '#06b6d4' },
        { name: 'Sent / Pending', value: sentCount, color: '#f59e0b' },
        { name: 'Overdue', value: overdueCount, color: '#ef4444' },
        { name: 'Draft', value: draftCount, color: '#64748b' },
        { name: 'Cancelled', value: cancelledCount, color: '#dc2626' },
      ],
      monthlyTrends,
    });
  } catch (err: any) {
    console.error('[API_REPORTS_SUMMARY] Error:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
