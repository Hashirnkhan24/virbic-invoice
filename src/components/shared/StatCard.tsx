'use client';

import { ReactNode } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion } from 'framer-motion';
import NumberFlow from '@number-flow/react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  change?: number;
  trend?: 'up' | 'down';
  icon: ReactNode;
  formatOptions?: any;
  pulse?: boolean;
  benchmark?: { label: string; color: string };
  type?: 'billed' | 'collected' | 'outstanding' | 'velocity';
  subtitle?: string;
}

export default function StatCard({
  title,
  value,
  change,
  trend,
  icon,
  formatOptions,
  pulse = false,
  benchmark,
  type = 'billed',
  subtitle,
}: StatCardProps) {
  const isUp = trend === 'up';

  // Determine trend badge colors based on metric type
  let badgeClasses = '';
  if (change !== undefined && trend) {
    if (type === 'billed') {
      badgeClasses = 'bg-slate-50 text-slate-700 border-slate-200/60 dark:bg-slate-800/40 dark:text-slate-350 dark:border-slate-800/50';
    } else if (type === 'collected') {
      badgeClasses = isUp
        ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
        : 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30';
    } else if (type === 'outstanding' || type === 'velocity') {
      // More outstanding or slower payments are bad (red)
      badgeClasses = isUp
        ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30'
        : 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
    }
  }

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: 'var(--shadow-md)' }}
      transition={{ duration: 0.2 }}
      className={cn(
        "w-full p-5 border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 rounded-xl shadow-sm transition-all",
        pulse && "animate-[pulse_2s_infinite] border-red-300 dark:border-red-900/50 shadow-red-50/50 dark:shadow-red-950/5"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {title}
        </span>
        <div className={cn(
          "p-2.5 rounded-lg flex items-center justify-center",
          type === 'outstanding' && (typeof value === 'number' ? value > 0 : parseFloat(value as string) > 0)
            ? "bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-400"
            : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
        )}>
          {icon}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <div className={cn(
          "text-2xl font-bold tracking-tight",
          type === 'outstanding' && (typeof value === 'number' ? value > 0 : parseFloat(value as string) > 0)
            ? "text-red-600 dark:text-red-400"
            : "text-slate-900 dark:text-slate-50"
        )}>
          {typeof value === 'number' ? (
            <NumberFlow
              value={value}
              format={formatOptions}
              locales="en-IN"
            />
          ) : (
            value
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {change !== undefined && trend && (
            <div className="flex items-center gap-1">
              <span className={cn("inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border", badgeClasses)}>
                {isUp ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {Math.abs(change).toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
                vs last month
              </span>
            </div>
          )}

          {benchmark && (
            <span className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider",
              benchmark.color === 'green' && 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30',
              benchmark.color === 'amber' && 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30',
              benchmark.color === 'orange' && 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30',
              benchmark.color === 'red' && 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30'
            )}>
              {benchmark.label}
            </span>
          )}
        </div>

        {subtitle && (
          <p className="text-xs text-slate-450 dark:text-slate-500 font-medium pt-0.5">
            {subtitle}
          </p>
        )}
      </div>
    </motion.div>
  );
}
