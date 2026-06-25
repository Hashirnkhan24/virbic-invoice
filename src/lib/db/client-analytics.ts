import { prisma } from '@/lib/prisma';
import { convertCurrency } from '@/lib/currency';

// Compute real-time client financials from invoices
export async function getClientFinancials(clientId: string, userId: string, businessId?: string) {
  // Verify ownership
  const client = await prisma.client.findFirst({
    where: { id: clientId, userId }
  });
  if (!client) throw new Error('Client not found');

  const baseWhere = businessId && businessId !== 'all'
    ? { clientId, userId, businessId }
    : { clientId, userId };

  const [invoices, totalInvoices, lastInvoice] = await Promise.all([
    // Fetch all non-draft, non-cancelled invoices for summing billed and outstanding
    prisma.invoice.findMany({
      where: {
        ...baseWhere,
        status: { notIn: ['DRAFT', 'CANCELLED'] }
      },
      select: {
        grandTotal: true,
        amountPaid: true,
        currency: true,
        status: true
      }
    }),
    // Total invoice count
    prisma.invoice.count({
      where: baseWhere
    }),
    // Last invoice
    prisma.invoice.findFirst({
      where: baseWhere,
      orderBy: { issueDate: 'desc' },
      select: { issueDate: true, invoiceNumber: true, status: true }
    })
  ]);

  let totalBilled = 0;
  let totalOutstanding = 0;

  for (const inv of invoices) {
    const grandTotalINR = convertCurrency(Number(inv.grandTotal), inv.currency, 'INR');
    const amountPaidINR = convertCurrency(Number(inv.amountPaid), inv.currency, 'INR');
    
    // totalBilled is revenue collected (sum of amountPaid across all client invoices)
    totalBilled += amountPaidINR;

    // totalOutstanding is grandTotal - amountPaid across outstanding invoices (SENT, OVERDUE, PARTIAL)
    if (['SENT', 'OVERDUE', 'PARTIAL'].includes(inv.status)) {
      totalOutstanding += Math.max(0, grandTotalINR - amountPaidINR);
    }
  }

  return {
    totalBilled,
    totalOutstanding,
    invoiceCount: totalInvoices,
    lastInvoiceDate: lastInvoice?.issueDate || null,
    lastInvoiceNumber: lastInvoice?.invoiceNumber || null,
    lastInvoiceStatus: lastInvoice?.status || null,
    averageInvoiceValue: totalInvoices > 0 
      ? totalBilled / totalInvoices 
      : 0
  };
}

// Get client activity timeline
export async function getClientActivity(clientId: string, userId: string, limit = 20) {
  return prisma.clientActivity.findMany({
    where: { clientId, userId },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}

// Log client activity (call this from invoice creation, payment, etc.)
export async function logClientActivity(data: {
  clientId: string
  userId: string
  action: string
  details?: string
  amount?: number
}) {
  return prisma.clientActivity.create({
    data: {
      clientId: data.clientId,
      userId: data.userId,
      action: data.action,
      details: data.details || null,
      amount: data.amount !== undefined ? data.amount : null,
    }
  });
}
