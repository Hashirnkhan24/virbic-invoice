'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { generateUPILink } from '@/lib/upi-generator';

interface UPIQRCodeProps {
  upiId: string;
  amount: number | string;
  payeeName: string;
  description?: string;
  invoiceNumber?: string;
  size?: number;
  className?: string;
}

export default function UPIQRCode({
  upiId,
  amount,
  payeeName,
  description = '',
  invoiceNumber = '',
  size = 96,
  className = '',
}: UPIQRCodeProps) {
  if (!upiId) return null;

  // Generate UPI Payment URI
  // The prompt requested format: upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=Invoice_${invoiceNumber}
  const cleanInvoiceNum = invoiceNumber || description || 'TEMP';
  const upiLink = generateUPILink({
    upiId,
    amount,
    payeeName,
    invoiceNumber: cleanInvoiceNum,
  });

  return (
    <div className={`flex flex-col items-center gap-1 p-2 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-lg w-fit ${className}`}>
      <QRCodeSVG
        value={upiLink}
        size={size}
        level="M"
        includeMargin={true}
        className="max-w-full h-auto"
      />
      <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center mt-1">
        Pay instantly via UPI
      </span>
    </div>
  );
}
