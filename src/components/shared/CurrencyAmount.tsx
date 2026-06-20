'use client';

import React from 'react';
import { formatCurrency, convertCurrency } from '@/lib/currency';

interface AmountProps {
  amount: number | string;
  currency?: string;
  className?: string;
}

export default function CurrencyAmount({ amount, currency = 'INR', className = '' }: AmountProps) {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
  const formatted = formatCurrency(numericAmount, currency);

  if (currency === 'INR') {
    return <span className={className}>{formatted}</span>;
  }

  // Calculate INR equivalent
  const amountInINR = convertCurrency(numericAmount, currency, 'INR');
  const formattedINR = formatCurrency(amountInINR, 'INR');

  return (
    <span className={`relative group cursor-help border-b border-dotted border-slate-400/60 inline-flex items-center ${className}`}>
      {formatted}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 dark:bg-slate-950/95 text-white dark:text-slate-200 text-[10px] font-bold px-2 py-1 rounded shadow-md border border-slate-805 dark:border-slate-850 whitespace-nowrap z-50">
        ≈ {formattedINR}
      </span>
    </span>
  );
}
