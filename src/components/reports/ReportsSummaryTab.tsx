'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { formatCurrency } from '@/lib/helpers';
import { FileText, Coins, Receipt, Scale } from 'lucide-react';
import StatCard from '../shared/StatCard';

interface ReportsSummaryTabProps {
  data: {
    summary: {
      totalRevenueBilled: number;
      totalRevenueCollected: number;
      totalOutstanding: number;
      averageInvoiceValue: number;
      invoiceCount: number;
    };
    statusDistribution: Array<{ name: string; value: number; color: string }>;
    monthlyTrends: Array<{ month: string; billed: number; collected: number }>;
  } | null;
}

export default function ReportsSummaryTab({ data }: ReportsSummaryTabProps) {
  if (!data) return null;

  const { summary, statusDistribution, monthlyTrends } = data;

  return (
    <div className="space-y-6">
      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Billed */}
        <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450">Billed Revenue</p>
            <p className="text-lg font-black text-slate-850 dark:text-slate-100 mt-0.5">
              {formatCurrency(summary.totalRevenueBilled, 'INR')}
            </p>
            <p className="text-[9px] text-slate-400 font-medium">Excludes DRAFT / CANCELLED</p>
          </div>
        </Card>

        {/* Total Collected */}
        <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-450">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450">Collected Revenue</p>
            <p className="text-lg font-black text-slate-850 dark:text-slate-100 mt-0.5">
              {formatCurrency(summary.totalRevenueCollected, 'INR')}
            </p>
            <p className="text-[9px] text-slate-400 font-medium">Total payments cleared</p>
          </div>
        </Card>

        {/* Total Outstanding */}
        <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-450">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450">Outstanding Receivables</p>
            <p className="text-lg font-black text-slate-850 dark:text-slate-100 mt-0.5">
              {formatCurrency(summary.totalOutstanding, 'INR')}
            </p>
            <p className="text-[9px] text-slate-400 font-medium">Active pending balance</p>
          </div>
        </Card>

        {/* Average Invoice Value */}
        <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450">Avg. Invoice Value</p>
            <p className="text-lg font-black text-slate-850 dark:text-slate-100 mt-0.5">
              {formatCurrency(summary.averageInvoiceValue, 'INR')}
            </p>
            <p className="text-[9px] text-slate-400 font-medium">Based on {summary.invoiceCount} invoices</p>
          </div>
        </Card>
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Billed vs. Collected Revenue Trend (Area Chart) - span 2 */}
        <Card className="p-5 border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 rounded-xl shadow-sm space-y-4 lg:col-span-2">
          <div>
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100">
              Revenue Comparison Trend
            </h3>
            <p className="text-xs text-slate-400">Billed revenue vs. payments collected month-over-month.</p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBilled" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800/50" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dy={8} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#0f172a',
                  }}
                  formatter={(value: any) => [formatCurrency(value, 'INR'), '']}
                />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '15px' }} />
                <Area type="monotone" name="Billed Revenue" dataKey="billed" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorBilled)" />
                <Area type="monotone" name="Collected Revenue" dataKey="collected" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCollected)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Right: Invoice status distribution */}
        <Card className="p-5 border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 rounded-xl shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100">
              Invoice Status Distribution
            </h3>
            <p className="text-xs text-slate-400">Total invoice counts grouped by invoice status.</p>
          </div>

          <div className="h-72 w-full flex flex-col justify-between">
            {/* Simple Bar Chart for count distribution */}
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={statusDistribution.filter((d) => d.value > 0)} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800/50" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                    formatter={(value: any) => [value, 'Invoices']}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {statusDistribution.filter((d) => d.value > 0).map((entry, index) => (
                      <Area key={`cell-${index}`} fill={entry.color} stroke={entry.color} dataKey="value" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Counts Legend list */}
            <div className="space-y-1 bg-slate-50 dark:bg-slate-950/20 p-2.5 rounded-lg">
              <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-650 dark:text-slate-350">
                {statusDistribution.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5 justify-start">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.name}:</span>
                    <span className="text-slate-800 dark:text-slate-100 ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
