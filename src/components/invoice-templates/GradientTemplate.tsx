'use client';

import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/helpers';
import { InvoiceTemplateProps } from '@/components/invoice-templates/types';

export default function GradientTemplate({
  invoice,
  totals,
  business,
  client,
  settings,
  size = 'preview',
}: InvoiceTemplateProps) {
  const isFull = size === 'full';

  return (
    <div
      className={cn(
        'bg-white text-slate-700 font-sans text-left select-none',
        isFull ? 'p-8 space-y-6' : 'p-5 space-y-4'
      )}
    >
      {/* ───────────────── GRADIENT HEADER ───────────────── */}
      <div
        className={cn(
          'bg-gradient-to-r from-orange-500 via-rose-500 to-purple-600 text-white rounded-2xl',
          isFull ? 'p-6' : 'p-5'
        )}
      >
        <div className="flex justify-between items-start gap-4">
          {/* Left: Logo + Business Info */}
          <div className="space-y-1.5">
            {settings?.showLogo !== false && business?.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.logo}
                alt="Business Logo"
                className="max-h-10 object-contain brightness-0 invert"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-black text-base text-white">
                {(business?.name || 'B').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="font-black text-sm text-white leading-tight">
                {business?.name || 'Business Name'}
              </h3>
              {business?.gstin && (
                <p className="text-[10px] text-white/80 font-mono">
                  GSTIN: {business.gstin}
                </p>
              )}
              <p className="text-[10px] text-white/70 leading-snug whitespace-pre-line max-w-[220px]">
                {business?.address}
                {business?.city ? `, ${business.city}` : ''}
                {business?.state ? ` (${business.state})` : ''}
                {business?.pincode ? ` - ${business.pincode}` : ''}
              </p>
              {business?.phone && (
                <p className="text-[10px] text-white/70">{business.phone}</p>
              )}
              {business?.email && (
                <p className="text-[10px] text-white/70">{business.email}</p>
              )}
            </div>
          </div>

          {/* Right: Invoice Info */}
          <div className="text-right space-y-1 flex-shrink-0">
            <span className="inline-block text-[9px] font-black bg-white/20 backdrop-blur-sm text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Tax Invoice
            </span>
            <h1 className="text-lg font-black text-white leading-tight">
              {invoice.invoiceNumber || 'INV-000'}
            </h1>
            <div className="text-[10px] text-white/80 space-y-0.5">
              <p>
                Issue Date:{' '}
                <span className="font-semibold text-white">
                  {formatDate(invoice.issueDate)}
                </span>
              </p>
              <p>
                Due Date:{' '}
                <span className="font-semibold text-white">
                  {formatDate(invoice.dueDate)}
                </span>
              </p>
              <p>
                Place of Supply:{' '}
                <span className="font-semibold text-white">
                  {invoice.placeOfSupply || 'N/A'}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────── CLIENT DETAILS + REVERSE CHARGE ───────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Bill To */}
        <div className="border-l-4 border-orange-400 pl-3 space-y-0.5">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
            Bill To
          </span>
          <h4 className="font-bold text-xs text-slate-900">
            {client?.name || 'Customer Name'}
          </h4>
          {client?.gstin && (
            <p className="text-[10px] font-mono text-orange-600 font-bold">
              GSTIN: {client.gstin}
            </p>
          )}
          <p className="text-[10px] text-slate-500 leading-snug whitespace-pre-line max-w-[220px]">
            {client?.billingAddress || client?.address || 'Billing Address'}
            {client?.billingCity ? `, ${client.billingCity}` : ''}
            {client?.billingState ? ` (${client.billingState})` : ''}
            {client?.billingPincode ? ` - ${client.billingPincode}` : ''}
          </p>
          {client?.email && (
            <p className="text-[10px] text-slate-400">{client.email}</p>
          )}
          {client?.phone && (
            <p className="text-[10px] text-slate-400">{client.phone}</p>
          )}
        </div>

        {/* Reverse Charge Badge */}
        <div className="flex items-start justify-end">
          {invoice.reverseCharge && (
            <span className="bg-rose-50 border border-rose-200 text-rose-700 text-[9px] font-bold px-2.5 py-1 rounded-lg">
              Reverse Charge Applicable
            </span>
          )}
        </div>
      </div>

      {/* ───────────────── LINE ITEMS TABLE ───────────────── */}
      <div className="overflow-hidden">
        <table className="w-full text-[10px] text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-orange-200 text-orange-600 uppercase text-[9px] font-bold tracking-wider">
              <th className="px-3 py-2 w-[5%]">#</th>
              <th className="px-2 py-2 w-[32%]">Description</th>
              <th className="px-2 py-2 text-center">HSN/SAC</th>
              <th className="px-2 py-2 text-right">Qty</th>
              <th className="px-2 py-2 text-right">Rate</th>
              <th className="px-2 py-2 text-right">Discount</th>
              <th className="px-2 py-2 text-right">GST %</th>
              <th className="px-3 py-2 text-right">Amount</th>
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
                    'border-b border-slate-100',
                    idx % 2 === 1 && 'bg-orange-50/30'
                  )}
                >
                  <td className="px-3 py-2 text-slate-400 font-mono">
                    {idx + 1}
                  </td>
                  <td className="px-2 py-2 text-slate-800">
                    <p className="font-semibold">
                      {item.description || 'Item Description'}
                    </p>
                  </td>
                  <td className="px-2 py-2 text-center text-slate-500 font-mono">
                    {item.hsnCode || '—'}
                  </td>
                  <td className="px-2 py-2 text-right text-slate-600 font-semibold">
                    {qty} {item.unit || 'PCS'}
                  </td>
                  <td className="px-2 py-2 text-right text-slate-600 font-mono">
                    {formatCurrency(rate, invoice.currency)}
                  </td>
                  <td className="px-2 py-2 text-right text-slate-500 font-mono">
                    {itemDiscount > 0 ? (
                      <span className="text-red-500">
                        {item.discountType === 'PERCENTAGE'
                          ? `${itemDiscount}%`
                          : formatCurrency(itemDiscount, invoice.currency)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-2 py-2 text-right text-slate-600 font-mono">
                    {item.gstRate}%
                  </td>
                  <td className="px-3 py-2 text-right text-slate-900 font-bold font-mono">
                    {formatCurrency(finalAmount, invoice.currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ───────────────── BOTTOM SECTION: Bank/Notes + Totals ───────────────── */}
      <div className="grid grid-cols-5 gap-6 pt-2">
        {/* Left Column: Bank Details & Notes */}
        <div className="col-span-3 space-y-4">
          {/* Bank Details */}
          {settings?.showBankDetails !== false && business?.bankName && (
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Bank Details
              </h4>
              <div className="text-[9px] text-slate-600 grid grid-cols-3 gap-y-0.5 leading-snug">
                <span className="font-medium">Bank Name:</span>
                <span className="col-span-2 font-bold text-slate-800">
                  {business.bankName}
                </span>
                <span className="font-medium">A/C Number:</span>
                <span className="col-span-2 font-bold text-slate-800 font-mono">
                  {business.accountNumber}
                </span>
                <span className="font-medium">IFSC Code:</span>
                <span className="col-span-2 font-bold text-slate-800 font-mono">
                  {business.ifscCode}
                </span>
                {business.upiId && (
                  <>
                    <span className="font-medium">UPI ID:</span>
                    <span className="col-span-2 font-bold text-slate-800 font-mono">
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
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                Notes
              </span>
              <p className="text-[10px] text-slate-500 italic max-w-[260px] leading-relaxed whitespace-pre-line">
                {invoice.notes}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Totals Summary */}
        <div className="col-span-2 space-y-1.5 text-[10px] leading-relaxed">
          {/* Subtotal */}
          <div className="flex justify-between text-slate-500 font-semibold">
            <span>Subtotal</span>
            <span className="font-mono">
              {formatCurrency(totals.subTotal, invoice.currency)}
            </span>
          </div>

          {/* Discount */}
          {totals.discountTotal > 0 && (
            <div className="flex justify-between text-red-500 font-semibold">
              <span>Discount</span>
              <span className="font-mono">
                -{formatCurrency(totals.discountTotal, invoice.currency)}
              </span>
            </div>
          )}

          {/* Gradient divider */}
          <div className="h-px bg-gradient-to-r from-orange-300 via-rose-300 to-purple-300" />

          {/* Taxable Amount */}
          <div className="flex justify-between text-slate-700 font-bold">
            <span>Taxable Amount</span>
            <span className="font-mono">
              {formatCurrency(totals.taxableAmount, invoice.currency)}
            </span>
          </div>

          {/* Tax Breakdown */}
          {totals.cgstTotal > 0 && (
            <div className="flex justify-between text-slate-500 font-mono text-[9px]">
              <span>CGST</span>
              <span>
                {formatCurrency(totals.cgstTotal, invoice.currency)}
              </span>
            </div>
          )}
          {totals.sgstTotal > 0 && (
            <div className="flex justify-between text-slate-500 font-mono text-[9px]">
              <span>SGST</span>
              <span>
                {formatCurrency(totals.sgstTotal, invoice.currency)}
              </span>
            </div>
          )}
          {totals.igstTotal > 0 && (
            <div className="flex justify-between text-slate-500 font-mono text-[9px]">
              <span>IGST</span>
              <span>
                {formatCurrency(totals.igstTotal, invoice.currency)}
              </span>
            </div>
          )}
          {totals.cessTotal > 0 && (
            <div className="flex justify-between text-slate-500 font-mono text-[9px]">
              <span>Cess</span>
              <span>
                {formatCurrency(totals.cessTotal, invoice.currency)}
              </span>
            </div>
          )}

          {/* Round Off */}
          {totals.roundOff !== 0 && (
            <div className="flex justify-between text-slate-400 font-mono text-[9px]">
              <span>Round Off</span>
              <span>
                {totals.roundOff > 0 ? '+' : ''}
                {formatCurrency(totals.roundOff, invoice.currency)}
              </span>
            </div>
          )}

          {/* Gradient divider */}
          <div className="h-px bg-gradient-to-r from-orange-300 via-rose-300 to-purple-300" />

          {/* Grand Total Pill */}
          <div className="flex justify-between items-center bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-xl px-4 py-2 font-black text-xs">
            <span className="uppercase tracking-wider text-[9px]">
              Total Due
            </span>
            <span className="font-mono text-sm">
              {formatCurrency(totals.grandTotal, invoice.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* ───────────────── FOOTER: Terms & Signature ───────────────── */}
      <div className="flex justify-between items-end gap-6 pt-4 border-t border-slate-100">
        {/* Terms & Conditions */}
        <div>
          {invoice.terms && (
            <div className="space-y-0.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                Terms &amp; Conditions
              </span>
              <p className="text-[8px] text-slate-400 whitespace-pre-line max-w-[240px] leading-tight">
                {invoice.terms}
              </p>
            </div>
          )}
        </div>

        {/* Signature */}
        <div className="text-right space-y-1 flex-shrink-0">
          <p className="text-[9px] text-slate-500 font-semibold">
            For {business?.name || 'Business Name'}
          </p>
          {settings?.showSignature !== false && business?.signature ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={business.signature}
              alt="Signature"
              className="max-h-8 object-contain ml-auto"
            />
          ) : (
            <div className="h-8 w-24 border-b-2 border-orange-300 ml-auto" />
          )}
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
            Authorized Signatory
          </span>
        </div>
      </div>
    </div>
  );
}
