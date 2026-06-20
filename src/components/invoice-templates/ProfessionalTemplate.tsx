'use client';

import { InvoiceTemplateProps, DEFAULT_SETTINGS } from '@/components/invoice-templates/types';
import { formatCurrency, formatDate } from '@/lib/helpers';
import { cn } from '@/lib/utils';

export default function ProfessionalTemplate({
  invoice,
  totals,
  business,
  client,
  settings,
  size = 'preview',
}: InvoiceTemplateProps) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  const isPreview = size === 'preview';

  // ---------- helpers ----------
  const isInterState = totals.igstTotal > 0;

  const computeLineItem = (item: (typeof invoice.lineItems)[number]) => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const itemDiscount = Number(item.discount) || 0;
    const rowAmount = qty * rate;
    const discountValue =
      item.discountType === 'PERCENTAGE'
        ? rowAmount * (itemDiscount / 100)
        : itemDiscount;
    const taxableValue = rowAmount - discountValue;
    const gstRate = Number(item.gstRate) || 0;
    return { qty, rate, rowAmount, discountValue, taxableValue, gstRate };
  };

  const fc = (amount: number | string) => formatCurrency(amount, invoice.currency);

  const hasBankDetails =
    s.showBankDetails &&
    business &&
    (business.bankName || business.accountNumber || business.ifscCode || business.upiId);

  // ---------- render ----------
  return (
    <div
      className={cn(
        'bg-white text-slate-800 font-sans',
        isPreview ? 'p-4 text-[10px]' : 'p-8 text-[11px]'
      )}
    >
      {/* ========== TOP BAR ========== */}
      <div
        className={cn(
          'bg-slate-900 text-white rounded-lg flex items-center justify-between',
          isPreview ? 'p-3' : 'p-4'
        )}
      >
        {/* Left: Logo + Title */}
        <div className="flex items-center gap-3">
          {s.showLogo && business?.logo && (
            <img
              src={business.logo}
              alt="Logo"
              className={cn(
                'object-contain rounded',
                isPreview ? 'h-8 w-8' : 'h-10 w-10'
              )}
            />
          )}
          <div>
            <h1
              className={cn(
                'font-black tracking-widest uppercase',
                isPreview ? 'text-sm' : 'text-base'
              )}
            >
              TAX INVOICE
            </h1>
            <p className="font-mono text-slate-350 text-[10px] mt-0.5 text-slate-400">
              {invoice.invoiceNumber || '—'}
            </p>
          </div>
        </div>

        {/* Right: Dates */}
        <div className="text-right text-slate-300 space-y-0.5">
          <p>
            <span className="uppercase tracking-wide text-[8px] text-slate-400">Issue: </span>
            <span className="font-medium">{formatDate(invoice.issueDate)}</span>
          </p>
          <p>
            <span className="uppercase tracking-wide text-[8px] text-slate-400">Due: </span>
            <span className="font-medium">{formatDate(invoice.dueDate)}</span>
          </p>
        </div>
      </div>

      {/* ========== REVERSE CHARGE + PLACE OF SUPPLY ========== */}
      <div
        className={cn(
          'flex justify-between text-[9px] text-slate-500',
          isPreview ? 'mt-2 px-1' : 'mt-3 px-1'
        )}
      >
        <p>
          <span className="font-semibold">Reverse Charge:</span>{' '}
          {invoice.reverseCharge ? 'Yes' : 'No'}
        </p>
        {invoice.placeOfSupply && (
          <p>
            <span className="font-semibold">Place of Supply:</span> {invoice.placeOfSupply}
          </p>
        )}
      </div>

      {/* ========== ADDRESSES CARD ========== */}
      <div
        className={cn(
          'bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2',
          isPreview ? 'mt-3 p-3 gap-3' : 'mt-4 p-4 gap-6'
        )}
      >
        {/* Bill From */}
        <div>
          <p className="uppercase text-[8px] tracking-wider text-slate-450 font-semibold text-slate-500 mb-1">
            Sender (Bill From):
          </p>
          <p className={cn('font-bold text-slate-900', isPreview ? 'text-[11px]' : 'text-xs')}>
            {business?.name || '—'}
          </p>
          {business?.gstin && (
            <p className="font-mono font-bold text-emerald-700 text-[9px] mt-0.5">
              GSTIN: {business.gstin}
            </p>
          )}
          {business?.pan && (
            <p className="font-mono text-[9px] text-slate-600 mt-0.5">PAN: {business.pan}</p>
          )}
          <div className="mt-1 text-slate-600 leading-snug">
            {business?.address && <p>{business.address}</p>}
            <p>
              {[business?.city, business?.state, business?.pincode].filter(Boolean).join(', ')}
            </p>
            {business?.phone && <p>Ph: {business.phone}</p>}
            {business?.email && <p>{business.email}</p>}
          </div>
        </div>

        {/* Bill To */}
        <div>
          <p className="uppercase text-[8px] tracking-wider text-slate-450 font-semibold text-slate-500 mb-1">
            Recipient (Bill To):
          </p>
          <p className={cn('font-bold text-slate-900', isPreview ? 'text-[11px]' : 'text-xs')}>
            {client?.name || '—'}
          </p>
          {client?.gstin && (
            <p className="font-mono font-bold text-emerald-700 text-[9px] mt-0.5">
              GSTIN: {client.gstin}
            </p>
          )}
          <div className="mt-1 text-slate-600 leading-snug">
            {(client?.billingAddress || client?.address) && (
              <p>{client.billingAddress || client.address}</p>
            )}
            <p>
              {[client?.billingCity, client?.billingState, client?.billingPincode]
                .filter(Boolean)
                .join(', ')}
            </p>
            {client?.phone && <p>Ph: {client.phone}</p>}
            {client?.email && <p>{client.email}</p>}
          </div>
        </div>
      </div>

      {/* ========== CUSTOM FIELDS ========== */}
      {invoice.customFields && invoice.customFields.length > 0 && (
        <div className={cn('flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-slate-600', isPreview ? 'mt-2 px-1' : 'mt-3 px-1')}>
          {invoice.customFields.map((field, idx) => {
            const entries = Object.entries(field);
            return entries.map(([key, value]) => (
              <p key={`${idx}-${key}`}>
                <span className="font-semibold text-slate-700">{key}:</span> {value}
              </p>
            ));
          })}
        </div>
      )}

      {/* ========== LINE ITEMS TABLE ========== */}
      <div className={cn('overflow-hidden', isPreview ? 'mt-3' : 'mt-5')}>
        <table className="w-full border-collapse border border-slate-200">
          <thead>
            <tr className="bg-slate-100">
              <th className="text-left px-2 py-1.5 font-semibold text-slate-700 border border-slate-200 w-[6%]">
                #
              </th>
              <th className="text-left px-2 py-1.5 font-semibold text-slate-700 border border-slate-200">
                Description
              </th>
              <th className="text-left px-2 py-1.5 font-semibold text-slate-700 border border-slate-200 w-[12%]">
                HSN/SAC
              </th>
              <th className="text-right px-2 py-1.5 font-semibold text-slate-700 border border-slate-200 w-[8%]">
                Qty
              </th>
              <th className="text-right px-2 py-1.5 font-semibold text-slate-700 border border-slate-200 w-[12%]">
                Rate
              </th>
              <th className="text-right px-2 py-1.5 font-semibold text-slate-700 border border-slate-200 w-[10%]">
                Disc.
              </th>
              <th className="text-right px-2 py-1.5 font-semibold text-slate-700 border border-slate-200 w-[8%]">
                GST %
              </th>
              <th className="text-right px-2 py-1.5 font-semibold text-slate-700 border border-slate-200 w-[14%]">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((item, i) => {
              const calc = computeLineItem(item);
              return (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                  <td className="px-2 py-1.5 border border-slate-200 text-slate-500 text-center">
                    {i + 1}
                  </td>
                  <td className="px-2 py-1.5 border border-slate-200 text-slate-800 font-medium">
                    {item.description || '—'}
                    {item.unit && (
                      <span className="text-slate-400 ml-1 text-[9px]">({item.unit})</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 border border-slate-200 font-mono text-slate-600">
                    {item.hsnCode || '—'}
                  </td>
                  <td className="px-2 py-1.5 border border-slate-200 text-right">
                    {calc.qty}
                  </td>
                  <td className="px-2 py-1.5 border border-slate-200 text-right">
                    {fc(calc.rate)}
                  </td>
                  <td className="px-2 py-1.5 border border-slate-200 text-right text-slate-600">
                    {calc.discountValue > 0
                      ? item.discountType === 'PERCENTAGE'
                        ? `${Number(item.discount)}%`
                        : fc(calc.discountValue)
                      : '—'}
                  </td>
                  <td className="px-2 py-1.5 border border-slate-200 text-right">
                    {calc.gstRate}%
                  </td>
                  <td className="px-2 py-1.5 border border-slate-200 text-right font-semibold text-slate-900">
                    {fc(calc.taxableValue)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ========== FOOTER: BANK + NOTES  |  TOTALS ========== */}
      <div
        className={cn(
          'grid grid-cols-2',
          isPreview ? 'mt-3 gap-3' : 'mt-5 gap-6'
        )}
      >
        {/* ---------- Left Column: Bank Details + Notes ---------- */}
        <div className="space-y-3">
          {/* Bank Details */}
          {hasBankDetails && (
            <div className="border border-slate-200 rounded-lg p-3">
              <p className="uppercase text-[8px] tracking-wider font-semibold text-slate-500 mb-1.5">
                Bank &amp; Payment Details
              </p>
              <div className="space-y-0.5 text-slate-700">
                {business?.bankName && (
                  <p>
                    <span className="text-slate-500">Bank:</span>{' '}
                    <span className="font-medium">{business.bankName}</span>
                  </p>
                )}
                {business?.accountNumber && (
                  <p>
                    <span className="text-slate-500">A/C No:</span>{' '}
                    <span className="font-mono font-medium">{business.accountNumber}</span>
                  </p>
                )}
                {business?.ifscCode && (
                  <p>
                    <span className="text-slate-500">IFSC:</span>{' '}
                    <span className="font-mono font-medium">{business.ifscCode}</span>
                  </p>
                )}
                {business?.upiId && (
                  <p>
                    <span className="text-slate-500">UPI:</span>{' '}
                    <span className="font-mono font-medium">{business.upiId}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div>
              <p className="uppercase text-[8px] tracking-wider font-semibold text-slate-500 mb-1">
                Notes
              </p>
              <p className="italic text-slate-600 leading-snug whitespace-pre-line">
                {invoice.notes}
              </p>
            </div>
          )}

          {/* Terms */}
          {invoice.terms && (
            <div>
              <p className="uppercase text-[8px] tracking-wider font-semibold text-slate-500 mb-1">
                Terms &amp; Conditions
              </p>
              <p className="text-slate-600 leading-snug whitespace-pre-line">{invoice.terms}</p>
            </div>
          )}
        </div>

        {/* ---------- Right Column: Totals ---------- */}
        <div>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            {/* Totals rows */}
            <div className="divide-y divide-slate-100">
              <TotalRow label="Subtotal" value={fc(totals.subTotal)} />
              {totals.discountTotal > 0 && (
                <TotalRow
                  label="Discount"
                  value={`- ${fc(totals.discountTotal)}`}
                  valueClass="text-red-600"
                />
              )}
              <TotalRow label="Taxable Amount" value={fc(totals.taxableAmount)} bold />

              {isInterState ? (
                <TotalRow label="IGST" value={fc(totals.igstTotal)} />
              ) : (
                <>
                  <TotalRow label="CGST" value={fc(totals.cgstTotal)} />
                  <TotalRow label="SGST" value={fc(totals.sgstTotal)} />
                </>
              )}

              {totals.cessTotal > 0 && (
                <TotalRow label="Cess" value={fc(totals.cessTotal)} />
              )}

              {totals.roundOff !== 0 && (
                <TotalRow
                  label="Round Off"
                  value={`${totals.roundOff > 0 ? '+' : ''}${fc(totals.roundOff)}`}
                />
              )}
            </div>

            {/* Grand Total */}
            <div className="border-t-2 border-slate-900 bg-slate-50 px-3 py-2 flex justify-between items-center">
              <span
                className={cn(
                  'font-bold uppercase tracking-wide text-slate-900',
                  isPreview ? 'text-[11px]' : 'text-xs'
                )}
              >
                Grand Total
              </span>
              <span
                className={cn(
                  'font-bold text-slate-900',
                  isPreview ? 'text-[11px]' : 'text-xs'
                )}
              >
                {fc(totals.grandTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========== SIGNATURE ========== */}
      {s.showSignature && (
        <div
          className={cn(
            'flex justify-end',
            isPreview ? 'mt-4' : 'mt-8'
          )}
        >
          <div className="text-center">
            {business?.signature ? (
              <img
                src={business.signature}
                alt="Signature"
                className={cn(
                  'object-contain mx-auto',
                  isPreview ? 'h-8' : 'h-12'
                )}
              />
            ) : (
              <div
                className={cn(
                  'border-b border-slate-400',
                  isPreview ? 'w-28 h-6' : 'w-36 h-8'
                )}
              />
            )}
            <p className="text-[9px] text-slate-500 mt-1">Authorized Signatory</p>
            {business?.name && (
              <p className="text-[9px] font-semibold text-slate-700">{business.name}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Internal helper components ---------- */

function TotalRow({
  label,
  value,
  bold,
  valueClass,
}: {
  label: string;
  value: string;
  bold?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between px-3 py-1.5">
      <span className={cn('text-slate-600', bold && 'font-semibold text-slate-800')}>
        {label}
      </span>
      <span className={cn('text-right', bold && 'font-semibold text-slate-900', valueClass)}>
        {value}
      </span>
    </div>
  );
}
