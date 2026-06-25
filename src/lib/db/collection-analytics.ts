import { prisma } from '../prisma';
import { startOfMonth, endOfMonth, subMonths, differenceInDays } from 'date-fns';
import { convertCurrency } from '../currency';

export async function getCollectionDashboardMetrics(userId: string, businessId?: string) {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  // Determine business scope filter
  const isScoped = businessId && businessId !== 'all';
  const baseFilter = isScoped ? { userId, businessId } : { userId };

  // --- THIS MONTH METRICS ---
  const [thisMonthBilledAgg, thisMonthCollectedAgg, outstandingAgg, totalInvoices] = await Promise.all([
    // Total BILLED this month (sum of grandTotal for invoices issued this month, any status except draft/cancelled)
    prisma.invoice.findMany({
      where: {
        ...baseFilter,
        issueDate: { gte: thisMonthStart, lte: thisMonthEnd },
        status: { notIn: ['DRAFT', 'CANCELLED'] }
      },
      select: { grandTotal: true, currency: true }
    }),
    // Total COLLECTED this month (sum of amount on payments where paidAt is this month)
    prisma.payment.findMany({
      where: {
        userId,
        ...(isScoped ? { invoice: { businessId } } : {}),
        paidAt: { gte: thisMonthStart, lte: thisMonthEnd },
        status: { in: ['CONFIRMED', 'PENDING'] }
      },
      select: { amount: true, invoice: { select: { currency: true } } }
    }),
    // Total OUTSTANDING right now (all non-draft, non-cancelled, non-paid invoices)
    prisma.invoice.findMany({
      where: {
        ...baseFilter,
        status: { in: ['SENT', 'OVERDUE', 'PARTIAL'] }
      },
      select: { grandTotal: true, amountPaid: true, currency: true }
    }),
    // Total invoices issued this month
    prisma.invoice.count({
      where: {
        ...baseFilter,
        issueDate: { gte: thisMonthStart, lte: thisMonthEnd },
        status: { notIn: ['DRAFT', 'CANCELLED'] }
      }
    })
  ]);

  // Convert and sum in INR
  const thisMonthBilled = thisMonthBilledAgg.reduce(
    (sum, inv) => sum + convertCurrency(Number(inv.grandTotal), inv.currency, 'INR'),
    0
  );

  const thisMonthCollected = thisMonthCollectedAgg.reduce(
    (sum, pay) => sum + convertCurrency(Number(pay.amount), pay.invoice.currency, 'INR'),
    0
  );

  const totalOutstandingGrand = outstandingAgg.reduce(
    (sum, inv) => sum + convertCurrency(Number(inv.grandTotal), inv.currency, 'INR'),
    0
  );

  const totalOutstandingPaid = outstandingAgg.reduce(
    (sum, inv) => sum + convertCurrency(Number(inv.amountPaid), inv.currency, 'INR'),
    0
  );

  const outstandingAmount = Math.max(0, totalOutstandingGrand - totalOutstandingPaid);

  // --- LAST MONTH (for comparison) ---
  const [lastMonthBilledAgg, lastMonthCollectedAgg] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        ...baseFilter,
        issueDate: { gte: lastMonthStart, lte: lastMonthEnd },
        status: { notIn: ['DRAFT', 'CANCELLED'] }
      },
      select: { grandTotal: true, currency: true }
    }),
    prisma.payment.findMany({
      where: {
        userId,
        ...(isScoped ? { invoice: { businessId } } : {}),
        paidAt: { gte: lastMonthStart, lte: lastMonthEnd },
        status: { in: ['CONFIRMED', 'PENDING'] }
      },
      select: { amount: true, invoice: { select: { currency: true } } }
    })
  ]);

  const lastMonthBilled = lastMonthBilledAgg.reduce(
    (sum, inv) => sum + convertCurrency(Number(inv.grandTotal), inv.currency, 'INR'),
    0
  );

  const lastMonthCollected = lastMonthCollectedAgg.reduce(
    (sum, pay) => sum + convertCurrency(Number(pay.amount), pay.invoice.currency, 'INR'),
    0
  );

  // --- COLLECTION RATE (ALL-TIME) ---
  const allTimeInvoices = await prisma.invoice.findMany({
    where: {
      ...baseFilter,
      status: { notIn: ['DRAFT', 'CANCELLED'] }
    },
    select: { grandTotal: true, amountPaid: true, currency: true }
  });

  const allTimeGrand = allTimeInvoices.reduce(
    (sum, inv) => sum + convertCurrency(Number(inv.grandTotal), inv.currency, 'INR'),
    0
  );

  const allTimePaid = allTimeInvoices.reduce(
    (sum, inv) => sum + convertCurrency(Number(inv.amountPaid), inv.currency, 'INR'),
    0
  );

  const collectionRate = allTimeGrand > 0
    ? Number(((allTimePaid / allTimeGrand) * 100).toFixed(1))
    : 0;

  // --- AVERAGE PAYMENT TIME ---
  const paidInvoices = await prisma.invoice.findMany({
    where: {
      ...baseFilter,
      status: 'PAID',
      paidAt: { not: null }
    },
    select: { issueDate: true, paidAt: true }
  });

  const avgPaymentDays = paidInvoices.length > 0
    ? paidInvoices.reduce((sum, inv) => {
        return sum + differenceInDays(new Date(inv.paidAt!), new Date(inv.issueDate));
      }, 0) / paidInvoices.length
    : 0;

  // --- OVERDUE COUNT ---
  const overdueCount = await prisma.invoice.count({
    where: {
      ...baseFilter,
      OR: [
        { status: 'OVERDUE' },
        {
          status: { in: ['SENT', 'PARTIAL'] },
          dueDate: { lt: now }
        }
      ]
    }
  });

  // --- TOP OUTSTANDING INVOICES ---
  const topOutstandingRaw = await prisma.invoice.findMany({
    where: {
      ...baseFilter,
      status: { in: ['SENT', 'OVERDUE', 'PARTIAL'] }
    },
    include: { client: { select: { name: true, email: true, phone: true } } },
    orderBy: { grandTotal: 'desc' }
  });

  // Convert grandTotal and amountPaid to INR for sorting & UI display, then take top 5
  const topOutstanding = topOutstandingRaw
    .map(inv => {
      const grandTotalINR = convertCurrency(Number(inv.grandTotal), inv.currency, 'INR');
      const amountPaidINR = convertCurrency(Number(inv.amountPaid), inv.currency, 'INR');
      return {
        ...inv,
        grandTotalINR,
        amountPaidINR,
        outstandingINR: Math.max(0, grandTotalINR - amountPaidINR)
      };
    })
    .sort((a, b) => b.outstandingINR - a.outstandingINR)
    .slice(0, 5);

  // --- MONTHLY TREND (last 6 months) ---
  const monthlyTrend = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(now, i));
    const monthEnd = endOfMonth(subMonths(now, i));

    const [monthBilledAgg, monthCollectedAgg] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          ...baseFilter,
          issueDate: { gte: monthStart, lte: monthEnd },
          status: { notIn: ['DRAFT', 'CANCELLED'] }
        },
        select: { grandTotal: true, currency: true }
      }),
      prisma.payment.findMany({
        where: {
          userId,
          ...(isScoped ? { invoice: { businessId } } : {}),
          paidAt: { gte: monthStart, lte: monthEnd },
          status: { in: ['CONFIRMED', 'PENDING'] }
        },
        select: { amount: true, invoice: { select: { currency: true } } }
      })
    ]);

    const monthBilled = monthBilledAgg.reduce(
      (sum, inv) => sum + convertCurrency(Number(inv.grandTotal), inv.currency, 'INR'),
      0
    );

    const monthCollected = monthCollectedAgg.reduce(
      (sum, pay) => sum + convertCurrency(Number(pay.amount), pay.invoice.currency, 'INR'),
      0
    );

    monthlyTrend.push({
      month: monthStart.toLocaleString('en-IN', { month: 'short' }),
      billed: Math.round(monthBilled),
      collected: Math.round(monthCollected)
    });
  }

  // --- WHO OWES YOU (Outstanding by Client) ---
  const allOutstandingForClients = await prisma.invoice.findMany({
    where: {
      ...baseFilter,
      status: { in: ['SENT', 'OVERDUE', 'PARTIAL'] }
    },
    include: { client: { select: { name: true } } }
  });

  const clientOutstandingMap = new Map<string, { name: string; outstanding: number; ageMaxDays: number }>();
  allOutstandingForClients.forEach(inv => {
    const unpaidValue = Number(inv.grandTotal) - Number(inv.amountPaid);
    const convertedVal = convertCurrency(unpaidValue, inv.currency, 'INR');
    const ageDays = differenceInDays(now, new Date(inv.dueDate));

    const existing = clientOutstandingMap.get(inv.clientId) || {
      name: inv.client.name,
      outstanding: 0,
      ageMaxDays: 0
    };

    clientOutstandingMap.set(inv.clientId, {
      name: inv.client.name,
      outstanding: existing.outstanding + convertedVal,
      ageMaxDays: Math.max(existing.ageMaxDays, ageDays)
    });
  });

  const clientOutstanding = Array.from(clientOutstandingMap.values())
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 5);

  return {
    thisMonthBilled,
    thisMonthCollected,
    outstandingAmount,
    collectionRate,
    avgPaymentDays: Math.round(avgPaymentDays),
    overdueCount,
    invoiceCount: totalInvoices,

    // Trends vs last month
    billedChange: lastMonthBilled > 0
      ? ((thisMonthBilled - lastMonthBilled) / lastMonthBilled) * 100
      : 0,
    collectedChange: lastMonthCollected > 0
      ? ((thisMonthCollected - lastMonthCollected) / lastMonthCollected) * 100
      : 0,

    // Lists & trends
    topOutstanding,
    monthlyTrend,
    clientOutstanding
  };
}
