'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/helpers';

interface RevenueData {
  month: string;
  revenue: number;
}

interface StatusData {
  name: string;
  value: number;
  color: string;
}

interface DashboardChartsProps {
  revenueData: RevenueData[];
  statusData: StatusData[];
  totalInvoices: number;
}

export default function DashboardCharts({
  revenueData,
  statusData,
  totalInvoices,
}: DashboardChartsProps) {
  // Filter out status segments with 0 counts to prevent rendering visual artifacts
  const activeStatusData = statusData.filter((d) => d.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full text-left">
      {/* ── Left Column: Revenue Over Time (Area Chart) ── */}
      <Card className="p-5 border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 rounded-xl shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100">
            Revenue Over Time
          </h3>
          <p className="text-xs text-slate-400">Monthly invoice revenues for the last 6 months.</p>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart
              data={revenueData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800/50" />
              <XAxis
                dataKey="month"
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                dy={8}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontFamily: 'inherit',
                  color: '#0f172a',
                }}
                formatter={(value: any) => [formatCurrency(value), 'Revenue']}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* ── Right Column: Invoice Status Breakdown (Pie Chart) ── */}
      <Card className="p-5 border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 rounded-xl shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100">
            Invoice Status Breakdown
          </h3>
          <p className="text-xs text-slate-400">Overview of invoices by their payment statuses.</p>
        </div>

        <div className="h-72 w-full relative flex flex-col justify-center items-center">
          {/* Centered Total Counter inside the Donut Chart */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-40px]">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total</span>
            <span className="text-2xl font-black text-slate-850 dark:text-slate-100">
              {totalInvoices}
            </span>
            <span className="text-[8px] text-slate-400 font-semibold uppercase">Invoices</span>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={activeStatusData.length > 0 ? activeStatusData : [{ name: 'No Data', value: 1, color: '#e2e8f0' }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {(activeStatusData.length > 0 ? activeStatusData : [{ name: 'No Data', value: 1, color: '#e2e8f0' }]).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: any, name: any) => [value, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend Custom Display */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-650 dark:text-slate-350 pb-2">
            {statusData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span>
                  {item.name} ({item.value})
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
