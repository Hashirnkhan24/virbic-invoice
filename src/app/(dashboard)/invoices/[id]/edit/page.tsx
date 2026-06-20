import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import EditInvoiceClient from '@/components/invoices/EditInvoiceClient';

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { error, dbUser } = await getAuthUser();
  if (error || !dbUser) redirect('/sign-in');
  const user = dbUser;
  const { id } = await params;

  // Retrieve invoice with business, client, and line items
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      business: true,
      client: true,
      lineItems: true,
    },
  });

  if (!invoice) {
    notFound();
  }

  if (invoice.userId !== user.id) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
        <h1 className="text-xl font-bold text-slate-900">Access Denied</h1>
        <p className="text-sm text-slate-500">You do not have permission to edit this invoice.</p>
        <Link href="/invoices" className="inline-block text-emerald-600 font-bold hover:underline">
          Return to Invoices
        </Link>
      </div>
    );
  }

  // Convert Decimals & Dates to serializable format for Client Components
  const serializableInvoice = {
    id: invoice.id,
    businessId: invoice.businessId,
    clientId: invoice.clientId,
    invoiceNumber: invoice.invoiceNumber,
    template: invoice.template,
    currency: invoice.currency,
    exchangeRate: Number(invoice.exchangeRate),
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    placeOfSupply: invoice.placeOfSupply,
    reverseCharge: invoice.reverseCharge,
    notes: invoice.notes || '',
    terms: invoice.terms || '',
    customFields: invoice.customFields as any,
    status: invoice.status,
    overallDiscount: Number(invoice.overallDiscount),
    overallDiscountType: invoice.overallDiscountType,
    cessRate: Number(invoice.cessRate),
    lineItems: invoice.lineItems.map((item) => ({
      itemId: item.itemId,
      description: item.description,
      hsnCode: item.hsnCode,
      quantity: Number(item.quantity),
      unit: item.unit,
      rate: Number(item.rate),
      discount: Number(item.discount),
      discountType: item.discountType,
      gstRate: Number(item.gstRate),
    })),
  };

  return <EditInvoiceClient initialInvoice={serializableInvoice} />;
}
