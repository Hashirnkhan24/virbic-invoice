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
    
    let startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : null;
    let endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : null;

    if (!startDate || !endDate) {
      const defaultDates = getFinancialYearDates();
      if (!startDate) startDate = defaultDates.startDate;
      if (!endDate) endDate = defaultDates.endDate;
    }

    const whereCondition: any = {
      userId: user.id,
      issueDate: {
        gte: startDate,
        lte: endDate,
      },
      status: {
        notIn: ['DRAFT', 'CANCELLED'],
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
        issueDate: 'asc',
      },
    });

    let totalBilled = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    
    let totalDaysToPay = 0;
    let paidInvoicesCount = 0;

    // Client-level receivables grouping for "Top Debtors"
    const clientDebtMap: Record<string, { clientId: string; clientName: string; billed: number; collected: number; outstanding: number; overdueCount: number }> = {};

    const today = new Date();
    const daysInPeriod = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

    invoices.forEach((inv) => {
      const grandTotalINR = convertCurrency(Number(inv.grandTotal), inv.currency, 'INR');
      const amountPaidINR = convertCurrency(Number(inv.amountPaid), inv.currency, 'INR');
      const outstandingINR = Math.max(0, grandTotalINR - amountPaidINR);

      totalBilled += grandTotalINR;
      totalCollected += amountPaidINR;
      totalOutstanding += outstandingINR;

      // Days to pay calculation
      if (inv.status === 'PAID' || (inv.status === 'PARTIAL' && Number(inv.amountPaid) > 0)) {
        const paymentDate = inv.paidAt || inv.updatedAt;
        const timeDiff = paymentDate.getTime() - inv.issueDate.getTime();
        const daysDiff = Math.max(0, Math.round(timeDiff / (1000 * 60 * 60 * 24)));
        totalDaysToPay += daysDiff;
        paidInvoicesCount++;
      }

      // Group by client
      const clientId = inv.clientId;
      if (!clientDebtMap[clientId]) {
        clientDebtMap[clientId] = {
          clientId,
          clientName: inv.client.name,
          billed: 0,
          collected: 0,
          outstanding: 0,
          overdueCount: 0,
        };
      }
      clientDebtMap[clientId].billed += grandTotalINR;
      clientDebtMap[clientId].collected += amountPaidINR;
      clientDebtMap[clientId].outstanding += outstandingINR;

      const isOverdue = inv.status === 'OVERDUE' || 
        ((inv.status === 'SENT' || inv.status === 'PARTIAL') && new Date(inv.dueDate) < today);

      if (isOverdue && outstandingINR > 0) {
        clientDebtMap[clientId].overdueCount++;
      }
    });

    // Collection Efficiency Index (CEI)
    const cei = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 100;

    // Days Sales Outstanding (DSO) = (Total Outstanding / Total Billed) * daysInPeriod
    const dso = totalBilled > 0 ? (totalOutstanding / totalBilled) * daysInPeriod : 0;

    // Average Days to Pay
    const avgDaysToPay = paidInvoicesCount > 0 ? totalDaysToPay / paidInvoicesCount : 0;

    // Sort and get top debtors (clients with outstanding amount > 0)
    const topDebtors = Object.values(clientDebtMap)
      .filter((c) => c.outstanding > 0)
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 5) // limit to top 5
      .map((c) => ({
        clientId: c.clientId,
        clientName: c.clientName,
        billed: Math.round(c.billed),
        collected: Math.round(c.collected),
        outstanding: Math.round(c.outstanding),
        overdueCount: c.overdueCount,
      }));

    return NextResponse.json({
      metrics: {
        totalBilled: Math.round(totalBilled),
        totalCollected: Math.round(totalCollected),
        totalOutstanding: Math.round(totalOutstanding),
        cei: Number(cei.toFixed(1)),
        dso: Number(dso.toFixed(1)),
        avgDaysToPay: Number(avgDaysToPay.toFixed(1)),
        paidCount: paidInvoicesCount,
      },
      topDebtors,
    });
  } catch (err: any) {
    console.error('[API_REPORTS_COLLECTION] Error:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
