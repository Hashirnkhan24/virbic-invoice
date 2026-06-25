import React from 'react';
import { notFound } from 'next/navigation';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import InvoicePreview from '@/components/invoice-templates/InvoicePreview';
import PasswordForm from '@/components/invoices/PasswordForm';
import PublicDownloadButton from '@/components/invoices/PublicDownloadButton';
import PublicUPIPayment from '@/components/payments/PublicUPIPayment';
import { formatDate } from '@/lib/helpers';
import { headers } from 'next/headers';
import { trackInvoiceView } from '@/lib/view-intelligence';

interface PublicSharePageProps {
  params: Promise<{ shareId: string }>;
  searchParams: Promise<{ p?: string; receipt?: string }>;
}

/**
 * Generate SEO Metadata for Public Share Page
 */
export async function generateMetadata({ params }: { params: Promise<{ shareId: string }> }) {
  try {
    const { shareId } = await params;
    const invoice = await prisma.invoice.findFirst({
      where: { publicShareId: shareId },
      include: { business: true },
    });

    if (!invoice) {
      return {
        title: 'Invoice Not Found | Virbic Invoice',
        description: 'The requested invoice could not be found.',
      };
    }

    return {
      title: `Invoice #${invoice.invoiceNumber} | ${invoice.business.name}`,
      description: `View and download invoice #${invoice.invoiceNumber} from ${invoice.business.name}.`,
    };
  } catch (err) {
    return {
      title: 'Invoice | Virbic Invoice',
      description: 'View your invoice online.',
    };
  }
}

/**
 * Public Share Invoice Page
 */
export default async function PublicSharePage({ params, searchParams }: PublicSharePageProps) {
  const { shareId } = await params;
  const { p: passwordQuery, receipt } = await searchParams;
  const asReceipt = receipt === '1';

  // Retrieve invoice with business, client and line items
  const invoice = await prisma.invoice.findFirst({
    where: { publicShareId: shareId },
    include: {
      business: true,
      client: true,
      lineItems: true,
    },
  });

  if (!invoice) {
    notFound();
  }

  // 1. Password Protection Check
  if (invoice.sharePassword) {
    const enteredPassword = passwordQuery || '';
    if (enteredPassword !== invoice.sharePassword) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
          <PasswordForm
            shareId={shareId}
            errorMsg={enteredPassword ? 'Incorrect password. Access denied.' : undefined}
          />
        </div>
      );
    }
  }

  // 2. Increment view count in database on access (handled asynchronously via trackInvoiceView)
  const headersList = await headers();
  trackInvoiceView(shareId, headersList).catch((err) => console.error('Failed to track view:', err));

  // 3. Serialize Decimal & Date fields for client-side InvoicePreview
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
    amountPaid: Number(invoice.amountPaid),
    razorpayPaymentLinkId: invoice.razorpayPaymentLinkId,
    razorpayPaymentLinkUrl: invoice.razorpayPaymentLinkUrl,
    razorpayPaymentLinkStatus: invoice.razorpayPaymentLinkStatus,
    viewCount: invoice.viewCount + 1, // Add current view
    
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
  };

  const totals = {
    subTotal: serializableInvoice.subTotal,
    discountTotal: serializableInvoice.discountTotal,
    taxableAmount: serializableInvoice.taxableAmount,
    cgstTotal: serializableInvoice.cgstTotal,
    sgstTotal: serializableInvoice.sgstTotal,
    igstTotal: serializableInvoice.igstTotal,
    cessTotal: serializableInvoice.cessTotal,
    roundOff: serializableInvoice.roundOff,
    grandTotal: serializableInvoice.grandTotal,
  };

  const isUnpaid = ['SENT', 'PARTIAL', 'OVERDUE'].includes(serializableInvoice.status);
  const hasUpi = !!serializableInvoice.business.upiId;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16">
      {/* ── Top Bar ── */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="text-left overflow-hidden">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
              Virbic Invoice Portal
            </span>
            <h2 className="text-sm font-extrabold text-slate-850 dark:text-slate-100 truncate">
              {serializableInvoice.business.name}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            {invoice.sharePassword && (
              <div className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-slate-455 bg-slate-150/50 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Secure Link</span>
              </div>
            )}
            <PublicDownloadButton
              shareId={shareId}
              password={invoice.sharePassword || undefined}
              invoiceNumber={serializableInvoice.invoiceNumber}
              asReceipt={asReceipt}
            />
          </div>
        </div>
      </div>

      {/* ── Main Invoice Sheet ── */}
      <main className="max-w-4xl mx-auto px-4 mt-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-lg overflow-hidden">
          <InvoicePreview
            invoice={serializableInvoice}
            totals={totals}
            business={serializableInvoice.business}
            client={serializableInvoice.client}
            template={serializableInvoice.template}
            asReceipt={asReceipt}
          />
        </div>

        {isUnpaid && !asReceipt && hasUpi && (
          <PublicUPIPayment
            invoiceId={serializableInvoice.id}
            invoiceNumber={serializableInvoice.invoiceNumber.toString()}
            balanceDue={serializableInvoice.grandTotal - serializableInvoice.amountPaid}
            currency={serializableInvoice.currency}
            upiId={serializableInvoice.business.upiId!}
            payeeName={serializableInvoice.business.name}
            shareId={shareId}
          />
        )}
        
        {/* Footnote branding */}
        <p className="text-[10px] text-center text-slate-400 mt-6 font-semibold">
          Powered by <span className="text-slate-500 dark:text-slate-350">Virbic Invoice Generator</span>
        </p>
      </main>
    </div>
  );
}
