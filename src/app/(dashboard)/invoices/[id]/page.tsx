import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import InvoiceDetailsClient from '@/components/invoices/InvoiceDetailsClient';

import { getAuthUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function InvoiceDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { error, dbUser } = await getAuthUser();
  if (error || !dbUser) redirect('/sign-in');
  const user = dbUser;
  const { id } = await params;

  // Retrieve invoice with business, client, line items and reminders
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      business: true,
      client: true,
      lineItems: true,
      reminders: true,
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
        <p className="text-sm text-slate-500">You do not have permission to view this invoice.</p>
        <Link href="/invoices" className="inline-block text-emerald-600 font-bold hover:underline">
          Return to Invoices
        </Link>
      </div>
    );
  }

  // Convert Decimals & Dates to serializable format for Client Components
  const serializableInvoice = {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    publicShareId: invoice.publicShareId,
    template: invoice.template,
    currency: invoice.currency,
    placeOfSupply: invoice.placeOfSupply,
    reverseCharge: invoice.reverseCharge,
    isInterState: invoice.isInterState,
    notes: invoice.notes,
    terms: invoice.terms,
    status: invoice.status,
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    subTotal: Number(invoice.subTotal),
    discountTotal: Number(invoice.discountTotal),
    taxableAmount: Number(invoice.taxableAmount),
    cgstTotal: Number(invoice.cgstTotal),
    sgstTotal: Number(invoice.sgstTotal),
    igstTotal: Number(invoice.igstTotal),
    cessTotal: Number(invoice.cessTotal),
    roundOff: Number(invoice.roundOff),
    grandTotal: Number(invoice.grandTotal),
    viewCount: invoice.viewCount,
    
    // Payment tracking & Audit fields
    amountPaid: Number(invoice.amountPaid),
    paidAt: invoice.paidAt ? invoice.paidAt.toISOString() : null,
    paymentNotes: invoice.paymentNotes,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
    
    business: {
      name: invoice.business.name,
      gstin: invoice.business.gstin || undefined,
      pan: invoice.business.pan || undefined,
      address: invoice.business.address || undefined,
      city: invoice.business.city || undefined,
      state: invoice.business.state || undefined,
      pincode: invoice.business.pincode || undefined,
      phone: invoice.business.phone || undefined,
      email: invoice.business.email || undefined,
      bankName: invoice.business.bankName || undefined,
      accountNumber: invoice.business.accountNumber || undefined,
      ifscCode: invoice.business.ifscCode || undefined,
      upiId: invoice.business.upiId || undefined,
      logo: invoice.business.logo || undefined,
      signature: invoice.business.signature || undefined,
      brandColor: invoice.business.brandColor,
    },
    
    client: {
      name: invoice.client.name,
      gstin: invoice.client.gstin || undefined,
      email: invoice.client.email || undefined,
      phone: invoice.client.phone || undefined,
      billingAddress: invoice.client.billingAddress || undefined,
      billingCity: invoice.client.billingCity || undefined,
      billingState: invoice.client.billingState || undefined,
      billingPincode: invoice.client.billingPincode || undefined,
    },
    
    lineItems: invoice.lineItems.map((item) => ({
      description: item.description,
      hsnCode: item.hsnCode,
      quantity: Number(item.quantity),
      unit: item.unit,
      rate: Number(item.rate),
      discount: Number(item.discount),
      discountType: item.discountType as 'PERCENTAGE' | 'AMOUNT',
      gstRate: Number(item.gstRate),
    })),
    
    reminders: invoice.reminders.map((rem) => ({
      id: rem.id,
      sentAt: rem.sentAt.toISOString(),
      subject: rem.subject,
      body: rem.body,
      recipient: rem.recipient,
    })),
    user: {
      reminderSubjectTemplate: user.reminderSubjectTemplate,
      reminderBodyTemplate: user.reminderBodyTemplate,
    },
  };

  return <InvoiceDetailsClient invoice={serializableInvoice} />;
}
