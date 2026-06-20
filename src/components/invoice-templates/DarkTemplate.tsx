'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/helpers';
import { InvoiceTemplateProps } from '@/components/invoice-templates/types';

export default function DarkTemplate({
  invoice,
  totals,
  business,
  client,
  settings,
  size = 'preview',
}: InvoiceTemplateProps) {
  const isFull = size === 'full';

  /* ── Line-item calculations ─────────────────────────── */
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
    return { ...item, qty, rate, itemDiscount, rowAmount, discountValue, finalAmount };
  });

  /* ── Logo badge (first letter or image) ─────────────── */
  const showLogo = settings?.showLogo !== false;
  const showSignature = settings?.showSignature !== false;
  const showBankDetails = settings?.showBankDetails !== false;

  return (
    <div
      className={cn(
        'font-sans text-left select-none bg-slate-950 text-slate-300',
        isFull ? 'p-8 space-y-8' : 'p-6 space-y-6'
      )}
    >
      {/* ═══════════════════════ HEADER ═══════════════════════ */}
      <div className="flex justify-between items-start gap-4">
        {/* Left: Logo + Supplier */}
        <div className="space-y-2">
          {showLogo && (
            <>
              {business?.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={business.logo}
                  alt="Business Logo"
                  className="max-h-12 object-contain rounded-xl"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-lg">
                  {business?.name ? business.name.charAt(0).toUpperCase() : 'B'}
                </div>
              )}
            </>
          )}
          <div>
            <h3 className="font-extrabold text-sm text-white">
              {business?.name || 'Business Name'}
            </h3>
            {business?.gstin && (
              <p className="text-[10px] text-slate-500 font-mono">GSTIN: {business.gstin}</p>
            )}
            {business?.pan && (
              <p className="text-[10px] text-slate-500 font-mono">PAN: {business.pan}</p>
            )}
            <p className="text-[10px] text-slate-400 whitespace-pre-line leading-relaxed max-w-[220px]">
              {business?.address}
              {business?.city ? `, ${business.city}` : ''}
              {business?.state ? ` (${business.state})` : ''}
              {business?.pincode ? ` - ${business.pincode}` : ''}
            </p>
            {business?.phone && (
              <p className="text-[10px] text-slate-500 font-mono">{business.phone}</p>
            )}
            {business?.email && (
              <p className="text-[10px] text-slate-500">{business.email}</p>
            )}
          </div>
        </div>

        {/* Right: Tax Invoice badge + Invoice # + Dates */}
        <div className="text-right space-y-1">
          <span className="inline-block text-[9px] font-black text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded uppercase tracking-wider">
            Tax Invoice
          </span>
          <h1 className="text-xl font-black text-white">
            {invoice.invoiceNumber || 'INV-000'}
          </h1>
          <div className="text-[10px] text-slate-400 space-y-0.5 font-mono">
            <p>
              Issue Date:{' '}
              <span className="text-slate-300">{formatDate(invoice.issueDate)}</span>
            </p>
            <p>
              Due Date:{' '}
              <span className="text-slate-300">{formatDate(invoice.dueDate)}</span>
            </p>
            <p>
              Place of Supply:{' '}
              <span className="text-slate-300">{invoice.placeOfSupply || 'N/A'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════ SEPARATOR ═══════════════════════ */}
      <div className="h-px w-full bg-slate-800" />

      {/* ═══════════════════════ BILL TO + REVERSE CHARGE ═══════════════════════ */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
            Bill To
          </span>
          <h4 className="font-bold text-xs text-white">
            {client?.name || 'Customer Name'}
          </h4>
          {client?.gstin && (
            <p className="text-[10px] font-mono text-emerald-400 font-bold">
              GSTIN: {client.gstin}
            </p>
          )}
          <p className="text-[10px] text-slate-400 leading-snug whitespace-pre-line max-w-[240px]">
            {client?.billingAddress || client?.address || 'Billing Address'}
            {client?.billingCity ? `, ${client.billingCity}` : ''}
            {client?.billingState ? ` (${client.billingState})` : ''}
            {client?.billingPincode ? ` - ${client.billingPincode}` : ''}
          </p>
          {client?.phone && (
            <p className="text-[10px] text-slate-500 font-mono">{client.phone}</p>
          )}
          {client?.email && (
            <p className="text-[10px] text-slate-500">{client.email}</p>
          )}
        </div>

        <div className="text-right flex flex-col items-end gap-2">
          {invoice.reverseCharge && (
            <span className="bg-amber-950/40 border border-amber-800/30 text-amber-400 text-[9px] font-bold px-2 py-0.5 rounded">
              Reverse Charge Applicable
            </span>
          )}
          {!invoice.reverseCharge && (
            <span className="text-[9px] text-slate-600 font-mono">
              Reverse Charge: No
            </span>
          )}
        </div>
      </div>

      {/* ═══════════════════════ CUSTOM FIELDS ═══════════════════════ */}
      {invoice.customFields && invoice.customFields.length > 0 && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[10px]">
          {invoice.customFields.map((field, idx) => {
            const [key, value] = Object.entries(field)[0] || [];
            if (!key) return null;
            return (
              <p key={idx} className="text-slate-500">
                <span className="font-semibold text-slate-400">{key}:</span>{' '}
                <span className="text-slate-300 font-mono">{value}</span>
              </p>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════ LINE ITEMS TABLE ═══════════════════════ */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/30">
        <table className="w-full text-[10px] text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold">
              <th className="px-3 py-2 w-[32%]">Item Description</th>
              <th className="px-2 py-2 text-center font-mono">HSN/SAC</th>
              <th className="px-2 py-2 text-right">Qty</th>
              <th className="px-2 py-2 text-right">Rate</th>
              <th className="px-2 py-2 text-right">Discount</th>
              <th className="px-2 py-2 text-right">GST</th>
              <th className="px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {computedItems.map((item, idx) => {
              let discountText = '';
              if (item.itemDiscount > 0) {
                discountText =
                  item.discountType === 'PERCENTAGE'
                    ? `${item.itemDiscount}%`
                    : formatCurrency(item.itemDiscount, invoice.currency);
              }

              return (
                <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                  <td className="px-3 py-2.5 text-slate-200">
                    <p className="font-semibold">{item.description || 'Description'}</p>
                    {item.hsnCode && (
                      <p className="text-[8px] text-slate-500 font-mono mt-0.5">
                        HSN/SAC: {item.hsnCode}
                      </p>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-center font-mono text-slate-500">
                    {item.hsnCode || '—'}
                  </td>
                  <td className="px-2 py-2.5 text-right font-medium text-slate-400">
                    {item.qty} {item.unit || 'PCS'}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-slate-400">
                    {formatCurrency(item.rate, invoice.currency)}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-slate-500">
                    {discountText || '—'}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-slate-500">
                    {item.gstRate}%
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-100 font-bold font-mono">
                    {formatCurrency(item.finalAmount, invoice.currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ═══════════════════════ BOTTOM GRID: NOTES/BANK vs TOTALS ═══════════════════════ */}
      <div className="grid grid-cols-5 gap-6 pt-2">
        {/* Left Col (3/5) — Bank Details & Notes */}
        <div className="col-span-3 space-y-4">
          {/* Bank Details */}
          {showBankDetails && business?.bankName && (
            <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-lg space-y-1.5">
              <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                Bank Details
              </h4>
              <div className="text-[9px] text-slate-500 grid grid-cols-3 gap-y-0.5 leading-snug font-mono">
                <span className="font-medium">Bank Name:</span>
                <span className="col-span-2 font-bold text-slate-400">
                  {business.bankName}
                </span>
                <span className="font-medium">A/C Number:</span>
                <span className="col-span-2 font-bold text-slate-400">
                  {business.accountNumber}
                </span>
                <span className="font-medium">IFSC Code:</span>
                <span className="col-span-2 font-bold text-slate-400">
                  {business.ifscCode}
                </span>
                {business.upiId && (
                  <>
                    <span className="font-medium">UPI ID:</span>
                    <span className="col-span-2 font-bold text-emerald-400">
                      {business.upiId}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                Notes
              </span>
              <p className="text-[10px] text-slate-400 italic leading-relaxed whitespace-pre-line max-w-[280px]">
                {invoice.notes}
              </p>
            </div>
          )}

          {/* Terms & Conditions */}
          {invoice.terms && (
            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                Terms &amp; Conditions
              </span>
              <p className="text-[9px] text-slate-500 whitespace-pre-line leading-snug max-w-[280px]">
                {invoice.terms}
              </p>
            </div>
          )}
        </div>

        {/* Right Col (2/5) — Totals Summary */}
        <div className="col-span-2 space-y-2 text-[10px] border-t border-slate-800 pt-2 text-right font-medium">
          {/* Subtotal */}
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span className="font-mono text-slate-300">
              {formatCurrency(totals.subTotal, invoice.currency)}
            </span>
          </div>

          {/* Discount */}
          {totals.discountTotal > 0 && (
            <div className="flex justify-between text-red-400">
              <span>Discount</span>
              <span className="font-mono">
                -{formatCurrency(totals.discountTotal, invoice.currency)}
              </span>
            </div>
          )}

          {/* Taxable Amount */}
          <div className="flex justify-between text-slate-400 font-bold border-b border-slate-800 pb-1.5">
            <span>Taxable Amount</span>
            <span className="font-mono text-slate-200">
              {formatCurrency(totals.taxableAmount, invoice.currency)}
            </span>
          </div>

          {/* Tax breakdown */}
          {totals.cgstTotal > 0 && (
            <div className="flex justify-between text-slate-500 font-mono text-[9px]">
              <span>CGST</span>
              <span>{formatCurrency(totals.cgstTotal, invoice.currency)}</span>
            </div>
          )}
          {totals.sgstTotal > 0 && (
            <div className="flex justify-between text-slate-500 font-mono text-[9px]">
              <span>SGST</span>
              <span>{formatCurrency(totals.sgstTotal, invoice.currency)}</span>
            </div>
          )}
          {totals.igstTotal > 0 && (
            <div className="flex justify-between text-slate-500 font-mono text-[9px]">
              <span>IGST</span>
              <span>{formatCurrency(totals.igstTotal, invoice.currency)}</span>
            </div>
          )}
          {totals.cessTotal > 0 && (
            <div className="flex justify-between text-slate-500 font-mono text-[9px]">
              <span>Cess</span>
              <span>{formatCurrency(totals.cessTotal, invoice.currency)}</span>
            </div>
          )}
          {totals.roundOff !== 0 && (
            <div className="flex justify-between text-slate-600 font-mono text-[9px]">
              <span>Round Off</span>
              <span>
                {totals.roundOff > 0 ? '+' : ''}
                {formatCurrency(totals.roundOff, invoice.currency)}
              </span>
            </div>
          )}

          {/* Grand Total */}
          <div className="flex justify-between items-center text-white bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-900/30 font-black text-xs leading-none">
            <span className="text-emerald-400 uppercase tracking-wider text-[9px]">
              Total Due
            </span>
            <span className="font-mono text-sm text-emerald-400 font-black">
              {formatCurrency(totals.grandTotal, invoice.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════ FOOTER: SIGNATURE ═══════════════════════ */}
      <div className="flex justify-between items-end gap-6 pt-4 border-t border-slate-800">
        {/* Left spacer for alignment */}
        <div />

        {/* Signature Area */}
        {showSignature && (
          <div className="text-right space-y-1 flex-shrink-0">
            <p className="text-[9px] text-slate-600 mb-1">
              For {business?.name || 'Business Name'}
            </p>
            {business?.signature ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.signature}
                alt="Authorized Signature"
                className="max-h-10 object-contain ml-auto opacity-90"
              />
            ) : (
              <div className="h-10 w-28 border-b border-slate-700 ml-auto" />
            )}
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">
              Authorized Signatory
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
