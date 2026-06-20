'use client';

import React, { useMemo, useState } from 'react';
import { Maximize2, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/helpers';
import { InvoiceTemplateProps, LineItemData } from './types';

import UPIQRCode from './shared/UPIQRCode';

interface InvoicePreviewProps {
  invoice: InvoiceTemplateProps['invoice'];
  totals: InvoiceTemplateProps['totals'];
  business: InvoiceTemplateProps['business'];
  client: InvoiceTemplateProps['client'];
  template?: string;
  className?: string;
}

export default function InvoicePreview({
  invoice,
  totals,
  business,
  client,
  template = 'modern',
  className = '',
}: InvoicePreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const allowedTemplates = ['modern', 'minimal', 'professional', 'creative', 'dark'];
  const templateCandidate = template || (invoice as Record<string, unknown>).template as string || 'modern';
  const activeTemplate = allowedTemplates.includes(templateCandidate) ? templateCandidate : 'modern';

  // Compute place of supply name for display
  const placeOfSupplyText = useMemo(() => {
    if (!invoice.placeOfSupply) return 'N/A';
    return invoice.placeOfSupply;
  }, [invoice.placeOfSupply]);

  // Dynamic QR Code component integration
  const renderQRCode = () => {
    const upiId = business?.upiId || '';
    const grandTotal = totals.grandTotal || 0;
    const invoiceNum = invoice.invoiceNumber || 'INV-TEMP';
    const businessName = business?.name || 'Business';

    if (invoice.currency !== 'INR' || !upiId) {
      return null;
    }

    return (
      <UPIQRCode
        upiId={upiId}
        amount={grandTotal}
        payeeName={businessName}
        invoiceNumber={invoiceNum}
        size={64}
      />
    );
  };

  // Helper to render taxes conditionally
  const renderTaxLines = (t: typeof totals, curr: string) => {
    const isINR = curr === 'INR';
    if (isINR) {
      return (
        <>
          {t.cgstTotal > 0 && (
            <div className="flex justify-between text-slate-550 font-mono text-[9px]">
              <span>CGST</span>
              <span>{formatCurrency(t.cgstTotal, curr)}</span>
            </div>
          )}
          {t.sgstTotal > 0 && (
            <div className="flex justify-between text-slate-550 font-mono text-[9px]">
              <span>SGST</span>
              <span>{formatCurrency(t.sgstTotal, curr)}</span>
            </div>
          )}
          {t.igstTotal > 0 && (
            <div className="flex justify-between text-slate-550 font-mono text-[9px]">
              <span>IGST</span>
              <span>{formatCurrency(t.igstTotal, curr)}</span>
            </div>
          )}
          {t.cessTotal > 0 && (
            <div className="flex justify-between text-slate-550 font-mono text-[9px]">
              <span>Cess</span>
              <span>{formatCurrency(t.cessTotal, curr)}</span>
            </div>
          )}
        </>
      );
    } else {
      const totalTax = (t.cgstTotal || 0) + (t.sgstTotal || 0) + (t.igstTotal || 0) + (t.cessTotal || 0);
      if (totalTax <= 0) return null;
      return (
        <div className="flex justify-between text-slate-550 font-mono text-[9px]">
          <span>Tax</span>
          <span>{formatCurrency(totalTax, curr)}</span>
        </div>
      );
    }
  };

  // Base markup shared across all templates
  const renderTemplateContent = () => {
    const isDark = activeTemplate === 'dark';
    
    const colors = {
      primaryText: isDark ? 'text-white' : 'text-slate-900',
      secondaryText: isDark ? 'text-slate-400' : 'text-slate-500',
      mutedText: isDark ? 'text-slate-500' : 'text-slate-400',
      border: isDark ? 'border-slate-800' : 'border-slate-150',
      cardBg: isDark ? 'bg-slate-950/40' : 'bg-slate-50/50',
      bg: isDark ? 'bg-slate-950 text-slate-300' : 'bg-white text-slate-700',
      primaryBg: isDark ? 'bg-emerald-950/20 text-emerald-400' : 'bg-emerald-50 text-emerald-700',
    };

    // 1. MODERN TEMPLATE
    if (activeTemplate === 'modern') {
      return (
        <div className={cn("p-6 font-sans text-left space-y-6 select-none", colors.bg)}>
          {/* Header */}
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-2">
              {business?.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={business.logo} alt="Business Logo" className="max-h-12 object-contain" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-lg">
                  B
                </div>
              )}
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">{business?.name || 'Business Name'}</h3>
                {business?.gstin && <p className="text-[10px] text-slate-500 font-mono">GSTIN: {business.gstin}</p>}
                <p className="text-[10px] text-slate-500 leading-snug whitespace-pre-line max-w-[200px]">
                  {business?.address}
                  {business?.city ? `, ${business.city}` : ''}
                  {business?.state ? ` (${business.state})` : ''}
                  {business?.pincode ? ` - ${business.pincode}` : ''}
                </p>
              </div>
            </div>
            <div className="text-right space-y-1">
              <span className="inline-block text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider">
                Tax Invoice
              </span>
              <h1 className="text-xl font-black text-slate-950">{invoice.invoiceNumber || 'INV-000'}</h1>
              <div className="text-[10px] text-slate-500 space-y-0.5">
                <p>Issue Date: <span className="font-semibold text-slate-800">{formatDate(invoice.issueDate)}</span></p>
                <p>Due Date: <span className="font-semibold text-slate-800">{formatDate(invoice.dueDate)}</span></p>
                <p>Place of Supply: <span className="font-semibold text-slate-800">{placeOfSupplyText}</span></p>
              </div>
            </div>
          </div>

          <Separator className={colors.border} />

          {/* Client Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Bill To</span>
              <h4 className="font-bold text-xs text-slate-900">{client?.name || 'Customer Name'}</h4>
              {client?.gstin && <p className="text-[10px] font-mono text-emerald-700 font-bold">GSTIN: {client.gstin}</p>}
              <p className="text-[10px] text-slate-500 leading-snug whitespace-pre-line max-w-[200px]">
                {client?.billingAddress || client?.address || 'Billing Address'}
                {client?.billingCity ? `, ${client.billingCity}` : ''}
                {client?.billingState ? ` (${client.billingState})` : ''}
                {client?.billingPincode ? ` - ${client.billingPincode}` : ''}
              </p>
            </div>
            {invoice.reverseCharge && (
              <div className="text-right flex items-start justify-end">
                <span className="bg-amber-50 border border-amber-250 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded">
                  Reverse Charge Applicable
                </span>
              </div>
            )}
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-150 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-[10px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold">
                  <th className="px-3 py-2 w-[40%]">Item Description</th>
                  <th className="px-2 py-2 text-center font-mono">HSN</th>
                  <th className="px-2 py-2 text-right">Qty</th>
                  <th className="px-2 py-2 text-right">Rate</th>
                  <th className="px-2 py-2 text-right">GST</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.lineItems.map((item: LineItemData, idx: number) => {
                  const qty = Number(item.quantity) || 0;
                  const rate = Number(item.rate) || 0;
                  const itemDiscount = Number(item.discount) || 0;
                  
                  let itemDiscountText = '';
                  if (itemDiscount > 0) {
                    itemDiscountText = item.discountType === 'PERCENTAGE' 
                      ? ` (-${itemDiscount}%)` 
                      : ` (-${formatCurrency(itemDiscount, invoice.currency)})`;
                  }

                  const rowAmount = qty * rate;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 text-slate-800">
                        <p className="font-semibold">{item.description || 'Description'}</p>
                        {item.hsnCode && <p className="text-[8px] text-slate-400 font-mono">SAC: {item.hsnCode}</p>}
                      </td>
                      <td className="px-2 py-2 text-center font-mono text-slate-500">{item.hsnCode || '—'}</td>
                      <td className="px-2 py-2 text-right text-slate-600 font-semibold">{qty} {item.unit || 'PCS'}</td>
                      <td className="px-2 py-2 text-right text-slate-650 font-mono">
                        {formatCurrency(rate, invoice.currency)}
                        {itemDiscountText && <span className="text-[8px] text-red-500 block">{itemDiscountText}</span>}
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-slate-600">{item.gstRate}%</td>
                      <td className="px-3 py-2 text-right text-slate-900 font-bold font-mono">
                        {formatCurrency(rowAmount - (item.discountType === 'PERCENTAGE' ? rowAmount * (itemDiscount/100) : itemDiscount), invoice.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Grid: Notes/Bank vs. Totals */}
          <div className="grid grid-cols-5 gap-6 pt-2">
            {/* Left Col (Bank & Notes) */}
            <div className="col-span-3 space-y-4">
              {/* Bank Details */}
              {business?.bankName && (
                <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-lg space-y-1.5">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bank Details</h4>
                  <div className="text-[9px] text-slate-600 grid grid-cols-3 gap-y-0.5 leading-snug">
                    <span className="font-medium">Bank Name:</span>
                    <span className="col-span-2 font-bold text-slate-850">{business.bankName}</span>
                    <span className="font-medium">A/C Number:</span>
                    <span className="col-span-2 font-bold text-slate-850 font-mono">{business.accountNumber}</span>
                    <span className="font-medium">IFSC Code:</span>
                    <span className="col-span-2 font-bold text-slate-850 font-mono">{business.ifscCode}</span>
                  </div>
                </div>
              )}
              {/* Notes */}
              {invoice.notes && (
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Notes</span>
                  <p className="text-[10px] text-slate-500 italic max-w-[260px] leading-relaxed whitespace-pre-line">
                    {invoice.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Right Col (Totals Summary) */}
            <div className="col-span-2 space-y-2 border-t border-slate-100 pt-2 text-[10px] leading-relaxed">
              <div className="flex justify-between text-slate-500 font-semibold">
                <span>Subtotal</span>
                <span className="font-mono">{formatCurrency(totals.subTotal, invoice.currency)}</span>
              </div>
              {totals.discountTotal > 0 && (
                <div className="flex justify-between text-red-500 font-semibold">
                  <span>Discount</span>
                  <span className="font-mono">-{formatCurrency(totals.discountTotal, invoice.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600 font-bold border-b border-slate-100 pb-1.5">
                <span>Taxable Amount</span>
                <span className="font-mono">{formatCurrency(totals.taxableAmount, invoice.currency)}</span>
              </div>

              {/* Tax Details */}
              {renderTaxLines(totals, invoice.currency)}
              {totals.roundOff !== 0 && (
                <div className="flex justify-between text-slate-450 font-mono text-[9px]">
                  <span>Round Off</span>
                  <span>{totals.roundOff > 0 ? '+' : ''}{formatCurrency(totals.roundOff, invoice.currency)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-slate-900 bg-emerald-50 p-2 rounded-lg border border-emerald-100 font-black text-xs leading-none">
                <span className="text-emerald-800 uppercase tracking-wider text-[9px]">Total Due</span>
                <span className="font-mono text-sm text-emerald-600 font-black">
                  {formatCurrency(totals.grandTotal, invoice.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer QR, T&C & Signature */}
          <div className="flex justify-between items-end gap-6 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-4">
              {renderQRCode()}
              {invoice.terms && (
                <div className="space-y-0.5 text-[8px] text-slate-400">
                  <span className="font-bold text-slate-500 uppercase tracking-widest">Terms & Conditions</span>
                  <p className="whitespace-pre-line max-w-[180px] leading-tight">{invoice.terms}</p>
                </div>
              )}
            </div>

            {/* Signature Area */}
            <div className="text-right space-y-1 flex-shrink-0">
              {business?.signature ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={business.signature} alt="Signature" className="max-h-8 object-contain ml-auto" />
              ) : (
                <div className="h-8 w-24 border-b border-slate-300 ml-auto" />
              )}
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                Authorized Signatory
              </span>
            </div>
          </div>
        </div>
      );
    }

    // 2. MINIMAL TEMPLATE
    if (activeTemplate === 'minimal') {
      return (
        <div className={cn("p-6 font-sans text-left space-y-6 select-none", colors.bg)}>
          {/* Header */}
          <div className="flex justify-between items-end pb-4 border-b border-slate-800/80">
            <div>
              <h1 className="text-xl font-bold text-slate-900 uppercase tracking-widest">INVOICE</h1>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{invoice.invoiceNumber || 'INV-000'}</p>
            </div>
            <div className="text-right text-[10px] space-y-0.5">
              <p>Date: <span className="font-bold">{formatDate(invoice.issueDate)}</span></p>
              <p>Due: <span className="font-bold">{formatDate(invoice.dueDate)}</span></p>
            </div>
          </div>

          {/* Details Row */}
          <div className="grid grid-cols-2 gap-8 text-[10px]">
            <div className="space-y-1">
              <span className="font-bold text-slate-400 uppercase tracking-wider block text-[8px]">From:</span>
              <p className="font-bold text-slate-900">{business?.name || 'Business Name'}</p>
              <p className="whitespace-pre-line leading-relaxed max-w-[200px] text-slate-500">
                {business?.address}
                {business?.city ? `, ${business.city}` : ''}
              </p>
              {business?.gstin && <p className="font-mono text-slate-400 mt-1">GSTIN: {business.gstin}</p>}
            </div>
            <div className="space-y-1">
              <span className="font-bold text-slate-400 uppercase tracking-wider block text-[8px]">To:</span>
              <p className="font-bold text-slate-900">{client?.name || 'Client Name'}</p>
              <p className="whitespace-pre-line leading-relaxed max-w-[200px] text-slate-500">
                {client?.billingAddress || client?.address || 'Billing Address'}
                {client?.billingCity ? `, ${client.billingCity}` : ''}
              </p>
              {client?.gstin && <p className="font-mono text-slate-400 mt-1">GSTIN: {client.gstin}</p>}
            </div>
          </div>

          {/* Line Items */}
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-800 text-slate-450 uppercase text-[8px] font-bold">
                <th className="py-2 text-left">Description</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Rate</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.lineItems.map((item: LineItemData, idx: number) => {
                const qty = Number(item.quantity) || 0;
                const rate = Number(item.rate) || 0;
                const itemDiscount = Number(item.discount) || 0;
                const discountValue = item.discountType === 'PERCENTAGE' ? (qty * rate) * (itemDiscount / 100) : itemDiscount;
                const itemAmount = (qty * rate) - discountValue;

                return (
                  <tr key={idx} className="align-top">
                    <td className="py-2.5 pr-4">
                      <p className="font-bold text-slate-800">{item.description || 'Description'}</p>
                      {item.hsnCode && <span className="text-[8px] text-slate-400 font-mono block mt-0.5">HSN: {item.hsnCode} | GST: {item.gstRate}%</span>}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-slate-600">{qty} {item.unit || 'PCS'}</td>
                    <td className="py-2.5 text-right font-mono text-slate-600">{formatCurrency(rate, invoice.currency)}</td>
                    <td className="py-2.5 text-right font-bold font-mono text-slate-900">{formatCurrency(itemAmount, invoice.currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-between items-start gap-4 pt-4 border-t border-slate-200">
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="space-y-4 flex-1">
                  {invoice.notes && (
                    <div className="space-y-1">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Notes</span>
                      <p className="text-[10px] text-slate-500 italic max-w-[240px] leading-relaxed whitespace-pre-line">{invoice.notes}</p>
                    </div>
                  )}
                  {business?.bankName && (
                    <div className="text-[8px] text-slate-400 space-y-0.5 font-mono">
                      <p>Bank: {business.bankName}</p>
                      <p>A/C: {business.accountNumber}</p>
                      <p>IFSC: {business.ifscCode}</p>
                    </div>
                  )}
                </div>
                {renderQRCode()}
              </div>
            </div>

            <div className="w-[180px] space-y-1.5 text-right text-[10px]">
              <div className="flex justify-between text-slate-500 font-medium">
                <span>Subtotal</span>
                <span className="font-mono">{formatCurrency(totals.subTotal, invoice.currency)}</span>
              </div>
              {totals.discountTotal > 0 && (
                <div className="flex justify-between text-red-500 font-medium">
                  <span>Discount</span>
                  <span className="font-mono">-{formatCurrency(totals.discountTotal, invoice.currency)}</span>
                </div>
              )}
              {renderTaxLines(totals, invoice.currency)}
              <div className="flex justify-between font-bold text-slate-900 border-t border-slate-800 pt-1.5 text-xs">
                <span className="uppercase tracking-widest text-[9px]">Total Due</span>
                <span className="font-mono">{formatCurrency(totals.grandTotal, invoice.currency)}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 3. PROFESSIONAL TEMPLATE
    if (activeTemplate === 'professional') {
      return (
        <div className={cn("p-6 font-sans text-left space-y-6 select-none", colors.bg)}>
          {/* Top Bar with Deep Navy Accent */}
          <div className="bg-slate-900 text-white p-4 rounded-lg flex justify-between items-center">
            <div>
              <h1 className="text-base font-black tracking-widest uppercase">TAX INVOICE</h1>
              <p className="text-[10px] font-mono text-slate-350">{invoice.invoiceNumber || 'INV-000'}</p>
            </div>
            <div className="text-right text-[10px] text-slate-300 font-medium">
              <p>Issue Date: {formatDate(invoice.issueDate)}</p>
              <p>Due Date: {formatDate(invoice.dueDate)}</p>
            </div>
          </div>

          {/* Addresses Card Grid */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-900 p-4 border border-slate-200/80 rounded-xl text-[10px]">
            <div className="space-y-1">
              <span className="font-bold text-slate-450 uppercase text-[8px] tracking-wider block">Sender (Bill From):</span>
              <p className="font-black text-slate-850">{business?.name || 'Business Name'}</p>
              <p className="leading-snug whitespace-pre-line text-slate-550">
                {business?.address}
                {business?.city ? `, ${business.city}` : ''}
              </p>
              {business?.gstin && <p className="font-mono font-bold text-emerald-700 mt-1">GSTIN: {business.gstin}</p>}
            </div>
            <div className="space-y-1">
              <span className="font-bold text-slate-450 uppercase text-[8px] tracking-wider block">Recipient (Bill To):</span>
              <p className="font-black text-slate-850">{client?.name || 'Customer Name'}</p>
              <p className="leading-snug whitespace-pre-line text-slate-550">
                {client?.billingAddress || client?.address || 'Billing Address'}
                {client?.billingCity ? `, ${client.billingCity}` : ''}
              </p>
              {client?.gstin && <p className="font-mono font-bold text-emerald-700 mt-1">GSTIN: {client.gstin}</p>}
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-[10px] border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5 text-left">Description</th>
                <th className="px-2 py-2.5 text-center font-mono">HSN</th>
                <th className="px-2 py-2.5 text-right">Qty</th>
                <th className="px-2 py-2.5 text-right">Rate</th>
                <th className="px-2 py-2.5 text-right">GST</th>
                <th className="px-3 py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {invoice.lineItems.map((item: LineItemData, idx: number) => {
                const qty = Number(item.quantity) || 0;
                const rate = Number(item.rate) || 0;
                const itemDiscount = Number(item.discount) || 0;
                const rowAmount = qty * rate;
                const rowDiscount = item.discountType === 'PERCENTAGE' ? rowAmount * (itemDiscount / 100) : itemDiscount;
                const finalAmount = rowAmount - rowDiscount;

                return (
                  <tr key={idx}>
                    <td className="px-3 py-2 text-slate-800">
                      <p className="font-bold">{item.description || 'Description'}</p>
                    </td>
                    <td className="px-2 py-2 text-center font-mono text-slate-500">{item.hsnCode || '—'}</td>
                    <td className="px-2 py-2 text-right font-medium text-slate-650">{qty} {item.unit || 'PCS'}</td>
                    <td className="px-2 py-2 text-right font-mono text-slate-650">{formatCurrency(rate, invoice.currency)}</td>
                    <td className="px-2 py-2 text-right font-mono text-slate-600">{item.gstRate}%</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">{formatCurrency(finalAmount, invoice.currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer Grid */}
          <div className="grid grid-cols-2 gap-8 pt-4">
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                {business?.bankName && (
                  <div className="text-[9px] text-slate-500 leading-snug space-y-0.5 border border-slate-100 p-2.5 rounded-lg flex-1">
                    <p className="font-bold text-slate-700 uppercase text-[8px] tracking-wider mb-1">Bank Payment Wire</p>
                    <p>Bank: <span className="font-bold text-slate-700">{business.bankName}</span></p>
                    <p>Account: <span className="font-bold text-slate-700 font-mono">{business.accountNumber}</span></p>
                    <p>IFSC: <span className="font-bold text-slate-700 font-mono">{business.ifscCode}</span></p>
                  </div>
                )}
                {renderQRCode()}
              </div>
              {invoice.notes && (
                <p className="text-[10px] text-slate-500 italic whitespace-pre-line leading-relaxed">{invoice.notes}</p>
              )}
            </div>

            <div className="space-y-2 text-[10px] border-t border-slate-150 pt-2">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span className="font-mono">{formatCurrency(totals.subTotal, invoice.currency)}</span>
              </div>
              {totals.discountTotal > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Discount</span>
                  <span className="font-mono">-{formatCurrency(totals.discountTotal, invoice.currency)}</span>
                </div>
              )}
              {renderTaxLines(totals, invoice.currency)}
              <div className="flex justify-between font-black text-slate-900 border-t border-slate-900 pt-2 text-xs">
                <span>GRAND TOTAL</span>
                <span className="font-mono">{formatCurrency(totals.grandTotal, invoice.currency)}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 4. CREATIVE TEMPLATE
    if (activeTemplate === 'creative') {
      return (
        <div className={cn("p-6 font-sans text-left space-y-6 select-none relative overflow-hidden", colors.bg)}>
          {/* Creative Top Gradient Stripe */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-violet-500 via-pink-500 to-emerald-400" />
          
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-500 text-white flex items-center justify-center font-black text-xl shadow-md uppercase">
                {business?.name ? business.name[0] : 'B'}
              </div>
              <div>
                <h2 className="font-extrabold text-sm text-slate-900">{business?.name || 'Business Name'}</h2>
                <p className="text-[10px] text-slate-450">{business?.email}</p>
              </div>
            </div>
            
            <div className="text-right">
              <h1 className="text-lg font-black text-slate-950 uppercase tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-pink-600">INVOICE</h1>
              <span className="font-mono text-xs font-bold text-slate-500">{invoice.invoiceNumber || 'INV-000'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-violet-600 uppercase tracking-widest">Client Recipient</span>
              <h4 className="font-bold text-xs text-slate-900">{client?.name || 'Customer Name'}</h4>
              <p className="text-[10px] text-slate-500 leading-snug whitespace-pre-line">
                {client?.billingAddress || client?.address || 'Billing Address'}
              </p>
            </div>
            <div className="text-right text-[10px] space-y-1 text-slate-500">
              <p>Drafted On: <span className="font-bold text-slate-800">{formatDate(invoice.issueDate)}</span></p>
              <p>Due By: <span className="font-bold text-slate-800">{formatDate(invoice.dueDate)}</span></p>
              <p>Supply State: <span className="font-bold text-slate-800">{placeOfSupplyText}</span></p>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="border-b border-violet-100 text-slate-450 uppercase text-[8px] font-bold">
                <th className="py-2 text-left text-violet-600">Product / Service Description</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Price</th>
                <th className="py-2 text-right text-violet-600">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.lineItems.map((item: LineItemData, idx: number) => {
                const qty = Number(item.quantity) || 0;
                const rate = Number(item.rate) || 0;
                const itemDiscount = Number(item.discount) || 0;
                const amount = qty * rate;
                const discountVal = item.discountType === 'PERCENTAGE' ? amount * (itemDiscount / 100) : itemDiscount;
                const finalVal = amount - discountVal;

                return (
                  <tr key={idx} className="align-middle">
                    <td className="py-3">
                      <p className="font-bold text-slate-800">{item.description || 'Description'}</p>
                      {item.hsnCode && <span className="text-[8px] text-slate-400 font-mono block">HSN: {item.hsnCode} | GST: {item.gstRate}%</span>}
                    </td>
                    <td className="py-3 text-right font-medium text-slate-650">{qty} {item.unit || 'PCS'}</td>
                    <td className="py-3 text-right font-mono text-slate-650">{formatCurrency(rate, invoice.currency)}</td>
                    <td className="py-3 text-right font-bold font-mono text-slate-900">{formatCurrency(finalVal, invoice.currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-between items-start gap-4 pt-4 border-t border-slate-100">
            <div className="space-y-4 text-[9px] text-slate-500 italic max-w-[260px] leading-relaxed flex items-start gap-4 flex-1">
              <div className="space-y-4 flex-1">
                {invoice.notes && <p className="whitespace-pre-line">{invoice.notes}</p>}
                {invoice.terms && (
                  <div className="text-[8px] text-slate-400 space-y-0.5 leading-snug">
                    <p className="font-bold text-slate-500 uppercase">Terms</p>
                    <p className="whitespace-pre-line">{invoice.terms}</p>
                  </div>
                )}
              </div>
              {renderQRCode()}
            </div>

            <div className="w-[180px] bg-slate-50/50 p-3 rounded-2xl border border-slate-100 text-right text-[10px] space-y-1.5 font-medium">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span className="font-mono">{formatCurrency(totals.subTotal, invoice.currency)}</span>
              </div>
              {totals.discountTotal > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Discount</span>
                  <span className="font-mono">-{formatCurrency(totals.discountTotal, invoice.currency)}</span>
                </div>
              )}
              {renderTaxLines(totals, invoice.currency)}
              <div className="flex justify-between items-center font-black text-slate-900 border-t border-violet-100 pt-2 text-xs">
                <span>TOTAL DUE</span>
                <span className="font-mono text-sm bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">{formatCurrency(totals.grandTotal, invoice.currency)}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 5. DARK MODE TEMPLATE
    if (activeTemplate === 'dark') {
      return (
        <div className={cn("p-6 font-sans text-left space-y-6 select-none bg-slate-950 text-slate-350", className)}>
          {/* Top */}
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-lg">
                BC
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white">{business?.name || 'Business Name'}</h3>
                {business?.gstin && <p className="text-[10px] text-slate-500 font-mono">GSTIN: {business.gstin}</p>}
                <p className="text-[10px] text-slate-400 whitespace-pre-line leading-relaxed max-w-[200px]">
                  {business?.address}
                  {business?.city ? `, ${business.city}` : ''}
                </p>
              </div>
            </div>
            <div className="text-right space-y-1">
              <span className="inline-block text-[9px] font-black text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded uppercase tracking-wider">
                Tax Invoice
              </span>
              <h1 className="text-xl font-black text-white">{invoice.invoiceNumber || 'INV-000'}</h1>
              <div className="text-[10px] text-slate-450 space-y-0.5 font-mono">
                <p>Issue Date: {formatDate(invoice.issueDate)}</p>
                <p>Due Date: {formatDate(invoice.dueDate)}</p>
                <p>Supply State: {placeOfSupplyText}</p>
              </div>
            </div>
          </div>

          <Separator className="border-slate-800" />

          {/* Client Details */}
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-550 uppercase tracking-widest block">Bill To</span>
            <h4 className="font-bold text-xs text-white">{client?.name || 'Customer Name'}</h4>
            {client?.gstin && <p className="text-[10px] font-mono text-emerald-400">GSTIN: {client.gstin}</p>}
            <p className="text-[10px] text-slate-400 leading-snug whitespace-pre-line max-w-[240px]">
              {client?.billingAddress || client?.address || 'Billing Address'}
            </p>
          </div>

          {/* Line Items */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/30">
            <table className="w-full text-[10px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold">
                  <th className="px-3 py-2 w-[40%]">Item Description</th>
                  <th className="px-2 py-2 text-center font-mono">HSN</th>
                  <th className="px-2 py-2 text-right">Qty</th>
                  <th className="px-2 py-2 text-right">Rate</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {invoice.lineItems.map((item: LineItemData, idx: number) => {
                  const qty = Number(item.quantity) || 0;
                  const rate = Number(item.rate) || 0;
                  const itemDiscount = Number(item.discount) || 0;
                  const rowAmount = qty * rate;
                  const discountValue = item.discountType === 'PERCENTAGE' ? rowAmount * (itemDiscount / 100) : itemDiscount;
                  const rowFinalAmount = rowAmount - discountValue;

                  return (
                    <tr key={idx}>
                      <td className="px-3 py-2.5 text-slate-200">
                        <p className="font-semibold">{item.description || 'Description'}</p>
                        {item.hsnCode && <p className="text-[8px] text-slate-550 font-mono mt-0.5">HSN: {item.hsnCode} | GST: {item.gstRate}%</p>}
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono text-slate-500">{item.hsnCode || '—'}</td>
                      <td className="px-2 py-2.5 text-right font-medium text-slate-400">{qty} {item.unit || 'PCS'}</td>
                      <td className="px-2 py-2.5 text-right font-mono text-slate-400">{formatCurrency(rate, invoice.currency)}</td>
                      <td className="px-3 py-2.5 text-right text-slate-100 font-bold font-mono">
                        {formatCurrency(rowFinalAmount, invoice.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals & T&C */}
          <div className="grid grid-cols-5 gap-6 pt-2">
            <div className="col-span-3 space-y-4">
              <div className="flex gap-4 items-start">
                <div className="space-y-4 flex-1">
                  {invoice.notes && (
                    <div className="space-y-1">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Notes</span>
                      <p className="text-[10px] text-slate-400 italic leading-relaxed whitespace-pre-line">{invoice.notes}</p>
                    </div>
                  )}
                  {business?.bankName && (
                    <div className="text-[8px] text-slate-500 space-y-0.5 font-mono">
                      <p>Bank: {business.bankName}</p>
                      <p>Account: {business.accountNumber}</p>
                      <p>IFSC: {business.ifscCode}</p>
                    </div>
                  )}
                </div>
                {renderQRCode()}
              </div>
            </div>

            <div className="col-span-2 space-y-2 text-[10px] border-t border-slate-800 pt-2 text-right font-medium">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span className="font-mono text-slate-300">{formatCurrency(totals.subTotal, invoice.currency)}</span>
              </div>
              {totals.discountTotal > 0 && (
                <div className="flex justify-between text-red-400">
                  <span>Discount</span>
                  <span className="font-mono">-{formatCurrency(totals.discountTotal, invoice.currency)}</span>
                </div>
              )}
              {renderTaxLines(totals, invoice.currency)}
              <div className="flex justify-between items-center text-white bg-emerald-950/30 p-2 rounded-lg border border-emerald-900/30 font-black text-xs leading-none">
                <span className="text-emerald-400 uppercase tracking-wider text-[8px]">Total Due</span>
                <span className="font-mono text-sm text-emerald-400 font-black">
                  {formatCurrency(totals.grandTotal, invoice.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={cn("relative flex flex-col h-full bg-slate-100 dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 p-3 shadow-inner overflow-hidden", className)}>
      {/* Top action toolbar */}
      <div className="flex items-center justify-between mb-3 px-1 select-none">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-extrabold text-slate-550 dark:text-slate-300 uppercase tracking-wider">
            Real-time Live Preview
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsFullscreen(true)}
          className="h-7 text-[10px] font-bold px-2.5 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer flex items-center gap-1.5"
        >
          <Maximize2 className="w-3 h-3" />
          <span>Full Screen</span>
        </Button>
      </div>

      {/* Paper Container Mockup */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-850 shadow-md bg-white dark:bg-slate-950 min-h-[350px]">
        {renderTemplateContent()}
      </div>

      {/* FULL SCREEN MODAL */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-slate-100 dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-start">
          <DialogHeader className="mb-4 select-none">
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              Full Screen Document Preview
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Print or verify your final layout alignment.
            </DialogDescription>
          </DialogHeader>

          <div className="w-full flex-1 rounded-xl shadow-xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden">
            {renderTemplateContent()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Separator helper component
function Separator({ className = '' }: { className?: string }) {
  return <div className={cn("h-px w-full bg-slate-200 dark:bg-slate-800", className)} />;
}
