'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/helpers';
import type { InvoiceTemplateProps } from '@/components/invoice-templates/types';

export default function ElegantTemplate({
  invoice,
  totals,
  business,
  client,
  settings,
  size = 'preview',
}: InvoiceTemplateProps) {
  const showLogo = settings?.showLogo ?? true;
  const showSignature = settings?.showSignature ?? true;
  const showBankDetails = settings?.showBankDetails ?? true;

  const isFull = size === 'full';

  // Calculate whether IGST or CGST/SGST applies
  const isInterState = totals.igstTotal > 0;

  return (
    <div
      className={cn(
        'bg-white text-stone-800 font-sans select-none',
        'border-t-2 border-amber-600',
        isFull ? 'p-8' : 'p-5'
      )}
    >
      {/* ─── Header ─── */}
      <div className="flex justify-between items-start gap-4">
        {/* Business Info */}
        <div className="flex items-start gap-3">
          {showLogo && business?.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={business.logo}
              alt="Logo"
              className={cn('object-contain rounded', isFull ? 'max-h-14' : 'max-h-10')}
            />
          ) : showLogo ? (
            <div
              className={cn(
                'rounded bg-amber-700 text-amber-100 flex items-center justify-center font-serif font-bold',
                isFull ? 'w-12 h-12 text-xl' : 'w-9 h-9 text-base'
              )}
            >
              {(business?.name || 'B').charAt(0)}
            </div>
          ) : null}

          <div>
            <h1
              className={cn(
                'font-serif font-bold text-stone-800 leading-tight',
                isFull ? 'text-xl' : 'text-lg'
              )}
            >
              {business?.name || 'Business Name'}
            </h1>
            {business?.gstin && (
              <p className="text-[10px] text-stone-500 font-mono mt-0.5">
                GSTIN: {business.gstin}
              </p>
            )}
            <p className="text-[10px] text-stone-500 leading-snug mt-0.5 max-w-[220px]">
              {business?.address}
              {business?.city ? `, ${business.city}` : ''}
              {business?.state ? ` — ${business.state}` : ''}
              {business?.pincode ? ` ${business.pincode}` : ''}
            </p>
            {(business?.phone || business?.email) && (
              <p className="text-[10px] text-stone-400 mt-0.5">
                {business?.phone}
                {business?.phone && business?.email ? ' · ' : ''}
                {business?.email}
              </p>
            )}
          </div>
        </div>

        {/* Invoice Title Badge */}
        <div className="text-right shrink-0">
          <span className="uppercase tracking-[0.2em] text-amber-700 text-[10px] font-semibold">
            Tax Invoice
          </span>
          <p className={cn('font-serif font-bold text-stone-800 mt-1', isFull ? 'text-base' : 'text-sm')}>
            {invoice.invoiceNumber || 'INV-0000'}
          </p>
        </div>
      </div>

      {/* Gold separator */}
      <div className="bg-amber-300 h-px w-full mt-4 mb-4" />

      {/* ─── Invoice Meta & Addresses ─── */}
      <div className={cn('grid gap-4', isFull ? 'grid-cols-3' : 'grid-cols-3')}>
        {/* Dates & Meta */}
        <div className="space-y-1.5">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-amber-700 font-semibold">Issue Date</p>
            <p className="text-[11px] text-stone-700 font-medium">{formatDate(invoice.issueDate)}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-amber-700 font-semibold">Due Date</p>
            <p className="text-[11px] text-stone-700 font-medium">{formatDate(invoice.dueDate)}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-amber-700 font-semibold">Place of Supply</p>
            <p className="text-[11px] text-stone-700 font-medium">{invoice.placeOfSupply || 'N/A'}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-amber-700 font-semibold">Reverse Charge</p>
            <p className="text-[11px] text-stone-700 font-medium">{invoice.reverseCharge ? 'Yes' : 'No'}</p>
          </div>
        </div>

        {/* Bill From */}
        <div className="border-l-2 border-amber-400 pl-3">
          <p className="text-[9px] uppercase tracking-wider text-amber-700 font-semibold mb-1">Bill From</p>
          <p className="text-[11px] font-semibold text-stone-800">{business?.name || '—'}</p>
          {business?.gstin && (
            <p className="text-[10px] text-stone-500 font-mono">GSTIN: {business.gstin}</p>
          )}
          <p className="text-[10px] text-stone-500 leading-snug mt-0.5">
            {business?.address}
            {business?.city ? `, ${business.city}` : ''}
            {business?.state ? `, ${business.state}` : ''}
            {business?.pincode ? ` - ${business.pincode}` : ''}
          </p>
        </div>

        {/* Bill To */}
        <div className="border-l-2 border-amber-400 pl-3">
          <p className="text-[9px] uppercase tracking-wider text-amber-700 font-semibold mb-1">Bill To</p>
          <p className="text-[11px] font-semibold text-stone-800">{client?.name || '—'}</p>
          {client?.gstin && (
            <p className="text-[10px] text-stone-500 font-mono">GSTIN: {client.gstin}</p>
          )}
          <p className="text-[10px] text-stone-500 leading-snug mt-0.5">
            {client?.billingAddress || client?.address}
            {client?.billingCity ? `, ${client.billingCity}` : ''}
            {client?.billingState ? `, ${client.billingState}` : ''}
            {client?.billingPincode ? ` - ${client.billingPincode}` : ''}
          </p>
          {(client?.email || client?.phone) && (
            <p className="text-[10px] text-stone-400 mt-0.5">
              {client?.phone}
              {client?.phone && client?.email ? ' · ' : ''}
              {client?.email}
            </p>
          )}
        </div>
      </div>

      {/* Gold separator */}
      <div className="bg-amber-300 h-px w-full mt-4 mb-3" />

      {/* ─── Custom Fields ─── */}
      {invoice.customFields && invoice.customFields.length > 0 && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 mb-3">
          {invoice.customFields.map((field, idx) => {
            const [key, value] = Object.entries(field)[0] || [];
            if (!key || !value) return null;
            return (
              <div key={idx}>
                <span className="text-[9px] uppercase tracking-wider text-amber-700 font-semibold">
                  {key}
                </span>
                <span className="text-[10px] text-stone-700 ml-1.5 font-medium">{value}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Line Items Table ─── */}
      <div className="overflow-hidden rounded-lg border border-stone-200">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="bg-stone-800 text-amber-100">
              <th className="text-left py-2 px-2 font-semibold w-[6%]">#</th>
              <th className="text-left py-2 px-2 font-semibold">Description</th>
              <th className="text-left py-2 px-2 font-semibold w-[10%]">HSN/SAC</th>
              <th className="text-right py-2 px-2 font-semibold w-[7%]">Qty</th>
              <th className="text-left py-2 px-2 font-semibold w-[8%]">Unit</th>
              <th className="text-right py-2 px-2 font-semibold w-[12%]">Rate</th>
              <th className="text-right py-2 px-2 font-semibold w-[8%]">GST%</th>
              <th className="text-right py-2 px-2 font-semibold w-[14%]">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((item, idx) => {
              const qty = Number(item.quantity) || 0;
              const rate = Number(item.rate) || 0;
              const itemDiscount = Number(item.discount) || 0;
              const rowAmount = qty * rate;
              const discountValue =
                item.discountType === 'PERCENTAGE'
                  ? rowAmount * (itemDiscount / 100)
                  : itemDiscount;
              const finalAmount = rowAmount - discountValue;

              return (
                <tr
                  key={idx}
                  className={cn(
                    'border-b border-stone-100',
                    idx % 2 === 1 ? 'bg-stone-50' : 'bg-white'
                  )}
                >
                  <td className="py-1.5 px-2 text-stone-400">{idx + 1}</td>
                  <td className="py-1.5 px-2 text-stone-800 font-medium">
                    {item.description || '—'}
                    {discountValue > 0 && (
                      <span className="ml-1 text-[9px] text-amber-600">
                        (-{item.discountType === 'PERCENTAGE' ? `${itemDiscount}%` : formatCurrency(discountValue, invoice.currency)})
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-stone-500 font-mono text-[9px]">
                    {item.hsnCode || '—'}
                  </td>
                  <td className="py-1.5 px-2 text-right text-stone-700">{qty}</td>
                  <td className="py-1.5 px-2 text-stone-500">{item.unit || '—'}</td>
                  <td className="py-1.5 px-2 text-right text-stone-700">
                    {formatCurrency(rate, invoice.currency)}
                  </td>
                  <td className="py-1.5 px-2 text-right text-stone-500">
                    {Number(item.gstRate) || 0}%
                  </td>
                  <td className="py-1.5 px-2 text-right text-stone-800 font-semibold">
                    {formatCurrency(finalAmount, invoice.currency)}
                  </td>
                </tr>
              );
            })}

            {/* Empty rows fill for visual consistency */}
            {invoice.lineItems.length < 3 &&
              Array.from({ length: 3 - invoice.lineItems.length }).map((_, i) => (
                <tr
                  key={`empty-${i}`}
                  className={cn(
                    'border-b border-stone-100',
                    (invoice.lineItems.length + i) % 2 === 1 ? 'bg-stone-50' : 'bg-white'
                  )}
                >
                  <td className="py-1.5 px-2">&nbsp;</td>
                  <td className="py-1.5 px-2" />
                  <td className="py-1.5 px-2" />
                  <td className="py-1.5 px-2" />
                  <td className="py-1.5 px-2" />
                  <td className="py-1.5 px-2" />
                  <td className="py-1.5 px-2" />
                  <td className="py-1.5 px-2" />
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* ─── Totals ─── */}
      <div className="flex justify-end mt-4">
        <div className={cn('space-y-1', isFull ? 'w-[280px]' : 'w-[240px]')}>
          {/* Subtotal */}
          <div className="flex justify-between text-[10px]">
            <span className="text-stone-500">Sub Total</span>
            <span className="text-stone-700 font-medium">
              {formatCurrency(totals.subTotal, invoice.currency)}
            </span>
          </div>

          {/* Discount */}
          {totals.discountTotal > 0 && (
            <div className="flex justify-between text-[10px]">
              <span className="text-stone-500">Discount</span>
              <span className="text-amber-700 font-medium">
                -{formatCurrency(totals.discountTotal, invoice.currency)}
              </span>
            </div>
          )}

          {/* Taxable Amount */}
          <div className="flex justify-between text-[10px]">
            <span className="text-stone-500">Taxable Amount</span>
            <span className="text-stone-700 font-medium">
              {formatCurrency(totals.taxableAmount, invoice.currency)}
            </span>
          </div>

          {/* Gold divider */}
          <div className="bg-amber-300 h-px w-full" />

          {/* Tax breakdown */}
          {isInterState ? (
            <div className="flex justify-between text-[10px]">
              <span className="text-stone-500">IGST</span>
              <span className="text-stone-700 font-medium">
                {formatCurrency(totals.igstTotal, invoice.currency)}
              </span>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-[10px]">
                <span className="text-stone-500">CGST</span>
                <span className="text-stone-700 font-medium">
                  {formatCurrency(totals.cgstTotal, invoice.currency)}
                </span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-stone-500">SGST</span>
                <span className="text-stone-700 font-medium">
                  {formatCurrency(totals.sgstTotal, invoice.currency)}
                </span>
              </div>
            </>
          )}

          {/* Cess */}
          {totals.cessTotal > 0 && (
            <div className="flex justify-between text-[10px]">
              <span className="text-stone-500">Cess</span>
              <span className="text-stone-700 font-medium">
                {formatCurrency(totals.cessTotal, invoice.currency)}
              </span>
            </div>
          )}

          {/* Round Off */}
          {totals.roundOff !== 0 && (
            <div className="flex justify-between text-[10px]">
              <span className="text-stone-500">Round Off</span>
              <span className="text-stone-500">
                {totals.roundOff > 0 ? '+' : ''}
                {formatCurrency(totals.roundOff, invoice.currency)}
              </span>
            </div>
          )}

          {/* Grand Total */}
          <div className="bg-stone-800 text-amber-100 rounded-lg p-2 flex justify-between items-center mt-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Grand Total</span>
            <span className={cn('font-bold font-serif', isFull ? 'text-sm' : 'text-[12px]')}>
              {formatCurrency(totals.grandTotal, invoice.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Gold separator */}
      <div className="bg-amber-300 h-px w-full mt-5 mb-4" />

      {/* ─── Footer: Bank Details, Notes, Terms, Signature ─── */}
      <div className={cn('grid gap-4', isFull ? 'grid-cols-3' : 'grid-cols-3')}>
        {/* Bank Details */}
        <div>
          {showBankDetails && (business?.bankName || business?.accountNumber) && (
            <div className="bg-stone-50 border border-amber-200 rounded-lg p-3 space-y-1">
              <p className="text-[9px] uppercase tracking-wider text-amber-700 font-semibold mb-1.5">
                Bank Details
              </p>
              {business?.bankName && (
                <div className="flex gap-1 text-[10px]">
                  <span className="text-stone-400 shrink-0">Bank:</span>
                  <span className="text-stone-700 font-medium">{business.bankName}</span>
                </div>
              )}
              {business?.accountNumber && (
                <div className="flex gap-1 text-[10px]">
                  <span className="text-stone-400 shrink-0">A/C:</span>
                  <span className="text-stone-700 font-mono font-medium">{business.accountNumber}</span>
                </div>
              )}
              {business?.ifscCode && (
                <div className="flex gap-1 text-[10px]">
                  <span className="text-stone-400 shrink-0">IFSC:</span>
                  <span className="text-stone-700 font-mono font-medium">{business.ifscCode}</span>
                </div>
              )}
              {business?.upiId && (
                <div className="flex gap-1 text-[10px]">
                  <span className="text-stone-400 shrink-0">UPI:</span>
                  <span className="text-stone-700 font-mono font-medium">{business.upiId}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notes & Terms */}
        <div className="space-y-2">
          {invoice.notes && (
            <div>
              <p className="text-[9px] uppercase tracking-wider text-amber-700 font-semibold mb-0.5">
                Notes
              </p>
              <p className="text-[10px] text-stone-500 leading-relaxed whitespace-pre-line">
                {invoice.notes}
              </p>
            </div>
          )}
          {invoice.terms && (
            <div>
              <p className="text-[9px] uppercase tracking-wider text-amber-700 font-semibold mb-0.5">
                Terms & Conditions
              </p>
              <p className="text-[10px] text-stone-500 leading-relaxed whitespace-pre-line">
                {invoice.terms}
              </p>
            </div>
          )}
        </div>

        {/* Signature */}
        <div className="flex flex-col items-end justify-end">
          {showSignature && (
            <div className="text-center w-[140px]">
              {business?.signature ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={business.signature}
                  alt="Signature"
                  className="max-h-10 object-contain mx-auto mb-1"
                />
              ) : (
                <div className="h-10 mb-1" />
              )}
              {/* Decorative gold line */}
              <div className="bg-amber-400 h-px w-full mb-1.5" />
              <p className="text-[10px] font-serif text-stone-700 font-semibold">
                Authorized Signatory
              </p>
              <p className="text-[9px] text-stone-400 mt-0.5">
                {business?.name || 'Business Name'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Elegant Footer Tagline ─── */}
      <div className="mt-5 pt-3 border-t border-amber-200 text-center">
        <p className="text-[8px] text-stone-400 tracking-widest uppercase">
          This is a computer-generated invoice and does not require a physical signature
        </p>
      </div>
    </div>
  );
}
