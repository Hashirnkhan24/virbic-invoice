'use client';

import { InvoiceTemplateProps } from '@/components/invoice-templates/types';
import { formatCurrency, formatDate } from '@/lib/helpers';
import { cn } from '@/lib/utils';

export default function ModernTemplate({
  invoice,
  totals,
  business,
  client,
  settings,
  size = 'preview',
}: InvoiceTemplateProps) {
  const showLogo = settings?.showLogo !== false;
  const showSignature = settings?.showSignature !== false;
  const showBankDetails = settings?.showBankDetails !== false;

  const full = size === 'full';

  /* ── Line item helpers ─────────────────────────────────── */
  const computeRow = (item: (typeof invoice.lineItems)[number]) => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const itemDiscount = Number(item.discount) || 0;
    const rowAmount = qty * rate;
    const discountValue =
      item.discountType === 'PERCENTAGE'
        ? rowAmount * (itemDiscount / 100)
        : itemDiscount;
    const finalAmount = rowAmount - discountValue;
    return { qty, rate, rowAmount, discountValue, finalAmount };
  };

  /* ── Business initial fallback ─────────────────────────── */
  const initial = business?.name?.charAt(0)?.toUpperCase() ?? 'B';

  return (
    <div
      className={cn(
        'bg-white text-slate-800 font-sans',
        full ? 'p-8 text-[11px]' : 'p-5 text-[10px]'
      )}
    >
      {/* ═══════════════ HEADER ═══════════════ */}
      <div className="flex items-start justify-between gap-4">
        {/* Left – Logo + Business Info */}
        <div className="flex items-start gap-3">
          {showLogo && (
            <>
              {business?.logo ? (
                <img
                  src={business.logo}
                  alt={business.name}
                  className="w-10 h-10 rounded-xl object-contain"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-bold text-base shrink-0">
                  {initial}
                </div>
              )}
            </>
          )}

          <div>
            <h1 className={cn('font-bold text-slate-900', full ? 'text-lg' : 'text-sm')}>
              {business?.name || 'Your Business'}
            </h1>
            {business?.gstin && (
              <p className="text-slate-500 mt-0.5">
                <span className="font-medium text-slate-600">GSTIN:</span>{' '}
                {business.gstin}
              </p>
            )}
            {(business?.address || business?.city || business?.state) && (
              <p className="text-slate-500 mt-0.5 max-w-[220px] leading-snug">
                {[
                  business.address,
                  business.city,
                  business.state,
                  business.pincode,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            )}
            {business?.phone && (
              <p className="text-slate-500 mt-0.5">Ph: {business.phone}</p>
            )}
            {business?.email && (
              <p className="text-slate-500 mt-0.5">{business.email}</p>
            )}
          </div>
        </div>

        {/* Right – Invoice Badge + Meta */}
        <div className="text-right shrink-0">
          <span className="inline-block bg-emerald-50 text-emerald-700 font-semibold px-3 py-1 rounded-lg text-xs">
            Tax Invoice
          </span>
          <div className="mt-2 space-y-0.5">
            <p>
              <span className="text-slate-500">Invoice #</span>{' '}
              <span className="font-semibold text-slate-800">
                {invoice.invoiceNumber || '—'}
              </span>
            </p>
            <p>
              <span className="text-slate-500">Issue Date:</span>{' '}
              <span className="font-medium">{formatDate(invoice.issueDate)}</span>
            </p>
            <p>
              <span className="text-slate-500">Due Date:</span>{' '}
              <span className="font-medium">{formatDate(invoice.dueDate)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════ SEPARATOR ═══════════════ */}
      <hr className="my-4 border-slate-200" />

      {/* ═══════════════ BILL TO + REVERSE CHARGE ═══════════════ */}
      <div className="grid grid-cols-2 gap-6">
        {/* Bill To */}
        <div>
          <h2 className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
            Bill To
          </h2>
          <p className={cn('font-semibold text-slate-900', full ? 'text-sm' : 'text-xs')}>
            {client?.name || 'Customer Name'}
          </p>
          {client?.gstin && (
            <p className="text-slate-500 mt-0.5">
              <span className="font-medium text-slate-600">GSTIN:</span> {client.gstin}
            </p>
          )}
          {(client?.billingAddress ||
            client?.billingCity ||
            client?.billingState) && (
            <p className="text-slate-500 mt-0.5 max-w-[220px] leading-snug">
              {[
                client.billingAddress,
                client.billingCity,
                client.billingState,
                client.billingPincode,
              ]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
          {client?.phone && <p className="text-slate-500 mt-0.5">Ph: {client.phone}</p>}
          {client?.email && <p className="text-slate-500 mt-0.5">{client.email}</p>}

          {invoice.placeOfSupply && (
            <p className="mt-1.5 text-slate-500">
              <span className="font-medium text-slate-600">Place of Supply:</span>{' '}
              {invoice.placeOfSupply}
            </p>
          )}
        </div>

        {/* Right col – Reverse Charge */}
        <div className="flex flex-col items-end justify-start">
          {invoice.reverseCharge && (
            <span className="inline-block bg-amber-50 text-amber-700 font-medium px-2.5 py-0.5 rounded-md text-[9px] border border-amber-200">
              Reverse Charge Applicable
            </span>
          )}
        </div>
      </div>

      {/* ═══════════════ LINE ITEMS TABLE ═══════════════ */}
      <div className="mt-5 border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left py-2 px-3 font-semibold text-slate-600 w-[6%]">#</th>
              <th className="text-left py-2 px-3 font-semibold text-slate-600 w-[34%]">
                Item Description
              </th>
              <th className="text-left py-2 px-3 font-semibold text-slate-600">HSN/SAC</th>
              <th className="text-right py-2 px-3 font-semibold text-slate-600">Qty</th>
              <th className="text-right py-2 px-3 font-semibold text-slate-600">Rate</th>
              <th className="text-right py-2 px-3 font-semibold text-slate-600">GST%</th>
              <th className="text-right py-2 px-3 font-semibold text-slate-600">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((item, idx) => {
              const row = computeRow(item);
              return (
                <tr
                  key={idx}
                  className={cn(
                    'border-t border-slate-100',
                    idx % 2 === 1 && 'bg-slate-50/40'
                  )}
                >
                  <td className="py-2 px-3 text-slate-500">{idx + 1}</td>
                  <td className="py-2 px-3">
                    <span className="font-medium text-slate-800">
                      {item.description || '—'}
                    </span>
                    {item.unit && (
                      <span className="ml-1 text-slate-400 text-[9px]">
                        ({item.unit})
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-slate-600">{item.hsnCode || '—'}</td>
                  <td className="py-2 px-3 text-right text-slate-700">{row.qty}</td>
                  <td className="py-2 px-3 text-right">
                    <span className="text-slate-700">
                      {formatCurrency(row.rate, invoice.currency)}
                    </span>
                    {row.discountValue > 0 && (
                      <p className="text-red-500 text-[9px] mt-0.5">
                        −{' '}
                        {item.discountType === 'PERCENTAGE'
                          ? `${Number(item.discount)}%`
                          : formatCurrency(row.discountValue, invoice.currency)}
                      </p>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-600">
                    {Number(item.gstRate) || 0}%
                  </td>
                  <td className="py-2 px-3 text-right font-medium text-slate-800">
                    {formatCurrency(row.finalAmount, invoice.currency)}
                  </td>
                </tr>
              );
            })}

            {invoice.lineItems.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-6 text-slate-400 italic">
                  No items added
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ═══════════════ BOTTOM SECTION ═══════════════ */}
      <div className={cn('grid gap-6 mt-5', 'grid-cols-5')}>
        {/* ── Left 3 cols: Bank Details + Notes ── */}
        <div className="col-span-3 space-y-3">
          {/* Bank Details */}
          {showBankDetails &&
            (business?.bankName || business?.accountNumber || business?.ifscCode || business?.upiId) && (
              <div className="bg-slate-50/50 rounded-lg border border-slate-100 p-3">
                <h3 className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 mb-1.5">
                  Bank Details
                </h3>
                <div className="space-y-0.5 text-slate-600">
                  {business.bankName && (
                    <p>
                      <span className="font-medium text-slate-700">Bank:</span>{' '}
                      {business.bankName}
                    </p>
                  )}
                  {business.accountNumber && (
                    <p>
                      <span className="font-medium text-slate-700">A/C No:</span>{' '}
                      {business.accountNumber}
                    </p>
                  )}
                  {business.ifscCode && (
                    <p>
                      <span className="font-medium text-slate-700">IFSC:</span>{' '}
                      {business.ifscCode}
                    </p>
                  )}
                  {business.upiId && (
                    <p>
                      <span className="font-medium text-slate-700">UPI:</span>{' '}
                      {business.upiId}
                    </p>
                  )}
                </div>
              </div>
            )}

          {/* Notes */}
          {invoice.notes && (
            <div>
              <h3 className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
                Notes
              </h3>
              <p className="text-slate-600 leading-snug whitespace-pre-line">
                {invoice.notes}
              </p>
            </div>
          )}
        </div>

        {/* ── Right 2 cols: Totals Summary ── */}
        <div className="col-span-2">
          <div className="space-y-1">
            {/* Subtotal */}
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-medium text-slate-700">
                {formatCurrency(totals.subTotal, invoice.currency)}
              </span>
            </div>

            {/* Discount */}
            {totals.discountTotal > 0 && (
              <div className="flex justify-between text-red-500">
                <span>Discount</span>
                <span className="font-medium">
                  −{formatCurrency(totals.discountTotal, invoice.currency)}
                </span>
              </div>
            )}

            {/* Taxable Amount */}
            <div className="flex justify-between">
              <span className="text-slate-500">Taxable Amount</span>
              <span className="font-medium text-slate-700">
                {formatCurrency(totals.taxableAmount, invoice.currency)}
              </span>
            </div>

            {/* CGST */}
            {totals.cgstTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">CGST</span>
                <span className="font-medium text-slate-700">
                  {formatCurrency(totals.cgstTotal, invoice.currency)}
                </span>
              </div>
            )}

            {/* SGST */}
            {totals.sgstTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">SGST</span>
                <span className="font-medium text-slate-700">
                  {formatCurrency(totals.sgstTotal, invoice.currency)}
                </span>
              </div>
            )}

            {/* IGST */}
            {totals.igstTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">IGST</span>
                <span className="font-medium text-slate-700">
                  {formatCurrency(totals.igstTotal, invoice.currency)}
                </span>
              </div>
            )}

            {/* Cess */}
            {totals.cessTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Cess</span>
                <span className="font-medium text-slate-700">
                  {formatCurrency(totals.cessTotal, invoice.currency)}
                </span>
              </div>
            )}

            {/* Round Off */}
            {totals.roundOff !== 0 && (
              <div className="flex justify-between text-slate-400">
                <span>Round Off</span>
                <span>
                  {totals.roundOff > 0 ? '+' : ''}
                  {formatCurrency(totals.roundOff, invoice.currency)}
                </span>
              </div>
            )}

            {/* Grand Total */}
            <div className="mt-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 flex justify-between items-center">
              <span className="font-semibold text-emerald-700">Grand Total</span>
              <span className={cn('font-bold text-emerald-700', full ? 'text-base' : 'text-sm')}>
                {formatCurrency(totals.grandTotal, invoice.currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <div className="mt-6 pt-4 border-t border-slate-200">
        <div className="grid grid-cols-2 gap-6">
          {/* Terms & Conditions */}
          <div>
            {invoice.terms && (
              <>
                <h3 className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
                  Terms &amp; Conditions
                </h3>
                <p className="text-slate-500 leading-snug whitespace-pre-line">
                  {invoice.terms}
                </p>
              </>
            )}
          </div>

          {/* Signature */}
          <div className="flex flex-col items-end">
            {showSignature && (
              <div className="text-center">
                {business?.signature ? (
                  <img
                    src={business.signature}
                    alt="Signature"
                    className="h-10 object-contain mb-1"
                  />
                ) : (
                  <div className="h-10 mb-1" />
                )}
                <div className="border-t border-slate-300 pt-1 px-6">
                  <p className="text-[9px] text-slate-500">Authorized Signatory</p>
                  <p className="font-medium text-slate-700 text-[10px]">
                    {business?.name || 'Your Business'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
