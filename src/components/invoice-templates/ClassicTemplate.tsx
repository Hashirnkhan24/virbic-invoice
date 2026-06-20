'use client';

import { InvoiceTemplateProps } from '@/components/invoice-templates/types';
import { formatCurrency, formatDate } from '@/lib/helpers';
import { cn } from '@/lib/utils';

// ── Number-to-words converter (Indian numbering) ──────────────────────────
function numberToWords(num: number): string {
  if (num === 0) return 'Zero';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
  ];

  function twoDigit(n: number): string {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  }

  function threeDigit(n: number): string {
    if (n >= 100) {
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + twoDigit(n % 100) : '');
    }
    return twoDigit(n);
  }

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = Math.floor(num % 1000);
  const paise = Math.round((num % 1) * 100);

  let result = '';
  if (crore) result += threeDigit(crore) + ' Crore ';
  if (lakh) result += twoDigit(lakh) + ' Lakh ';
  if (thousand) result += twoDigit(thousand) + ' Thousand ';
  if (remainder) result += threeDigit(remainder);

  result = result.trim() + ' Rupees';
  if (paise > 0) result += ' and ' + twoDigit(paise) + ' Paise';
  result += ' Only';

  return result;
}

// ── Classic Template ──────────────────────────────────────────────────────
export default function ClassicTemplate({
  invoice,
  totals,
  business,
  client,
  settings,
  size = 'full',
}: InvoiceTemplateProps) {
  const showLogo = settings?.showLogo !== false && business?.logo;
  const showSignature = settings?.showSignature !== false && business?.signature;
  const showBank = settings?.showBankDetails !== false;

  const isInterState = totals.igstTotal > 0;

  return (
    <div
      className={cn(
        'bg-white text-gray-900 w-full font-sans',
        size === 'preview' ? 'p-3 text-[7px]' : 'p-8 text-[10px]'
      )}
    >
      {/* ═══ TOP HEADING BAR ═══ */}
      <div className="text-center mb-1">
        <h1
          className={cn(
            'font-serif font-bold uppercase tracking-[0.25em] text-amber-900',
            size === 'preview' ? 'text-[10px]' : 'text-[15px]'
          )}
        >
          Tax Invoice
        </h1>
      </div>
      <div className="border-t-4 border-double border-amber-800 mb-4" />

      {/* ═══ BUSINESS HEADER ═══ */}
      <div className="flex items-start justify-between mb-4">
        {/* Logo + Business Name */}
        <div className="flex items-center gap-3">
          {showLogo && (
            <img
              src={business.logo}
              alt="Logo"
              className={cn(
                'object-contain rounded',
                size === 'preview' ? 'h-8 w-8' : 'h-14 w-14'
              )}
            />
          )}
          <div>
            <h2
              className={cn(
                'font-serif font-bold text-amber-900',
                size === 'preview' ? 'text-[9px]' : 'text-lg'
              )}
            >
              {business?.name || 'Your Business Name'}
            </h2>
            {business?.gstin && (
              <p className="font-mono text-amber-800 mt-0.5">
                GSTIN: {business.gstin}
              </p>
            )}
            {business?.pan && (
              <p className="font-mono text-amber-800">PAN: {business.pan}</p>
            )}
          </div>
        </div>

        {/* Invoice Meta */}
        <div className="text-right">
          <table className="ml-auto">
            <tbody>
              <tr>
                <td className="pr-2 text-gray-500 text-right">Invoice No.:</td>
                <td className="font-semibold text-amber-900">
                  {invoice.invoiceNumber || '—'}
                </td>
              </tr>
              <tr>
                <td className="pr-2 text-gray-500 text-right">Date:</td>
                <td>{formatDate(invoice.issueDate)}</td>
              </tr>
              <tr>
                <td className="pr-2 text-gray-500 text-right">Due Date:</td>
                <td>{formatDate(invoice.dueDate)}</td>
              </tr>
              <tr>
                <td className="pr-2 text-gray-500 text-right">
                  Place of Supply:
                </td>
                <td>{invoice.placeOfSupply || '—'}</td>
              </tr>
              <tr>
                <td className="pr-2 text-gray-500 text-right">
                  Reverse Charge:
                </td>
                <td>{invoice.reverseCharge ? 'Yes' : 'No'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ BILL FROM / BILL TO ═══ */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-0 border border-amber-200 rounded mb-4">
        {/* Bill From */}
        <div className={cn('p-2', size === 'preview' ? 'p-1.5' : 'p-3')}>
          <h3 className="font-serif font-bold text-amber-900 uppercase tracking-wide mb-1 border-b border-amber-200 pb-0.5">
            Bill From
          </h3>
          <p className="font-semibold">{business?.name || '—'}</p>
          {business?.address && <p>{business.address}</p>}
          <p>
            {[business?.city, business?.state, business?.pincode]
              .filter(Boolean)
              .join(', ') || ''}
          </p>
          {business?.phone && <p>Phone: {business.phone}</p>}
          {business?.email && <p>Email: {business.email}</p>}
          {business?.gstin && (
            <p className="font-mono text-amber-800 mt-0.5">
              GSTIN: {business.gstin}
            </p>
          )}
        </div>

        {/* Decorative separator */}
        <div className="w-px bg-amber-300 my-2" />

        {/* Bill To */}
        <div className={cn('p-2', size === 'preview' ? 'p-1.5' : 'p-3')}>
          <h3 className="font-serif font-bold text-amber-900 uppercase tracking-wide mb-1 border-b border-amber-200 pb-0.5">
            Bill To
          </h3>
          <p className="font-semibold">{client?.name || '—'}</p>
          {client?.billingAddress && <p>{client.billingAddress}</p>}
          <p>
            {[client?.billingCity, client?.billingState, client?.billingPincode]
              .filter(Boolean)
              .join(', ') || ''}
          </p>
          {client?.phone && <p>Phone: {client.phone}</p>}
          {client?.email && <p>Email: {client.email}</p>}
          {client?.gstin && (
            <p className="font-mono text-amber-800 mt-0.5">
              GSTIN: {client.gstin}
            </p>
          )}
        </div>
      </div>

      {/* ═══ LINE ITEMS TABLE ═══ */}
      <div className="border border-amber-200 rounded overflow-hidden mb-4">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-amber-100 text-amber-900">
              <th className="border border-amber-200 px-1 py-1 text-center font-serif font-bold">
                S.No.
              </th>
              <th className="border border-amber-200 px-1 py-1 text-left font-serif font-bold">
                Description
              </th>
              <th className="border border-amber-200 px-1 py-1 text-center font-serif font-bold">
                HSN/SAC
              </th>
              <th className="border border-amber-200 px-1 py-1 text-center font-serif font-bold">
                Qty
              </th>
              <th className="border border-amber-200 px-1 py-1 text-right font-serif font-bold">
                Rate
              </th>
              <th className="border border-amber-200 px-1 py-1 text-right font-serif font-bold">
                Discount
              </th>
              <th className="border border-amber-200 px-1 py-1 text-right font-serif font-bold">
                Taxable Value
              </th>
              <th className="border border-amber-200 px-1 py-1 text-center font-serif font-bold">
                GST Rate
              </th>
              <th className="border border-amber-200 px-1 py-1 text-right font-serif font-bold">
                GST Amt
              </th>
              <th className="border border-amber-200 px-1 py-1 text-right font-serif font-bold">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((item, idx) => {
              const qty = Number(item.quantity) || 0;
              const rate = Number(item.rate) || 0;
              const itemDiscount = Number(item.discount) || 0;
              const gstRate = Number(item.gstRate) || 0;

              const rowAmount = qty * rate;
              const discountValue =
                item.discountType === 'PERCENTAGE'
                  ? rowAmount * (itemDiscount / 100)
                  : itemDiscount;
              const taxableValue = rowAmount - discountValue;

              const gstAmount = isInterState
                ? taxableValue * (gstRate / 100)
                : taxableValue * (gstRate / 100);
              const lineTotal = taxableValue + gstAmount;

              return (
                <tr
                  key={idx}
                  className={cn(
                    'border-b border-amber-200',
                    idx % 2 === 1 && 'bg-amber-50/40'
                  )}
                >
                  <td className="border border-amber-200 px-1 py-1 text-center">
                    {idx + 1}
                  </td>
                  <td className="border border-amber-200 px-1 py-1 text-left">
                    {item.description || '—'}
                    {item.unit && (
                      <span className="text-gray-400 ml-1">({item.unit})</span>
                    )}
                  </td>
                  <td className="border border-amber-200 px-1 py-1 text-center font-mono">
                    {item.hsnCode || '—'}
                  </td>
                  <td className="border border-amber-200 px-1 py-1 text-center">
                    {qty}
                  </td>
                  <td className="border border-amber-200 px-1 py-1 text-right">
                    {formatCurrency(rate, invoice.currency)}
                  </td>
                  <td className="border border-amber-200 px-1 py-1 text-right">
                    {itemDiscount > 0
                      ? item.discountType === 'PERCENTAGE'
                        ? `${itemDiscount}%`
                        : formatCurrency(itemDiscount, invoice.currency)
                      : '—'}
                  </td>
                  <td className="border border-amber-200 px-1 py-1 text-right">
                    {formatCurrency(taxableValue, invoice.currency)}
                  </td>
                  <td className="border border-amber-200 px-1 py-1 text-center">
                    {gstRate}%
                  </td>
                  <td className="border border-amber-200 px-1 py-1 text-right">
                    {formatCurrency(gstAmount, invoice.currency)}
                  </td>
                  <td className="border border-amber-200 px-1 py-1 text-right font-semibold">
                    {formatCurrency(lineTotal, invoice.currency)}
                  </td>
                </tr>
              );
            })}

            {/* ── Grand Total Row ── */}
            <tr className="bg-amber-900 text-white font-bold">
              <td
                colSpan={6}
                className="border border-amber-700 px-1 py-1.5 text-right font-serif uppercase tracking-wide"
              >
                Grand Total
              </td>
              <td className="border border-amber-700 px-1 py-1.5 text-right">
                {formatCurrency(totals.taxableAmount, invoice.currency)}
              </td>
              <td className="border border-amber-700 px-1 py-1.5 text-center">
                —
              </td>
              <td className="border border-amber-700 px-1 py-1.5 text-right">
                {formatCurrency(
                  isInterState
                    ? totals.igstTotal
                    : totals.cgstTotal + totals.sgstTotal,
                  invoice.currency
                )}
              </td>
              <td className="border border-amber-700 px-1 py-1.5 text-right">
                {formatCurrency(totals.grandTotal, invoice.currency)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ═══ AMOUNT IN WORDS ═══ */}
      <div className="border border-amber-200 rounded px-3 py-2 mb-4 bg-amber-50/30">
        <span className="font-serif font-bold text-amber-900 mr-1">
          Amount in Words:
        </span>
        <span className="italic">
          {invoice.currency === 'INR'
            ? numberToWords(totals.grandTotal)
            : formatCurrency(totals.grandTotal, invoice.currency) + ' Only'}
        </span>
      </div>

      {/* ═══ TAX BREAKDOWN + TOTALS ═══ */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Tax Breakdown */}
        <div className="border border-amber-200 rounded overflow-hidden">
          <div className="bg-amber-100 px-2 py-1">
            <h3 className="font-serif font-bold text-amber-900 uppercase tracking-wide">
              Tax Breakdown
            </h3>
          </div>
          <div className="p-2 space-y-0.5">
            <div className="flex justify-between">
              <span className="text-gray-600">Sub Total:</span>
              <span>{formatCurrency(totals.subTotal, invoice.currency)}</span>
            </div>
            {totals.discountTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Discount:</span>
                <span className="text-red-600">
                  −{formatCurrency(totals.discountTotal, invoice.currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Taxable Amount:</span>
              <span>
                {formatCurrency(totals.taxableAmount, invoice.currency)}
              </span>
            </div>
            <div className="border-t border-amber-200 my-1" />
            {isInterState ? (
              <div className="flex justify-between">
                <span className="text-gray-600">IGST:</span>
                <span>
                  {formatCurrency(totals.igstTotal, invoice.currency)}
                </span>
              </div>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">CGST:</span>
                  <span>
                    {formatCurrency(totals.cgstTotal, invoice.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">SGST:</span>
                  <span>
                    {formatCurrency(totals.sgstTotal, invoice.currency)}
                  </span>
                </div>
              </>
            )}
            {totals.cessTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Cess:</span>
                <span>
                  {formatCurrency(totals.cessTotal, invoice.currency)}
                </span>
              </div>
            )}
            {totals.roundOff !== 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Round Off:</span>
                <span>
                  {totals.roundOff > 0 ? '+' : ''}
                  {formatCurrency(totals.roundOff, invoice.currency)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Summary Totals */}
        <div className="flex flex-col justify-between">
          <div className="border border-amber-200 rounded overflow-hidden">
            <div className="bg-amber-100 px-2 py-1">
              <h3 className="font-serif font-bold text-amber-900 uppercase tracking-wide">
                Invoice Summary
              </h3>
            </div>
            <div className="p-2 space-y-0.5">
              <div className="flex justify-between">
                <span className="text-gray-600">Taxable Value:</span>
                <span>
                  {formatCurrency(totals.taxableAmount, invoice.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Tax:</span>
                <span>
                  {formatCurrency(
                    isInterState
                      ? totals.igstTotal
                      : totals.cgstTotal + totals.sgstTotal + totals.cessTotal,
                    invoice.currency
                  )}
                </span>
              </div>
              {totals.roundOff !== 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Round Off:</span>
                  <span>
                    {totals.roundOff > 0 ? '+' : ''}
                    {formatCurrency(totals.roundOff, invoice.currency)}
                  </span>
                </div>
              )}
              <div className="border-t-2 border-amber-800 mt-1 pt-1">
                <div className="flex justify-between font-bold text-amber-900">
                  <span className="font-serif uppercase">Grand Total:</span>
                  <span>
                    {formatCurrency(totals.grandTotal, invoice.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ BANK DETAILS ═══ */}
      {showBank &&
        business &&
        (business.bankName ||
          business.accountNumber ||
          business.ifscCode ||
          business.upiId) && (
          <div className="border border-amber-200 rounded overflow-hidden mb-4">
            <div className="bg-amber-100 px-2 py-1">
              <h3 className="font-serif font-bold text-amber-900 uppercase tracking-wide">
                Bank Details
              </h3>
            </div>
            <div
              className={cn(
                'grid gap-x-6 gap-y-0.5 p-2',
                size === 'preview' ? 'grid-cols-1' : 'grid-cols-2'
              )}
            >
              {business.bankName && (
                <div className="flex">
                  <span className="text-gray-500 w-24 shrink-0">
                    Bank Name:
                  </span>
                  <span className="font-semibold">{business.bankName}</span>
                </div>
              )}
              {business.accountNumber && (
                <div className="flex">
                  <span className="text-gray-500 w-24 shrink-0">
                    Account No.:
                  </span>
                  <span className="font-mono font-semibold">
                    {business.accountNumber}
                  </span>
                </div>
              )}
              {business.ifscCode && (
                <div className="flex">
                  <span className="text-gray-500 w-24 shrink-0">
                    IFSC Code:
                  </span>
                  <span className="font-mono font-semibold">
                    {business.ifscCode}
                  </span>
                </div>
              )}
              {business.upiId && (
                <div className="flex">
                  <span className="text-gray-500 w-24 shrink-0">UPI ID:</span>
                  <span className="font-mono font-semibold">
                    {business.upiId}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

      {/* ═══ CUSTOM FIELDS ═══ */}
      {invoice.customFields && invoice.customFields.length > 0 && (
        <div className="border border-amber-200 rounded p-2 mb-4">
          <h3 className="font-serif font-bold text-amber-900 uppercase tracking-wide mb-1 border-b border-amber-200 pb-0.5">
            Additional Details
          </h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
            {invoice.customFields.map((field, idx) =>
              Object.entries(field).map(([key, value]) => (
                <div key={`${idx}-${key}`} className="flex">
                  <span className="text-gray-500 mr-2">{key}:</span>
                  <span className="font-semibold">{value}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ═══ NOTES & TERMS ═══ */}
      <div
        className={cn(
          'grid gap-4 mb-4',
          invoice.notes && invoice.terms ? 'grid-cols-2' : 'grid-cols-1'
        )}
      >
        {invoice.notes && (
          <div className="border border-amber-200 rounded p-2">
            <h3 className="font-serif font-bold text-amber-900 uppercase tracking-wide mb-0.5 border-b border-amber-200 pb-0.5">
              Notes
            </h3>
            <p className="text-gray-700 whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}
        {invoice.terms && (
          <div className="border border-amber-200 rounded p-2">
            <h3 className="font-serif font-bold text-amber-900 uppercase tracking-wide mb-0.5 border-b border-amber-200 pb-0.5">
              Terms &amp; Conditions
            </h3>
            <p className="text-gray-700 whitespace-pre-line">
              {invoice.terms}
            </p>
          </div>
        )}
      </div>

      {/* ═══ SIGNATURE ═══ */}
      <div className="flex justify-end mt-6">
        <div className="text-center w-48">
          {showSignature && (
            <img
              src={business!.signature}
              alt="Signature"
              className={cn(
                'mx-auto object-contain mb-1',
                size === 'preview' ? 'h-6' : 'h-12'
              )}
            />
          )}
          <div className="border-t border-amber-800 pt-1">
            <p className="font-serif font-bold text-amber-900">
              Authorized Signatory
            </p>
            {business?.name && (
              <p className="text-gray-500 text-[9px]">
                For {business.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ═══ FOOTER ═══ */}
      <div className="border-t-2 border-double border-amber-800 mt-4 pt-1.5 text-center text-gray-400">
        <p>This is a computer-generated invoice and does not require a physical signature.</p>
      </div>
    </div>
  );
}
