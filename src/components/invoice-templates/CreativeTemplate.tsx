'use client';

import { InvoiceTemplateProps, DEFAULT_SETTINGS } from '@/components/invoice-templates/types';
import { formatCurrency, formatDate } from '@/lib/helpers';
import { cn } from '@/lib/utils';

export default function CreativeTemplate({
  invoice,
  totals,
  business,
  client,
  settings,
  size = 'preview',
}: InvoiceTemplateProps) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  const isPreview = size === 'preview';

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                            */
  /* ------------------------------------------------------------------ */
  const firstLetter = (business?.name ?? 'B').charAt(0).toUpperCase();

  const hasIGST = totals.igstTotal > 0;

  const fc = (v: number | string) => formatCurrency(v, invoice.currency);
  const fd = (d: Date | string) => formatDate(d);

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */
  return (
    <div
      className={cn(
        'relative bg-white text-slate-700 overflow-hidden',
        isPreview ? 'text-[10px] p-6' : 'text-[12px] p-10',
      )}
    >
      {/* ── Gradient stripe ────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-violet-500 via-pink-500 to-emerald-400" />

      {/* ── Header ─────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex items-start justify-between',
          isPreview ? 'mt-2 mb-5' : 'mt-3 mb-7',
        )}
      >
        {/* Left: business identity */}
        <div className="flex items-center gap-3">
          {s.showLogo && business?.logo ? (
            <img
              src={business.logo}
              alt={business.name}
              className={cn(
                'object-contain rounded-2xl',
                isPreview ? 'w-10 h-10' : 'w-12 h-12',
              )}
            />
          ) : (
            <div
              className={cn(
                'flex items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-pink-500 text-white font-bold',
                isPreview ? 'w-10 h-10 text-lg' : 'w-12 h-12 text-xl',
              )}
            >
              {firstLetter}
            </div>
          )}
          <div>
            <p className={cn('font-bold text-slate-900', isPreview ? 'text-sm' : 'text-base')}>
              {business?.name ?? '—'}
            </p>
            {business?.gstin && (
              <p className="text-slate-500">
                GSTIN: <span className="font-medium text-slate-700">{business.gstin}</span>
              </p>
            )}
          </div>
        </div>

        {/* Right: INVOICE heading */}
        <div className="text-right">
          <h1
            className={cn(
              'font-extrabold tracking-tight bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent',
              isPreview ? 'text-xl' : 'text-2xl',
            )}
          >
            INVOICE
          </h1>
          <p className={cn('text-slate-500', isPreview ? 'mt-0.5' : 'mt-1')}>
            <span className="font-semibold text-slate-800">{invoice.invoiceNumber || '—'}</span>
          </p>
        </div>
      </div>

      {/* ── Info grid: dates + client ──────────────────────────── */}
      <div
        className={cn(
          'grid grid-cols-3 gap-4',
          isPreview ? 'mb-5' : 'mb-7',
        )}
      >
        {/* Bill From */}
        <div>
          <p className="uppercase font-bold text-violet-600 tracking-wider mb-1">Bill From</p>
          <p className="font-semibold text-slate-800">{business?.name ?? '—'}</p>
          {business?.address && <p>{business.address}</p>}
          {(business?.city || business?.state || business?.pincode) && (
            <p>
              {[business?.city, business?.state, business?.pincode].filter(Boolean).join(', ')}
            </p>
          )}
          {business?.phone && <p>Phone: {business.phone}</p>}
          {business?.email && <p>Email: {business.email}</p>}
          {business?.pan && <p>PAN: {business.pan}</p>}
        </div>

        {/* Bill To */}
        <div>
          <p className="uppercase font-bold text-violet-600 tracking-wider mb-1">Bill To</p>
          <p className="font-semibold text-slate-800">{client?.name ?? '—'}</p>
          {client?.billingAddress && <p>{client.billingAddress}</p>}
          {(client?.billingCity || client?.billingState || client?.billingPincode) && (
            <p>
              {[client?.billingCity, client?.billingState, client?.billingPincode]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
          {client?.gstin && (
            <p>
              GSTIN: <span className="font-medium">{client.gstin}</span>
            </p>
          )}
          {client?.phone && <p>Phone: {client.phone}</p>}
          {client?.email && <p>Email: {client.email}</p>}
        </div>

        {/* Dates & meta */}
        <div className="text-right space-y-1">
          <div>
            <p className="text-slate-400 uppercase text-[9px] tracking-wider">Issue Date</p>
            <p className="font-semibold text-slate-800">{fd(invoice.issueDate)}</p>
          </div>
          <div>
            <p className="text-slate-400 uppercase text-[9px] tracking-wider">Due Date</p>
            <p className="font-semibold text-slate-800">{fd(invoice.dueDate)}</p>
          </div>
          {invoice.placeOfSupply && (
            <div>
              <p className="text-slate-400 uppercase text-[9px] tracking-wider">Place of Supply</p>
              <p className="font-semibold text-slate-800">{invoice.placeOfSupply}</p>
            </div>
          )}
          <div>
            <p className="text-slate-400 uppercase text-[9px] tracking-wider">Reverse Charge</p>
            <p className="font-semibold text-slate-800">{invoice.reverseCharge ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </div>

      {/* ── Line-items table ───────────────────────────────────── */}
      <table className="w-full border-collapse mb-1">
        <thead>
          <tr className="border-b-2 border-slate-100">
            <th className="text-left py-2 pr-2 font-bold text-violet-600 uppercase tracking-wider">
              Product / Service Description
            </th>
            <th className="text-center py-2 px-2 font-bold text-slate-500 uppercase tracking-wider">
              Qty
            </th>
            <th className="text-right py-2 px-2 font-bold text-slate-500 uppercase tracking-wider">
              Price
            </th>
            <th className="text-right py-2 pl-2 font-bold text-violet-600 uppercase tracking-wider">
              Amount
            </th>
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
                  'border-b border-slate-50',
                  idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30',
                )}
              >
                <td className="py-2 pr-2">
                  <p className="font-medium text-slate-800">{item.description || '—'}</p>
                  <p className="text-slate-400">
                    {item.hsnCode && <span>HSN: {item.hsnCode}</span>}
                    {item.hsnCode && item.gstRate ? ' · ' : ''}
                    {item.gstRate ? <span>GST: {Number(item.gstRate)}%</span> : null}
                    {discountValue > 0 && (
                      <span>
                        {' '}
                        · Disc:{' '}
                        {item.discountType === 'PERCENTAGE'
                          ? `${itemDiscount}%`
                          : fc(itemDiscount)}
                      </span>
                    )}
                  </p>
                </td>
                <td className="text-center py-2 px-2 text-slate-600">
                  {qty}
                  {item.unit ? ` ${item.unit}` : ''}
                </td>
                <td className="text-right py-2 px-2 text-slate-600">{fc(rate)}</td>
                <td className="text-right py-2 pl-2 font-semibold text-slate-800">
                  {fc(finalAmount)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── Totals card ────────────────────────────────────────── */}
      <div className="flex justify-end">
        <div
          className={cn(
            'bg-slate-50/50 rounded-2xl border border-slate-100',
            isPreview ? 'w-60 p-4 mt-3' : 'w-72 p-5 mt-4',
          )}
        >
          <div className="space-y-1.5">
            <Row label="Sub Total" value={fc(totals.subTotal)} />
            {totals.discountTotal > 0 && (
              <Row label="Discount" value={`- ${fc(totals.discountTotal)}`} />
            )}
            <Row label="Taxable Amount" value={fc(totals.taxableAmount)} />

            {hasIGST ? (
              <Row label="IGST" value={fc(totals.igstTotal)} />
            ) : (
              <>
                <Row label="CGST" value={fc(totals.cgstTotal)} />
                <Row label="SGST" value={fc(totals.sgstTotal)} />
              </>
            )}

            {totals.cessTotal > 0 && <Row label="Cess" value={fc(totals.cessTotal)} />}
            {totals.roundOff !== 0 && (
              <Row label="Round Off" value={fc(totals.roundOff)} />
            )}

            <div className="border-t border-slate-200 pt-2 mt-2 flex items-center justify-between">
              <span className="font-bold text-slate-800">Grand Total</span>
              <span className="font-extrabold bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
                {fc(totals.grandTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bank details ───────────────────────────────────────── */}
      {s.showBankDetails &&
        business &&
        (business.bankName || business.accountNumber || business.ifscCode || business.upiId) && (
          <div
            className={cn(
              'border border-slate-100 rounded-xl',
              isPreview ? 'mt-5 p-3' : 'mt-6 p-4',
            )}
          >
            <p className="uppercase font-bold text-violet-600 tracking-wider mb-1.5">
              Bank Details
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              {business.bankName && (
                <p>
                  <span className="text-slate-400">Bank:</span>{' '}
                  <span className="font-medium text-slate-700">{business.bankName}</span>
                </p>
              )}
              {business.accountNumber && (
                <p>
                  <span className="text-slate-400">A/C No:</span>{' '}
                  <span className="font-medium text-slate-700">{business.accountNumber}</span>
                </p>
              )}
              {business.ifscCode && (
                <p>
                  <span className="text-slate-400">IFSC:</span>{' '}
                  <span className="font-medium text-slate-700">{business.ifscCode}</span>
                </p>
              )}
              {business.upiId && (
                <p>
                  <span className="text-slate-400">UPI:</span>{' '}
                  <span className="font-medium text-slate-700">{business.upiId}</span>
                </p>
              )}
            </div>
          </div>
        )}

      {/* ── Notes + Terms + Signature ──────────────────────────── */}
      <div
        className={cn(
          'grid gap-4',
          s.showSignature && business?.signature ? 'grid-cols-3' : 'grid-cols-2',
          isPreview ? 'mt-5' : 'mt-7',
        )}
      >
        {/* Notes */}
        <div>
          {invoice.notes && (
            <>
              <p className="uppercase font-bold text-violet-600 tracking-wider mb-1">Notes</p>
              <p className="italic text-slate-500 whitespace-pre-line leading-relaxed">
                {invoice.notes}
              </p>
            </>
          )}
        </div>

        {/* Terms */}
        <div>
          {invoice.terms && (
            <>
              <p className="uppercase font-bold text-violet-600 tracking-wider mb-1">
                Terms &amp; Conditions
              </p>
              <p className="italic text-slate-500 whitespace-pre-line leading-relaxed">
                {invoice.terms}
              </p>
            </>
          )}
        </div>

        {/* Signature */}
        {s.showSignature && business?.signature && (
          <div className="text-right flex flex-col items-end justify-end">
            <img
              src={business.signature}
              alt="Authorized Signature"
              className={cn('object-contain', isPreview ? 'h-10' : 'h-14')}
            />
            <div className="w-28 border-t border-slate-200 mt-1 pt-1">
              <p className="text-slate-500">Authorized Signatory</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Custom fields ──────────────────────────────────────── */}
      {invoice.customFields && invoice.customFields.length > 0 && (
        <div className={cn('border-t border-slate-100', isPreview ? 'mt-4 pt-3' : 'mt-5 pt-4')}>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            {invoice.customFields.map((cf, i) =>
              Object.entries(cf).map(([key, value]) => (
                <p key={`${i}-${key}`}>
                  <span className="text-slate-400">{key}:</span>{' '}
                  <span className="font-medium text-slate-700">{value}</span>
                </p>
              )),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------- */
/*  Tiny helper component for totals rows                                */
/* -------------------------------------------------------------------- */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-700">{value}</span>
    </div>
  );
}
