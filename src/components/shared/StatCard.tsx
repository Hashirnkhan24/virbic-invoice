'use client';

import { ReactNode } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion } from 'framer-motion';
import NumberFlow from '@number-flow/react';

interface StatCardProps {
  title: string;
  value: number;
  change?: number;
  trend?: 'up' | 'down';
  icon: ReactNode;
  formatOptions?: any;
}

export default function StatCard({
  title,
  value,
  change,
  trend,
  icon,
  formatOptions,
}: StatCardProps) {
  const isUp = trend === 'up';

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: 'var(--shadow-md)' }}
      transition={{ duration: 0.2 }}
      className="w-full p-5 border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 rounded-xl shadow-sm"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {title}
        </span>
        <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
          {icon}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <div className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
          <NumberFlow
            value={value}
            format={formatOptions}
            locales="en-IN"
          />
        </div>

        {change !== undefined && trend && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                isUp
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/30'
                  : 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30'
              }`}
            >
              {isUp ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              {change.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              vs last month
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
