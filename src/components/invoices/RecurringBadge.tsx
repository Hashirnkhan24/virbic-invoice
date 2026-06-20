import React from 'react';
import { Clock } from 'lucide-react';

interface RecurringBadgeProps {
  isRecurring: boolean;
  frequency: string | null;
}

export default function RecurringBadge({ isRecurring, frequency }: RecurringBadgeProps) {
  if (!isRecurring) return null;
  
  return (
    <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/25 dark:text-indigo-400 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border border-indigo-100 dark:border-indigo-950/50">
      <Clock className="w-3 h-3 text-indigo-500 dark:text-indigo-405 shrink-0" />
      <span>Recurring {frequency ? `• ${frequency}` : ''}</span>
    </span>
  );
}
