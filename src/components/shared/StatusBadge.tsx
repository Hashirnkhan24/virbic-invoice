import { InvoiceStatus } from '@prisma/client';

interface StatusBadgeProps {
  status: InvoiceStatus | string;
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const normalizedStatus = status.toUpperCase();

  let styles = 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
  let dotColor = 'bg-slate-500';
  let label = 'Draft';

  switch (normalizedStatus) {
    case 'PAID':
      styles = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50';
      dotColor = 'bg-emerald-500';
      label = 'Paid';
      break;
    case 'SENT':
      styles = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50';
      dotColor = 'bg-blue-500';
      label = 'Sent';
      break;
    case 'PENDING':
      styles = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50';
      dotColor = 'bg-amber-500';
      label = 'Pending';
      break;
    case 'OVERDUE':
      styles = 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50';
      dotColor = 'bg-red-500';
      label = 'Overdue';
      break;
    case 'CANCELLED':
      styles = 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/60 dark:text-slate-500 dark:border-slate-700/50';
      dotColor = 'bg-slate-400';
      label = 'Cancelled';
      break;
    case 'PARTIAL':
      styles = 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50';
      dotColor = 'bg-indigo-500';
      label = 'Partial';
      break;
    case 'DRAFT':
    default:
      styles = 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
      dotColor = 'bg-slate-500';
      label = 'Draft';
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors ${styles} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {label}
    </span>
  );
}
