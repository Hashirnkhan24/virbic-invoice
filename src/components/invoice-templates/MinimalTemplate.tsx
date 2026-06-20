'use client';

import { InvoiceTemplateProps } from '@/components/invoice-templates/types';
import { formatCurrency, formatDate } from '@/lib/helpers';
import { cn } from '@/lib/utils';

export default function MinimalTemplate({
  invoice,
  totals,
  business,
  client,
  settings,
  size = 'preview',
}: InvoiceTemplateProps) {
  const isPreview = size === 'preview';

  // ---------------------------------------------------------------------------
  // Line-item calculations
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const fc = (v: number | string) => formatCurrency(v, invoice.currency);
  const fd = (d: Date | string) => formatDate(d);
  const showBank = settings?.showBankDetails !== false;
  const showSignature = settings?.showSignature !== false;

  return (
    <div
      className={cn(
        'bg-white text-slate-900 font-sans',
        isPreview ? 'p-6 text-[10px]' : 'p-10 text-xs'
      )}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Header: INVOICE title + dates                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-start justify-between">
        {/* Left: title + invoice number */}
        <div>
          <h1
            className={cn(
              'font-bold uppercase tracking-widest text-slate-900',
              isPreview ? 'text-xl' : 'text-2xl'
            )}
          >
            Invoice
          </h1>
          <p className="mt-1 font-mono text-slate-500">
            {invoice.invoiceNumber || '—'}
          </p>
        </div>

        {/* Right: dates */}
        <div className="text-right space-y-0.5">
          <div>
            <span className="uppercase text-[8px] tracking-wider text-slate-400">
              Issue Date
            </span>
            <p className="text-slate-700">{fd(invoice.issueDate)}</p>
          </div>
          <div className="mt-1">
            <span className="uppercase text-[8px] tracking-wider text-slate-400">
              Due Date
            </span>
            <p className="text-slate-700">{fd(invoice.dueDate)}</p>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* From / To                                                           */}
      {/* ------------------------------------------------------------------ */}
      <div
        className={cn(
          'grid grid-cols-2 gap-8',
          isPreview ? 'mt-6' : 'mt-10'
        )}
      >
        {/* Bill From */}
        <div>
          <p className="uppercase text-[8px] tracking-wider text-slate-400 mb-1">
            From
          </p>
          <p className="font-semibold text-slate-900">
            {business?.name || '—'}
          </p>
          {business?.address && (
            <p className="text-slate-600">{business.address}</p>
          )}
          {(business?.city || business?.state || business?.pincode) && (
            <p className="text-slate-600">
              {[business.city, business.state, business.pincode]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
          {business?.phone && (
            <p className="text-slate-500">{business.phone}</p>
          )}
          {business?.email && (
            <p className="text-slate-500">{business.email}</p>
          )}
          {business?.gstin && (
            <p className="mt-1 font-mono text-slate-600">
              <span className="uppercase text-[8px] tracking-wider text-slate-400 mr-1">
                GSTIN
              </span>
              {business.gstin}
            </p>
          )}
        </div>

        {/* Bill To */}
        <div>
          <p className="uppercase text-[8px] tracking-wider text-slate-400 mb-1">
            To
          </p>
          <p className="font-semibold text-slate-900">
            {client?.name || '—'}
          </p>
          {client?.billingAddress && (
            <p className="text-slate-600">{client.billingAddress}</p>
          )}
          {(client?.billingCity ||
            client?.billingState ||
            client?.billingPincode) && (
            <p className="text-slate-600">
              {[client.billingCity, client.billingState, client.billingPincode]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
          {client?.phone && (
            <p className="text-slate-500">{client.phone}</p>
          )}
          {client?.email && (
            <p className="text-slate-500">{client.email}</p>
          )}
          {client?.gstin && (
            <p className="mt-1 font-mono text-slate-600">
              <span className="uppercase text-[8px] tracking-wider text-slate-400 mr-1">
                GSTIN
              </span>
              {client.gstin}
            </p>
          )}
        </div>
      </div>

      {/* Place of Supply + Reverse Charge */}
      <div
        className={cn(
          'flex items-center gap-6 text-slate-500',
          isPreview ? 'mt-4' : 'mt-6'
        )}
      >
        {invoice.placeOfSupply && (
          <p>
            <span className="uppercase text-[8px] tracking-wider text-slate-400 mr-1">
              Place of Supply
            </span>
            {invoice.placeOfSupply}
          </p>
        )}
        <p>
          <span className="uppercase text-[8px] tracking-wider text-slate-400 mr-1">
            Reverse Charge
          </span>
          {invoice.reverseCharge ? 'Yes' : 'No'}
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Line Items Table                                                    */}
      {/* ------------------------------------------------------------------ */}
      <table
        className={cn('w-full', isPreview ? 'mt-6' : 'mt-10')}
      >
        <thead>
          <tr className="border-b-2 border-slate-800">
            <th className="text-left uppercase text-[8px] tracking-wider text-slate-500 pb-2 font-medium">
              Description
            </th>
            <th className="text-right uppercase text-[8px] tracking-wider text-slate-500 pb-2 font-medium w-16">
              Qty
            </th>
            <th className="text-right uppercase text-[8px] tracking-wider text-slate-500 pb-2 font-medium w-24">
              Rate
            </th>
            <th className="text-right uppercase text-[8px] tracking-wider text-slate-500 pb-2 font-medium w-28">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {computedItems.map((item, i) => (
            <tr
              key={i}
              className="border-b border-slate-100"
            >
              <td className={cn('py-2 align-top', isPreview ? 'pr-2' : 'pr-4')}>
                <p className="text-slate-900">{item.description || '—'}</p>
                <p className="font-mono text-[8px] text-slate-400 mt-0.5">
                  {item.hsnCode && (
                    <span className="mr-2">HSN {item.hsnCode}</span>
                  )}
                  <span>GST {Number(item.gstRate) || 0}%</span>
                  {item.discountValue > 0 && (
                    <span className="ml-2">
                      Disc {item.discountType === 'PERCENTAGE'
                        ? `${Number(item.discount)}%`
                        : fc(item.discountValue)}
                    </span>
                  )}
                </p>
              </td>
              <td className="text-right py-2 align-top tabular-nums text-slate-700">
                {item.qty}
                {item.unit ? (
                  <span className="text-slate-400 ml-0.5">{item.unit}</span>
                ) : null}
              </td>
              <td className="text-right py-2 align-top tabular-nums text-slate-700">
                {fc(item.rate)}
              </td>
              <td className="text-right py-2 align-top tabular-nums text-slate-900 font-medium">
                {fc(item.finalAmount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ------------------------------------------------------------------ */}
      {/* Totals                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex justify-end">
        <div
          className={cn(
            'w-[180px] space-y-1',
            isPreview ? 'mt-4' : 'mt-6'
          )}
        >
          <Row label="Subtotal" value={fc(totals.subTotal)} />
          {totals.discountTotal > 0 && (
            <Row
              label="Discount"
              value={`- ${fc(totals.discountTotal)}`}
              muted
            />
          )}
          {totals.cgstTotal > 0 && (
            <Row label="CGST" value={fc(totals.cgstTotal)} muted />
          )}
          {totals.sgstTotal > 0 && (
            <Row label="SGST" value={fc(totals.sgstTotal)} muted />
          )}
          {totals.igstTotal > 0 && (
            <Row label="IGST" value={fc(totals.igstTotal)} muted />
          )}
          {totals.cessTotal > 0 && (
            <Row label="Cess" value={fc(totals.cessTotal)} muted />
          )}
          {totals.roundOff !== 0 && (
            <Row
              label="Round Off"
              value={fc(totals.roundOff)}
              muted
            />
          )}

          {/* Grand Total */}
          <div className="border-t border-slate-800 pt-1 mt-1 flex justify-between font-semibold text-slate-900">
            <span>Total Due</span>
            <span className="tabular-nums">{fc(totals.grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Bottom Section: Notes / Bank / Signature                            */}
      {/* ------------------------------------------------------------------ */}
      <div
        className={cn(
          'grid gap-8',
          showBank ? 'grid-cols-2' : 'grid-cols-1',
          isPreview ? 'mt-8' : 'mt-12'
        )}
      >
        {/* Left column: Notes, Terms, Bank */}
        <div className="space-y-4">
          {/* Notes */}
          {invoice.notes && (
            <div>
              <p className="uppercase text-[8px] tracking-wider text-slate-400 mb-0.5">
                Notes
              </p>
              <p className="font-mono text-slate-600 whitespace-pre-line">
                {invoice.notes}
              </p>
            </div>
          )}

          {/* Terms */}
          {invoice.terms && (
            <div>
              <p className="uppercase text-[8px] tracking-wider text-slate-400 mb-0.5">
                Terms & Conditions
              </p>
              <p className="font-mono text-slate-600 whitespace-pre-line">
                {invoice.terms}
              </p>
            </div>
          )}

          {/* Bank Details */}
          {showBank && business?.bankName && (
            <div>
              <p className="uppercase text-[8px] tracking-wider text-slate-400 mb-0.5">
                Bank Details
              </p>
              <div className="font-mono text-slate-600 space-y-0.5">
                <p>{business.bankName}</p>
                {business.accountNumber && (
                  <p>
                    <span className="text-slate-400">A/C </span>
                    {business.accountNumber}
                  </p>
                )}
                {business.ifscCode && (
                  <p>
                    <span className="text-slate-400">IFSC </span>
                    {business.ifscCode}
                  </p>
                )}
                {business.upiId && (
                  <p>
                    <span className="text-slate-400">UPI </span>
                    {business.upiId}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Signature */}
        {showSignature && (
          <div className="flex flex-col items-end justify-end">
            <div className="text-right">
              {business?.signature && (
                <img
                  src={business.signature}
                  alt="Signature"
                  className={cn(
                    'ml-auto object-contain mb-1',
                    isPreview ? 'h-8' : 'h-12'
                  )}
                />
              )}
              <div className="border-t border-slate-300 pt-1 mt-1">
                <p className="uppercase text-[8px] tracking-wider text-slate-400">
                  Authorized Signatory
                </p>
                {business?.name && (
                  <p className="text-slate-700 font-medium mt-0.5">
                    {business.name}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal Row helper — keeps the totals section DRY
// ---------------------------------------------------------------------------
function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex justify-between',
        muted ? 'text-slate-500' : 'text-slate-700'
      )}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
