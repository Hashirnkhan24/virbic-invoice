'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/helpers';
import { ChevronDown, ChevronUp, Link2, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface AgingInvoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  issueDate: string;
  dueDate: string;
  grandTotal: number;
  amountPaid: number;
  outstandingAmount: number;
  daysOverdue: number;
}

interface AgingBucket {
  label: string;
  totalOutstanding: number;
  invoiceCount: number;
  invoices: AgingInvoice[];
}

interface ReportsAgingTabProps {
  data: {
    totalReceivables: number;
    buckets: {
      notDue: AgingBucket;
      aging1to30: AgingBucket;
      aging31to60: AgingBucket;
      aging61to90: AgingBucket;
      aging90Plus: AgingBucket;
    };
  } | null;
}

export default function ReportsAgingTab({ data }: ReportsAgingTabProps) {
  // Accordion expanded state keys
  const [expandedBuckets, setExpandedBuckets] = useState<Record<string, boolean>>({
    aging1to30: true,
    aging31to60: false,
    aging61to90: false,
    aging90Plus: false,
    notDue: false,
  });

  if (!data) return null;

  const { totalReceivables, buckets } = data;

  const toggleBucket = (key: string) => {
    setExpandedBuckets((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Color mappings for buckets
  const bucketConfig: Record<string, { color: string; bg: string; hover: string }> = {
    notDue: { color: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/20', hover: 'hover:bg-emerald-100/50' },
    aging1to30: { color: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/20', hover: 'hover:bg-amber-100/50' },
    aging31to60: { color: 'bg-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/20', hover: 'hover:bg-orange-100/50' },
    aging61to90: { color: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-950/20', hover: 'hover:bg-red-100/50' },
    aging90Plus: { color: 'bg-rose-700', bg: 'bg-rose-50 dark:bg-rose-950/20', hover: 'hover:bg-rose-100/50' },
  };

  return (
    <div className="space-y-6">
      {/* ── Total A/R Summary Card ── */}
      <Card className="p-5 border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Accounts Receivable (A/R)</span>
          <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100 mt-0.5">Total Outstanding Receivables</h3>
          <p className="text-xs text-slate-450 mt-0.5">Consolidated outstanding amounts for all sent/partially paid invoices.</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-3xl font-black text-slate-850 dark:text-slate-50 tracking-tight">
            {formatCurrency(totalReceivables, 'INR')}
          </p>
        </div>
      </Card>

      {/* ── Stacked Bar Visualizer ── */}
      <Card className="p-5 border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 rounded-xl shadow-sm space-y-4">
        <div className="space-y-1">
          <h3 className="text-xs font-black text-slate-850 dark:text-slate-100 uppercase tracking-wider">
            Aging Receivables Breakdown
          </h3>
          <p className="text-[10px] text-slate-400">Proportional representation of outstanding debts across age brackets.</p>
        </div>

        {/* Stacked Progress Bar */}
        <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
          {Object.entries(buckets).map(([key, bucket]) => {
            const pct = totalReceivables > 0 ? (bucket.totalOutstanding / totalReceivables) * 100 : 0;
            if (pct === 0) return null;
            return (
              <div
                key={key}
                className={`${bucketConfig[key].color} h-full`}
                style={{ width: `${pct}%` }}
                title={`${bucket.label}: ${pct.toFixed(1)}%`}
              />
            );
          })}
        </div>

        {/* Bar Legend Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          {Object.entries(buckets).map(([key, bucket]) => {
            const pct = totalReceivables > 0 ? (bucket.totalOutstanding / totalReceivables) * 100 : 0;
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                  <span className={`w-2.5 h-2.5 rounded shrink-0 ${bucketConfig[key].color}`} />
                  <span>{bucket.label}</span>
                </div>
                <div className="pl-4">
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100">
                    {formatCurrency(bucket.totalOutstanding, 'INR')}
                  </p>
                  <p className="text-[9px] text-slate-400 font-semibold uppercase mt-0.5">
                    {pct.toFixed(1)}% ({bucket.invoiceCount})
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Accordion List ── */}
      <div className="space-y-4">
        {Object.entries(buckets).map(([key, bucket]) => {
          const isExpanded = !!expandedBuckets[key];
          const hasInvoices = bucket.invoices.length > 0;
          const styles = bucketConfig[key];

          return (
            <Card
              key={key}
              className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm"
            >
              {/* Accordion Trigger Header */}
              <button
                onClick={() => toggleBucket(key)}
                className={`w-full p-4 flex items-center justify-between font-bold text-left cursor-pointer transition-colors border-b border-transparent ${
                  isExpanded ? `${styles.bg} border-slate-200 dark:border-slate-800` : `${styles.hover}`
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full shrink-0 ${styles.color}`} />
                  <div>
                    <span className="text-xs font-black text-slate-850 dark:text-slate-100">{bucket.label}</span>
                    <span className="text-[10px] text-slate-400 font-normal ml-2">
                      ({bucket.invoiceCount} {bucket.invoiceCount === 1 ? 'invoice' : 'invoices'})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-xs font-black text-slate-850 dark:text-slate-100">
                    {formatCurrency(bucket.totalOutstanding, 'INR')}
                  </span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {/* Accordion Table Content */}
              {isExpanded && (
                <div className="overflow-x-auto">
                  {!hasInvoices ? (
                    <div className="p-6 text-center text-[11px] text-slate-400 italic bg-white dark:bg-slate-900">
                      No invoices currently match this aging bracket.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="bg-slate-50/10 dark:bg-slate-950/10">
                        <TableRow className="border-slate-100 dark:border-slate-800 text-[10px] font-extrabold text-slate-800 dark:text-slate-200">
                          <TableHead className="w-24">Inv. Number</TableHead>
                          <TableHead>Client Name</TableHead>
                          <TableHead className="w-24 text-center">Issue Date</TableHead>
                          <TableHead className="w-24 text-center">Due Date</TableHead>
                          <TableHead className="text-right">Outstanding (₹)</TableHead>
                          <TableHead className="text-center w-28">Days Overdue</TableHead>
                          <TableHead className="w-20 text-center">View</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-[11px] font-semibold text-slate-650 dark:text-slate-350 divide-y divide-slate-100 dark:divide-slate-850">
                        {bucket.invoices.map((inv) => (
                          <TableRow key={inv.id} className="border-slate-100 dark:border-slate-800">
                            <TableCell className="font-bold text-slate-800 dark:text-slate-150">{inv.invoiceNumber}</TableCell>
                            <TableCell className="font-bold">{inv.clientName}</TableCell>
                            <TableCell className="text-center">{formatDate(inv.issueDate)}</TableCell>
                            <TableCell className="text-center">{formatDate(inv.dueDate)}</TableCell>
                            <TableCell className="text-right font-black text-slate-850 dark:text-slate-100">
                              {inv.outstandingAmount.toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              {inv.daysOverdue > 0 ? (
                                <span className="text-red-500 font-extrabold">{inv.daysOverdue} days past due</span>
                              ) : (
                                <span className="text-emerald-500">Not due yet</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Link
                                href={`/invoices/${inv.id}`}
                                className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-500 hover:text-emerald-500 transition-colors"
                                title="Open Invoice"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
