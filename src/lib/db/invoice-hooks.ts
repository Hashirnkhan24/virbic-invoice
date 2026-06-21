import { prisma } from '@/lib/prisma';
import { getClientFinancials } from './client-analytics';

// Call these AFTER invoice mutations to keep client counters in sync
export async function syncClientCounters(clientId: string, userId: string) {
  const financials = await getClientFinancials(clientId, userId);
  
  await prisma.client.update({
    where: { id: clientId },
    data: {
      totalBilled: financials.totalBilled,
      totalOutstanding: financials.totalOutstanding,
      invoiceCount: financials.invoiceCount,
      lastInvoiceDate: financials.lastInvoiceDate,
    },
  });
}
