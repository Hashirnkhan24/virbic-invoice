'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/helpers';
import type { InvoiceTemplateProps } from '@/components/invoice-templates/types';

export default function StartupTemplate({
  invoice,
  totals,
  business,
  client,
  settings,
  size = 'preview',
}: InvoiceTemplateProps) {
  const isPreview = size === 'preview';
  const showLogo = settings?.showLogo ?? true;
  const showSignature = settings?.showSignature ?? true;
  const showBankDetails = settings?.showBankDetails ?? true;

  /* ─── Line item calculations ─── */
  const computedItems = invoice.lineItems.map((item) => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const itemDiscount = Number(item.discount) || 0;
    const rowAmount = qty * rate;
    const discountValue =
      item.discountType === 'PERCENTAGE'
        ? rowAmount * (itemDiscount / 100)
        : itemDiscount;
    const finalAmount = rowAmount - discountValue;
    return { ...item, qty, rate, rowAmount, discountValue, finalAmount };
  });

  const hasIGST = totals.igstTotal > 0;
  const hasCess = totals.cessTotal > 0;

  /* ─── Neon glow inline style ─── */
  const neonGlow: React.CSSProperties = {
    textShadow: '0 0 12px rgba(34,211,238,0.4)',
  };

  const neonGlowSubtle: React.CSSProperties = {
    textShadow: '0 0 8px rgba(34,211,238,0.25)',
  };

  return (
    <div
      className={cn(
        'bg-slate-950 text-slate-300 w-full font-sans',
        isPreview ? 'p-4 text-[10px]' : 'p-8 text-[11px]'
      )}
    >
      {/* ═══════════ HEADER ═══════════ */}
      <div className="flex items-start justify-between mb-6">
        {/* Left: Business identity */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {showLogo && business?.logo && (
              <img
                src={business.logo}
                alt={business?.name ?? 'Logo'}
                className="h-8 w-8 rounded-md object-contain bg-slate-900 border border-slate-800"
              />
            )}
            <h1
              className={cn(
                'text-cyan-400 font-bold tracking-tight',
                isPreview ? 'text-sm' : 'text-lg'
              )}
              style={neonGlowSubtle}
            >
              {business?.name || 'Your Business'}
            </h1>
          </div>
          {business?.gstin && (
            <p className="text-slate-500 font-mono text-[9px] tracking-wide mt-0.5">
              GSTIN: {business.gstin}
            </p>
          )}
          {business?.pan && (
            <p className="text-slate-500 font-mono text-[9px]">
              PAN: {business.pan}
            </p>
          )}
          <div className="text-slate-500 text-[9px] mt-1 leading-relaxed max-w-[200px]">
            {business?.address && <span>{business.address}</span>}
            {(business?.city || business?.state) && (
              <span>
                {business?.address ? ', ' : ''}
                {[business?.city, business?.state].filter(Boolean).join(', ')}
              </span>
            )}
            {business?.pincode && <span> - {business.pincode}</span>}
          </div>
          {business?.phone && (
            <p className="text-slate-500 text-[9px] mt-0.5">{business.phone}</p>
          )}
          {business?.email && (
            <p className="text-slate-500 text-[9px]">{business.email}</p>
          )}
        </div>

        {/* Right: Invoice heading */}
        <div className="text-right flex-shrink-0">
          <h2
            className={cn(
              'text-cyan-400 font-black uppercase tracking-widest',
              isPreview ? 'text-lg' : 'text-2xl'
            )}
            style={neonGlow}
          >
            INVOICE
          </h2>
          <p
            className={cn(
              'text-white font-mono mt-1',
              isPreview ? 'text-xs' : 'text-lg'
            )}
          >
            {invoice.invoiceNumber || 'INV-0000'}
          </p>
          <div className="mt-2 space-y-0.5">
            <p className="text-slate-400 font-mono text-[9px]">
              <span className="text-slate-600 mr-1">Issued:</span>
              {formatDate(invoice.issueDate)}
            </p>
            <p className="text-slate-400 font-mono text-[9px]">
              <span className="text-slate-600 mr-1">Due:</span>
              {formatDate(invoice.dueDate)}
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════ BILL TO / PLACE OF SUPPLY / REVERSE CHARGE ═══════════ */}
      <div className="flex items-start justify-between gap-4 mb-5">
        {/* Bill To */}
        <div className="border-l-2 border-cyan-400 pl-3 flex-1">
          <p className="text-[8px] uppercase tracking-widest text-cyan-600 mb-0.5 font-semibold">
            Bill To
          </p>
          <p className={cn('text-white font-semibold', isPreview ? 'text-[11px]' : 'text-sm')}>
            {client?.name || 'Client Name'}
          </p>
          {client?.gstin && (
            <p className="text-slate-500 font-mono text-[9px] mt-0.5">
              GSTIN: {client.gstin}
            </p>
          )}
          <div className="text-slate-500 text-[9px] mt-0.5 leading-relaxed max-w-[200px]">
            {(client?.billingAddress || client?.address) && (
              <span>{client.billingAddress || client.address}</span>
            )}
            {(client?.billingCity || client?.billingState) && (
              <span>
                {(client?.billingAddress || client?.address) ? ', ' : ''}
                {[client?.billingCity, client?.billingState]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            )}
            {client?.billingPincode && <span> - {client.billingPincode}</span>}
          </div>
          {client?.phone && (
            <p className="text-slate-500 text-[9px] mt-0.5">{client.phone}</p>
          )}
          {client?.email && (
            <p className="text-slate-500 text-[9px]">{client.email}</p>
          )}
        </div>

        {/* Meta info */}
        <div className="text-right space-y-1 flex-shrink-0">
          <div>
            <p className="text-[8px] uppercase tracking-widest text-slate-600 font-semibold">
              Place of Supply
            </p>
            <p className="text-slate-300 text-[10px] font-mono">
              {invoice.placeOfSupply || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-[8px] uppercase tracking-widest text-slate-600 font-semibold">
              Reverse Charge
            </p>
            <p className="text-slate-300 text-[10px] font-mono">
              {invoice.reverseCharge ? 'Yes' : 'No'}
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════ LINE ITEMS TABLE ═══════════ */}
      <div className="mb-5">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cyan-900">
              <th className="text-left text-cyan-500 text-[8px] uppercase tracking-wider font-semibold py-1.5 pr-2">
                #
              </th>
              <th className="text-left text-cyan-500 text-[8px] uppercase tracking-wider font-semibold py-1.5 pr-2">
                Description
              </th>
              <th className="text-left text-cyan-500 text-[8px] uppercase tracking-wider font-semibold py-1.5 pr-2">
                HSN/SAC
              </th>
              <th className="text-right text-cyan-500 text-[8px] uppercase tracking-wider font-semibold py-1.5 pr-2">
                Qty
              </th>
              <th className="text-right text-cyan-500 text-[8px] uppercase tracking-wider font-semibold py-1.5 pr-2">
                Rate
              </th>
              <th className="text-right text-cyan-500 text-[8px] uppercase tracking-wider font-semibold py-1.5 pr-2">
                Disc.
              </th>
              <th className="text-right text-cyan-500 text-[8px] uppercase tracking-wider font-semibold py-1.5 pr-2">
                GST %
              </th>
              <th className="text-right text-cyan-500 text-[8px] uppercase tracking-wider font-semibold py-1.5">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {computedItems.map((item, idx) => (
              <tr
                key={idx}
                className={cn(
                  'border-b border-slate-900/50',
                  idx % 2 === 1 && 'bg-slate-900/50'
                )}
              >
                <td className="py-1.5 pr-2 text-slate-500 font-mono text-[9px]">
                  {String(idx + 1).padStart(2, '0')}
                </td>
                <td className="py-1.5 pr-2 text-slate-300 max-w-[140px]">
                  <span className="block truncate">{item.description || '—'}</span>
                </td>
                <td className="py-1.5 pr-2 text-slate-500 font-mono text-[9px]">
                  {item.hsnCode || '—'}
                </td>
                <td className="py-1.5 pr-2 text-right text-white font-mono">
                  {item.qty}
                  {item.unit ? (
                    <span className="text-slate-600 ml-0.5 text-[8px]">{item.unit}</span>
                  ) : null}
                </td>
                <td className="py-1.5 pr-2 text-right text-white font-mono">
                  {formatCurrency(item.rate, invoice.currency)}
                </td>
                <td className="py-1.5 pr-2 text-right text-slate-400 font-mono">
                  {item.discountValue > 0
                    ? item.discountType === 'PERCENTAGE'
                      ? `${Number(item.discount)}%`
                      : formatCurrency(item.discountValue, invoice.currency)
                    : '—'}
                </td>
                <td className="py-1.5 pr-2 text-right text-slate-400 font-mono">
                  {Number(item.gstRate) || 0}%
                </td>
                <td className="py-1.5 text-right text-white font-mono font-medium">
                  {formatCurrency(item.finalAmount, invoice.currency)}
                </td>
              </tr>
            ))}

            {computedItems.length === 0 && (
              <tr>
                <td colSpan={8} className="py-4 text-center text-slate-600 italic text-[10px]">
                  No line items added
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ═══════════ TOTALS ═══════════ */}
      <div className="flex justify-end mb-5">
        <div className={cn('space-y-1', isPreview ? 'w-[220px]' : 'w-[260px]')}>
          {/* Sub Total */}
          <div className="flex justify-between">
            <span className="text-slate-500">Sub Total</span>
            <span className="text-white font-mono">
              {formatCurrency(totals.subTotal, invoice.currency)}
            </span>
          </div>

          {/* Discount */}
          {totals.discountTotal > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">Discount</span>
              <span className="text-red-400 font-mono">
                -{formatCurrency(totals.discountTotal, invoice.currency)}
              </span>
            </div>
          )}

          {/* Taxable Amount */}
          <div className="flex justify-between">
            <span className="text-slate-500">Taxable Amount</span>
            <span className="text-white font-mono">
              {formatCurrency(totals.taxableAmount, invoice.currency)}
            </span>
          </div>

          {/* Tax breakdown */}
          {hasIGST ? (
            <div className="flex justify-between">
              <span className="text-slate-500">IGST</span>
              <span className="text-white font-mono">
                {formatCurrency(totals.igstTotal, invoice.currency)}
              </span>
            </div>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-slate-500">CGST</span>
                <span className="text-white font-mono">
                  {formatCurrency(totals.cgstTotal, invoice.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">SGST</span>
                <span className="text-white font-mono">
                  {formatCurrency(totals.sgstTotal, invoice.currency)}
                </span>
              </div>
            </>
          )}

          {/* Cess */}
          {hasCess && (
            <div className="flex justify-between">
              <span className="text-slate-500">Cess</span>
              <span className="text-white font-mono">
                {formatCurrency(totals.cessTotal, invoice.currency)}
              </span>
            </div>
          )}

          {/* Round Off */}
          {totals.roundOff !== 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">Round Off</span>
              <span className="text-slate-400 font-mono">
                {totals.roundOff > 0 ? '+' : ''}
                {formatCurrency(totals.roundOff, invoice.currency)}
              </span>
            </div>
          )}

          {/* Grand Total — neon card */}
          <div className="bg-cyan-950/30 border border-cyan-800 rounded-lg p-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider">
                Grand Total
              </span>
              <span
                className={cn(
                  'text-cyan-400 font-black font-mono',
                  isPreview ? 'text-sm' : 'text-base'
                )}
                style={neonGlowSubtle}
              >
                {formatCurrency(totals.grandTotal, invoice.currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ CUSTOM FIELDS ═══════════ */}
      {invoice.customFields && invoice.customFields.length > 0 && (
        <div className="mb-4 border-t border-slate-900 pt-3">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {invoice.customFields.map((field, idx) => {
              const entries = Object.entries(field);
              if (entries.length === 0) return null;
              const [label, value] = entries[0];
              return (
                <div key={idx} className="flex justify-between">
                  <span className="text-slate-500 text-[9px]">{label}</span>
                  <span className="text-slate-300 font-mono text-[9px]">{value}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════ BANK DETAILS ═══════════ */}
      {showBankDetails &&
        (business?.bankName || business?.accountNumber || business?.ifscCode || business?.upiId) && (
          <div className="bg-slate-900 border-l-2 border-cyan-400 rounded-r-lg p-3 mb-4">
            <p className="text-[8px] uppercase tracking-widest text-cyan-600 font-semibold mb-1.5">
              Bank Details
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
              {business?.bankName && (
                <div className="flex gap-2">
                  <span className="text-slate-600 text-[9px] shrink-0">Bank:</span>
                  <span className="text-slate-300 font-mono text-[9px]">{business.bankName}</span>
                </div>
              )}
              {business?.accountNumber && (
                <div className="flex gap-2">
                  <span className="text-slate-600 text-[9px] shrink-0">A/C No:</span>
                  <span className="text-slate-300 font-mono text-[9px]">
                    {business.accountNumber}
                  </span>
                </div>
              )}
              {business?.ifscCode && (
                <div className="flex gap-2">
                  <span className="text-slate-600 text-[9px] shrink-0">IFSC:</span>
                  <span className="text-slate-300 font-mono text-[9px]">{business.ifscCode}</span>
                </div>
              )}
              {business?.upiId && (
                <div className="flex gap-2">
                  <span className="text-slate-600 text-[9px] shrink-0">UPI:</span>
                  <span className="text-slate-300 font-mono text-[9px]">{business.upiId}</span>
                </div>
              )}
            </div>
          </div>
        )}

      {/* ═══════════ NOTES & TERMS ═══════════ */}
      <div className="flex gap-4 mb-5">
        {invoice.notes && (
          <div className="flex-1">
            <p className="text-[8px] uppercase tracking-widest text-slate-600 font-semibold mb-0.5">
              Notes
            </p>
            <p className="text-slate-400 italic text-[9px] leading-relaxed whitespace-pre-line">
              {invoice.notes}
            </p>
          </div>
        )}
        {invoice.terms && (
          <div className="flex-1">
            <p className="text-[8px] uppercase tracking-widest text-slate-600 font-semibold mb-0.5">
              Terms & Conditions
            </p>
            <p className="text-slate-500 text-[9px] leading-relaxed whitespace-pre-line">
              {invoice.terms}
            </p>
          </div>
        )}
      </div>

      {/* ═══════════ SIGNATURE / AUTHORIZED SIGNATORY ═══════════ */}
      <div className="border-t border-slate-900 pt-3 flex justify-end">
        <div className="text-right">
          {showSignature && business?.signature && (
            <img
              src={business.signature}
              alt="Signature"
              className="h-10 ml-auto mb-1 opacity-80"
            />
          )}
          <div className="w-28 border-t border-slate-700 pt-1 ml-auto">
            <p className="text-slate-500 text-[8px] uppercase tracking-wider">
              Authorized Signatory
            </p>
            <p className="text-slate-400 text-[9px] font-mono mt-0.5">
              {business?.name || 'Business Name'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
