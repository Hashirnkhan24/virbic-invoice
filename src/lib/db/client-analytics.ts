import { prisma } from '@/lib/prisma';

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

  const [paidAgg, outstandingAgg, totalInvoices, lastInvoice] = await Promise.all([
    // Total PAID amount
    prisma.invoice.aggregate({
      where: { ...baseWhere, status: 'PAID' },
      _sum: { grandTotal: true }
    }),
    // Total outstanding (SENT + OVERDUE + PARTIAL)
    prisma.invoice.aggregate({
      where: { 
        ...baseWhere, 
        status: { in: ['SENT', 'OVERDUE', 'PARTIAL'] } 
      },
      _sum: { grandTotal: true }
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

  const totalBilled = paidAgg._sum.grandTotal ? Number(paidAgg._sum.grandTotal) : 0;
  const totalOutstanding = outstandingAgg._sum.grandTotal ? Number(outstandingAgg._sum.grandTotal) : 0;

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
