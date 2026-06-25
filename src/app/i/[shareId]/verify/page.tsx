import React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import VerifyPaymentClient from './VerifyPaymentClient';

interface VerifyPageProps {
  params: Promise<{ shareId: string }>;
}

export default async function VerifyPage({ params }: VerifyPageProps) {
  const { shareId } = await params;

  // Fetch the invoice
  const invoice = await prisma.invoice.findFirst({
    where: { publicShareId: shareId },
    include: {
      business: true,
      client: true,
    },
  });

  if (!invoice) {
    notFound();
  }

  // Calculate balance due
  const balanceDue = Number(invoice.grandTotal) - Number(invoice.amountPaid);

  // If already paid, client doesn't need to verify
  if (invoice.status === 'PAID' || balanceDue <= 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">Invoice Fully Paid</h1>
          <p className="text-xs text-slate-500">
            Invoice #{invoice.invoiceNumber} has already been fully paid. No further verification is needed.
          </p>
          <a
            href={`/i/${shareId}`}
            className="inline-block px-6 h-10 leading-10 font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer"
          >
            View Invoice
          </a>
        </div>
      </div>
    );
  }

  const serializableInvoice = {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber.toString(),
    currency: invoice.currency,
    grandTotal: Number(invoice.grandTotal),
    amountPaid: Number(invoice.amountPaid),
    balanceDue: balanceDue,
    shareId: shareId,
    businessName: invoice.business.name,
    clientName: invoice.client.name,
  };

  return <VerifyPaymentClient invoice={serializableInvoice} />;
}
