'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/helpers';
import { InvoiceTemplateProps } from '@/components/invoice-templates/types';

export default function BoldTemplate({
  invoice,
  totals,
  business,
  client,
  size = 'preview',
}: InvoiceTemplateProps) {
  const isFull = size === 'full';

  return (
    <div
      className={cn(
        'bg-white text-slate-700 font-sans select-none',
        isFull ? 'p-8 space-y-8' : 'p-6 space-y-5'
      )}
    >
      {/* ─── Header: Oversized Invoice Number ─── */}
      <div className="flex justify-between items-start">
        <div className="space-y-0.5">
          <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-bold block">
            Invoice
          </span>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">
            {invoice.invoiceNumber || 'INV-000'}
          </h1>
        </div>

        <div className="text-right space-y-0.5">
          <span className="inline-block text-[9px] font-black text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded uppercase tracking-wider">
            Tax Invoice
          </span>
          <div className="text-[10px] text-slate-500 space-y-0.5 mt-1">
            <p>
              Issue Date:{' '}
              <span className="font-bold text-slate-800">
                {formatDate(invoice.issueDate)}
              </span>
            </p>
            <p>
              Due Date:{' '}
              <span className="font-bold text-slate-800">
                {formatDate(invoice.dueDate)}
              </span>
            </p>
            <p>
              Place of Supply:{' '}
              <span className="font-bold text-slate-800">
                {invoice.placeOfSupply || 'N/A'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* ─── Big Blue Accent Bar ─── */}
      <div className="h-1.5 bg-blue-600 w-full rounded-full" />

      {/* ─── Business & Client ─── */}
      <div className={cn('grid grid-cols-2', isFull ? 'gap-8' : 'gap-6')}>
        {/* Bill From */}
        <div className="space-y-1">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
            Bill From
          </span>
          <h3 className="text-sm font-bold text-slate-900">
            {business?.name || 'Business Name'}
          </h3>
          {business?.gstin && (
            <p className="text-[10px] font-mono text-blue-600 font-bold">
              GSTIN: {business.gstin}
            </p>
          )}
          <p className="text-[10px] text-slate-500 leading-snug whitespace-pre-line max-w-[220px]">
            {business?.address}
            {business?.city ? `, ${business.city}` : ''}
            {business?.state ? ` (${business.state})` : ''}
            {business?.pincode ? ` - ${business.pincode}` : ''}
          </p>
          {business?.phone && (
            <p className="text-[10px] text-slate-400">
              Phone: {business.phone}
            </p>
          )}
          {business?.email && (
            <p className="text-[10px] text-slate-400">
              Email: {business.email}
            </p>
          )}
        </div>

        {/* Bill To */}
        <div className="space-y-1">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
            Bill To
          </span>
          <h3 className="text-sm font-bold text-slate-900">
            {client?.name || 'Customer Name'}
          </h3>
          {client?.gstin && (
            <p className="text-[10px] font-mono text-blue-600 font-bold">
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
            <p className="text-[10px] text-slate-400">Email: {client.email}</p>
          )}
          {client?.phone && (
            <p className="text-[10px] text-slate-400">Phone: {client.phone}</p>
          )}
        </div>
      </div>

      {/* ─── Reverse Charge ─── */}
      {invoice.reverseCharge && (
        <div className="flex">
          <span className="bg-amber-50 border border-amber-200 text-amber-800 text-[9px] font-bold px-2.5 py-0.5 rounded">
            Reverse Charge Applicable
          </span>
        </div>
      )}

      {/* ─── Line Items Table ─── */}
      <div>
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="py-3 text-left font-black text-blue-600 uppercase tracking-wider text-[9px]">
                Description
              </th>
              <th className="py-3 text-center font-black text-blue-600 uppercase tracking-wider text-[9px]">
                HSN/SAC
              </th>
              <th className="py-3 text-right font-black text-blue-600 uppercase tracking-wider text-[9px]">
                Qty
              </th>
              <th className="py-3 text-right font-black text-blue-600 uppercase tracking-wider text-[9px]">
                Rate
              </th>
              <th className="py-3 text-right font-black text-blue-600 uppercase tracking-wider text-[9px]">
                Disc.
              </th>
              <th className="py-3 text-right font-black text-blue-600 uppercase tracking-wider text-[9px]">
                GST
              </th>
              <th className="py-3 text-right font-black text-blue-600 uppercase tracking-wider text-[9px]">
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
                  className="border-b border-slate-100 align-top"
                >
                  <td className="py-3 pr-2 text-slate-800">
                    <p className="font-semibold">
                      {item.description || 'Item Description'}
                    </p>
                    {item.hsnCode && (
                      <span className="text-[8px] text-slate-400 font-mono block mt-0.5">
                        HSN/SAC: {item.hsnCode}
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-center font-mono text-slate-500">
                    {item.hsnCode || '—'}
                  </td>
                  <td className="py-3 text-right font-semibold text-slate-600">
                    {qty} {item.unit || 'PCS'}
                  </td>
                  <td className="py-3 text-right font-mono text-slate-600">
                    {formatCurrency(rate, invoice.currency)}
                  </td>
                  <td className="py-3 text-right text-slate-500">
                    {itemDiscount > 0 ? (
                      <span className="text-red-500 font-medium">
                        {item.discountType === 'PERCENTAGE'
                          ? `${itemDiscount}%`
                          : formatCurrency(itemDiscount, invoice.currency)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3 text-right font-mono text-slate-600">
                    {item.gstRate}%
                  </td>
                  <td className="py-3 text-right font-bold font-mono text-slate-900">
                    {formatCurrency(finalAmount, invoice.currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ─── Bottom Section: Bank/Notes (left) + Totals (right) ─── */}
      <div className={cn('grid grid-cols-5', isFull ? 'gap-8' : 'gap-6')}>
        {/* Left Column — Bank Details & Notes */}
        <div className="col-span-3 space-y-4">
          {/* Bank Details Card */}
          {business?.bankName && (
            <div className="bg-blue-50 rounded-xl p-4 space-y-2">
              <h4 className="text-[9px] font-black text-blue-600 uppercase tracking-widest">
                Bank Details
              </h4>
              <div className="text-[10px] text-slate-700 grid grid-cols-3 gap-y-1 leading-snug">
                <span className="text-slate-500 font-medium">Bank Name:</span>
                <span className="col-span-2 font-bold">
                  {business.bankName}
                </span>
                <span className="text-slate-500 font-medium">A/C Number:</span>
                <span className="col-span-2 font-bold font-mono">
                  {business.accountNumber}
                </span>
                <span className="text-slate-500 font-medium">IFSC Code:</span>
                <span className="col-span-2 font-bold font-mono">
                  {business.ifscCode}
                </span>
                {business.upiId && (
                  <>
                    <span className="text-slate-500 font-medium">UPI ID:</span>
                    <span className="col-span-2 font-bold font-mono">
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
              <p className="text-[10px] text-slate-500 italic leading-relaxed whitespace-pre-line max-w-[280px]">
                {invoice.notes}
              </p>
            </div>
          )}

          {/* Terms */}
          {invoice.terms && (
            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                Terms &amp; Conditions
              </span>
              <p className="text-[10px] text-slate-500 leading-relaxed whitespace-pre-line max-w-[280px]">
                {invoice.terms}
              </p>
            </div>
          )}
        </div>

        {/* Right Column — Totals */}
        <div className="col-span-2 space-y-2 text-[10px]">
          <div className="flex justify-between text-slate-500 font-semibold">
            <span>Subtotal</span>
            <span className="font-mono">
              {formatCurrency(totals.subTotal, invoice.currency)}
            </span>
          </div>

          {totals.discountTotal > 0 && (
            <div className="flex justify-between text-red-500 font-semibold">
              <span>Discount</span>
              <span className="font-mono">
                -{formatCurrency(totals.discountTotal, invoice.currency)}
              </span>
            </div>
          )}

          <div className="flex justify-between text-slate-600 font-bold border-b border-slate-200 pb-2">
            <span>Taxable Amount</span>
            <span className="font-mono">
              {formatCurrency(totals.taxableAmount, invoice.currency)}
            </span>
          </div>

          {/* Tax Details */}
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
          {totals.roundOff !== 0 && (
            <div className="flex justify-between text-slate-400 font-mono text-[9px]">
              <span>Round Off</span>
              <span>
                {totals.roundOff > 0 ? '+' : ''}
                {formatCurrency(totals.roundOff, invoice.currency)}
              </span>
            </div>
          )}

          {/* Grand Total — Big & Bold */}
          <div className="bg-blue-50 rounded-xl p-3 mt-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-blue-500 font-bold block mb-0.5">
              Total Due
            </span>
            <p className="text-2xl font-black text-blue-600 font-mono tracking-tight leading-none">
              {formatCurrency(totals.grandTotal, invoice.currency)}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Footer: Signature & T&C ─── */}
      <div className="flex justify-between items-end gap-6 pt-4 border-t border-slate-200">
        {/* Custom Fields */}
        {invoice.customFields && invoice.customFields.length > 0 && (
          <div className="space-y-1 text-[10px]">
            {invoice.customFields.map((field, idx) => {
              const key = Object.keys(field)[0];
              if (!key) return null;
              return (
                <p key={idx} className="text-slate-500">
                  <span className="font-bold text-slate-600">{key}:</span>{' '}
                  {field[key]}
                </p>
              );
            })}
          </div>
        )}

        {/* Signature */}
        <div className="text-right space-y-1 flex-shrink-0 ml-auto">
          <p className="text-[10px] text-slate-500 font-semibold mb-1">
            For {business?.name || 'Business Name'}
          </p>
          {business?.signature ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={business.signature}
              alt="Authorized Signature"
              className="max-h-10 object-contain ml-auto"
            />
          ) : (
            <div className="h-10 w-28 border-b-2 border-slate-300 ml-auto" />
          )}
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
            Authorized Signatory
          </span>
        </div>
      </div>
    </div>
  );
}
