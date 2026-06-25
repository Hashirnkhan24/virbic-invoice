import { prisma } from './prisma';

// Recalculate invoice.amountPaid from Payment records
export async function recalculateInvoicePayments(invoiceId: string) {
  const payments = await prisma.payment.aggregate({
    where: { 
      invoiceId, 
      status: { in: ['CONFIRMED', 'PENDING'] } // Include pending in the running total
    },
    _sum: { amount: true }
  });
  
  const totalPaid = Number(payments._sum.amount || 0);
  
  // Get the invoice to compare
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { grandTotal: true, status: true, dueDate: true }
  });
  
  if (!invoice) return;
  
  // Determine new status
  let newStatus = invoice.status;
  const now = new Date();
  const isOverdue = new Date(invoice.dueDate) < now;
  
  if (totalPaid <= 0) {
    newStatus = isOverdue ? 'OVERDUE' : 'SENT';
  } else if (totalPaid >= Number(invoice.grandTotal)) {
    newStatus = 'PAID';
  } else {
    newStatus = 'PARTIAL';
  }
  
  // Update invoice
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      amountPaid: totalPaid,
      paidAt: totalPaid > 0 ? new Date() : null,
      status: newStatus
    }
  });

  // If status is PAID, update the viewedBeforePayment/viewsBeforePayment fields on InvoiceShareLog
  if (newStatus === 'PAID') {
    try {
      const shareLog = await prisma.invoiceShareLog.findUnique({
        where: { invoiceId }
      });
      if (shareLog && !shareLog.viewedBeforePayment) {
        await prisma.invoiceShareLog.update({
          where: { invoiceId },
          data: {
            viewedBeforePayment: shareLog.viewCount > 0,
            viewsBeforePayment: shareLog.viewCount
          }
        });
      }
    } catch (err) {
      console.error('Failed to update viewsBeforePayment in recalculateInvoicePayments:', err);
    }
  }
  
  // Sync client counters
  const invoiceWithClient = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { clientId: true, userId: true }
  });
  
  if (invoiceWithClient) {
    const { syncClientCounters } = await import('./db/invoice-hooks');
    await syncClientCounters(invoiceWithClient.clientId, invoiceWithClient.userId);
  }
  
  return { totalPaid, newStatus, balanceDue: Number(invoice.grandTotal) - totalPaid };
}

// Get payment history for an invoice
export async function getPaymentHistory(invoiceId: string, userId: string) {
  return prisma.payment.findMany({
    where: { invoiceId, userId },
    orderBy: { paidAt: 'desc' }
  });
}

// Validate a payment amount
export function validatePaymentAmount(amount: number, currentPaid: number, grandTotal: number) {
  const balanceDue = grandTotal - currentPaid;
  
  if (amount <= 0) return { valid: false, error: 'Amount must be greater than 0' };
  
  // Allow a tiny floating point margin for floating point inaccuracies
  if (amount > balanceDue + 0.01) {
    return { 
      valid: false, 
      error: `Amount exceeds balance due of ${balanceDue.toFixed(2)}`,
      balanceDue 
    };
  }
  
  return { valid: true, balanceDue };
}
