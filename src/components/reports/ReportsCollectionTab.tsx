'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/helpers';
import { CalendarClock, Zap, CheckCircle2, ShieldAlert } from 'lucide-react';

interface Debtor {
  clientId: string;
  clientName: string;
  billed: number;
  collected: number;
  outstanding: number;
  overdueCount: number;
}

interface ReportsCollectionTabProps {
  data: {
    metrics: {
      totalBilled: number;
      totalCollected: number;
      totalOutstanding: number;
      cei: number;
      dso: number;
      avgDaysToPay: number;
      paidCount: number;
    };
    topDebtors: Debtor[];
  } | null;
}

export default function ReportsCollectionTab({ data }: ReportsCollectionTabProps) {
  if (!data) return null;

  const { metrics, topDebtors } = data;

  // Circular gauge config
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (metrics.cei / 100) * circumference;

  return (
    <div className="space-y-6">
      {/* ── Collection Metrics & Radial Gauge Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CEI Gauge Card */}
        <Card className="p-5 border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 rounded-xl shadow-sm flex flex-col items-center justify-center text-center space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100">
              Collection Efficiency Index
            </h3>
            <p className="text-[10px] text-slate-400">Ratio of billed receivables cleared in range.</p>
          </div>

          {/* SVG Donut Circle */}
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              {/* Backtrack circle */}
              <circle
                cx="72"
                cy="72"
                r={radius}
                className="stroke-slate-100 dark:stroke-slate-800"
                strokeWidth="10"
                fill="transparent"
              />
              {/* Active track */}
              <circle
                cx="72"
                cy="72"
                r={radius}
                className="stroke-emerald-500"
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-slate-850 dark:text-slate-100">{metrics.cei}%</span>
              <span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400">Efficiency</span>
            </div>
          </div>

          <div className="text-[10px] font-semibold text-slate-450 italic">
            {metrics.cei >= 90
              ? 'Excellent! Outstanding balances are actively resolved.'
              : metrics.cei >= 75
              ? 'Good efficiency. Monitor overdue accounts periodically.'
              : 'Attention: Review credit policy to recover outstanding bills.'}
          </div>
        </Card>

        {/* DSO and Payment Speed Card */}
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Days Sales Outstanding (DSO) */}
          <Card className="p-5 border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 rounded-xl shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Days Sales Outstanding</span>
                <h4 className="text-sm font-bold text-slate-850 dark:text-slate-150">Cash Collection Velocity</h4>
              </div>
              <div className="p-2 rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
                <CalendarClock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-black text-slate-850 dark:text-slate-50 tracking-tight">
                {metrics.dso} <span className="text-xs font-bold text-slate-450">Days</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                The average number of days it takes your business to collect payments after sending invoices. Lower numbers represent faster cash flow.
              </p>
            </div>
          </Card>

          {/* Average Days to Pay */}
          <Card className="p-5 border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 rounded-xl shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Average Days to Pay</span>
                <h4 className="text-sm font-bold text-slate-850 dark:text-slate-150">Client Settlement Cycle</h4>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-450">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-black text-slate-850 dark:text-slate-50 tracking-tight">
                {metrics.avgDaysToPay} <span className="text-xs font-bold text-slate-450">Days</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                The average number of days from invoice issue date to payment clearance, computed across {metrics.paidCount} resolved transactions.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Top Debtors List ── */}
      <Card className="border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
          <h3 className="text-xs font-black text-slate-850 dark:text-slate-100 uppercase tracking-wider">
            Outstanding Receivables: Top 5 Clients
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Top clients with the highest active unpaid invoice balance.</p>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/20 dark:bg-slate-950/10">
              <TableRow className="border-slate-200 dark:border-slate-800 text-[10px] font-extrabold text-slate-800 dark:text-slate-200">
                <TableHead>Client Name</TableHead>
                <TableHead className="text-right">Total Billed (₹)</TableHead>
                <TableHead className="text-right">Total Collected (₹)</TableHead>
                <TableHead className="text-right">Outstanding Receivables (₹)</TableHead>
                <TableHead className="text-center w-36">Overdue Invoices</TableHead>
                <TableHead className="w-24 text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-[11px] font-semibold text-slate-650 dark:text-slate-350 divide-y divide-slate-100 dark:divide-slate-800">
              {topDebtors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-450 italic">
                    Great news! There are no clients with outstanding overdue payments in this range.
                  </TableCell>
                </TableRow>
              ) : (
                topDebtors.map((debtor) => (
                  <TableRow key={debtor.clientId} className="border-slate-100 dark:border-slate-800">
                    <TableCell className="font-bold text-slate-800 dark:text-slate-150">{debtor.clientName}</TableCell>
                    <TableCell className="text-right">{debtor.billed.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right">{debtor.collected.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right font-black text-amber-600 dark:text-amber-500">
                      {debtor.outstanding.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-center font-bold text-slate-700 dark:text-slate-200">
                      {debtor.overdueCount > 0 ? (
                        <span className="text-red-500 dark:text-red-400 font-extrabold">{debtor.overdueCount} Overdue</span>
                      ) : (
                        <span className="text-slate-400 font-medium">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {debtor.overdueCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-50 dark:bg-red-950/40 text-red-650 dark:text-red-400 border border-red-200/50 dark:border-red-900/50">
                          <ShieldAlert className="w-2.5 h-2.5" />
                          <span>Action Required</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/50">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Good Standing</span>
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
