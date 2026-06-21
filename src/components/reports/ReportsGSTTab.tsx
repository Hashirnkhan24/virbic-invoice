'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/helpers';
import { Download, FileSpreadsheet, Building2, User, Percent, Hash } from 'lucide-react';
import { toast } from 'sonner';

interface GSTInvoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  clientName: string;
  clientGstin: string;
  placeOfSupply: string;
  isInterState: boolean;
  subTotal: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  cessTotal: number;
  grandTotal: number;
}

interface ReportsGSTTabProps {
  data: {
    summary: {
      totalTaxable: number;
      totalCGST: number;
      totalSGST: number;
      totalIGST: number;
      totalTaxCollected: number;
    };
    b2b: GSTInvoice[];
    b2c: GSTInvoice[];
    b2cStateSummaries: Array<{ state: string; taxableValue: number; cgst: number; sgst: number; igst: number; total: number }>;
    gstSlabs: Array<{ rate: number; taxableValue: number; cgst: number; sgst: number; igst: number; cess: number; total: number }>;
    hsnSummaries: Array<{ hsnCode: string; description: string; quantity: number; unit: string; taxableValue: number; cgst: number; sgst: number; igst: number; total: number }>;
  } | null;
}

export default function ReportsGSTTab({ data }: ReportsGSTTabProps) {
  const [subTab, setSubTab] = useState<'b2b' | 'b2c' | 'slabs' | 'hsn'>('b2b');

  if (!data) return null;

  const { summary, b2b, b2c, b2cStateSummaries, gstSlabs, hsnSummaries } = data;

  // Helper to convert arrays to CSV and trigger download
  const handleExportB2BCSV = () => {
    if (b2b.length === 0) {
      toast.error('No B2B invoice data available to export.');
      return;
    }

    // Standard Indian GSTR-1 B2B sheet headers
    const headers = [
      'GSTIN/UIN of Recipient',
      'Receiver Name',
      'Invoice Number',
      'Invoice Date',
      'Invoice Value (INR)',
      'Place Of Supply (State Code)',
      'Reverse Charge',
      'Applicable % of Tax Rate',
      'Invoice Type',
      'Taxable Value (INR)',
      'CGST (INR)',
      'SGST (INR)',
      'IGST (INR)',
      'Cess (INR)',
    ];

    const rows = b2b.map((inv) => [
      `"${inv.clientGstin}"`,
      `"${inv.clientName.replace(/"/g, '""')}"`,
      `"${inv.invoiceNumber}"`,
      formatDate(inv.issueDate),
      inv.grandTotal.toFixed(2),
      inv.placeOfSupply || '',
      '"N"',
      '100.0',
      '"Regular"',
      inv.taxableAmount.toFixed(2),
      inv.cgstTotal.toFixed(2),
      inv.sgstTotal.toFixed(2),
      inv.igstTotal.toFixed(2),
      inv.cessTotal.toFixed(2),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((e) => e.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `GSTR1_B2B_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('GSTR-1 B2B CSV exported successfully.');
  };

  return (
    <div className="space-y-6">
      {/* ── GST Tax KPI Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Billed */}
        <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450">Consolidated Taxable Value</p>
          <p className="text-lg font-black text-slate-850 dark:text-slate-100 mt-1">
            {formatCurrency(summary.totalTaxable, 'INR')}
          </p>
        </Card>

        {/* CGST */}
        <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450">Central Tax (CGST)</p>
          <p className="text-lg font-black text-slate-850 dark:text-slate-100 mt-1 text-sky-650 dark:text-sky-400">
            {formatCurrency(summary.totalCGST, 'INR')}
          </p>
        </Card>

        {/* SGST */}
        <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450">State Tax (SGST)</p>
          <p className="text-lg font-black text-slate-850 dark:text-slate-100 mt-1 text-violet-600 dark:text-violet-400">
            {formatCurrency(summary.totalSGST, 'INR')}
          </p>
        </Card>

        {/* IGST */}
        <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450">Integrated Tax (IGST)</p>
          <p className="text-lg font-black text-slate-850 dark:text-slate-100 mt-1 text-emerald-600 dark:text-emerald-450">
            {formatCurrency(summary.totalIGST, 'INR')}
          </p>
        </Card>
      </div>

      {/* ── Table & View Selector Layout ── */}
      <Card className="border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden">
        {/* Navigation Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/20">
          {/* Sub tabs selectors */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg shrink-0 self-start">
            <button
              onClick={() => setSubTab('b2b')}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                subTab === 'b2b'
                  ? 'bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
              }`}
            >
              <Building2 className="w-3 h-3" />
              <span>B2B ({b2b.length})</span>
            </button>
            <button
              onClick={() => setSubTab('b2c')}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                subTab === 'b2c'
                  ? 'bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
              }`}
            >
              <User className="w-3 h-3" />
              <span>B2C ({b2c.length})</span>
            </button>
            <button
              onClick={() => setSubTab('slabs')}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                subTab === 'slabs'
                  ? 'bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
              }`}
            >
              <Percent className="w-3 h-3" />
              <span>Tax Slabs ({gstSlabs.length})</span>
            </button>
            <button
              onClick={() => setSubTab('hsn')}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                subTab === 'hsn'
                  ? 'bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
              }`}
            >
              <Hash className="w-3 h-3" />
              <span>HSN Summary ({hsnSummaries.length})</span>
            </button>
          </div>

          {/* Export GSTR-1 CSV CTA */}
          {subTab === 'b2b' && b2b.length > 0 && (
            <Button
              size="sm"
              onClick={handleExportB2BCSV}
              className="h-8 text-[11px] font-bold bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer shadow-sm shadow-emerald-500/10 self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              <span>Export GSTR-1 B2B CSV</span>
            </Button>
          )}
        </div>

        {/* ── Table Rendering ── */}
        <div className="overflow-x-auto">
          {/* Sub-Tab 1: B2B Invoices */}
          {subTab === 'b2b' && (
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-950/10">
                <TableRow className="border-slate-200 dark:border-slate-800 text-[10px] font-extrabold text-slate-800 dark:text-slate-200">
                  <TableHead className="w-24">Inv. Number</TableHead>
                  <TableHead className="w-24">Date</TableHead>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Client GSTIN</TableHead>
                  <TableHead className="w-16 text-center">POS</TableHead>
                  <TableHead className="text-right">Taxable (₹)</TableHead>
                  <TableHead className="text-right">CGST (₹)</TableHead>
                  <TableHead className="text-right">SGST (₹)</TableHead>
                  <TableHead className="text-right">IGST (₹)</TableHead>
                  <TableHead className="text-right">Total (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-[11px] font-semibold text-slate-650 dark:text-slate-350 divide-y divide-slate-100 dark:divide-slate-800">
                {b2b.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-slate-450 italic">
                      No B2B (GST registered) client invoices found for this range.
                    </TableCell>
                  </TableRow>
                ) : (
                  b2b.map((inv) => (
                    <TableRow key={inv.id} className="border-slate-100 dark:border-slate-800">
                      <TableCell className="font-bold text-slate-800 dark:text-slate-150">{inv.invoiceNumber}</TableCell>
                      <TableCell>{formatDate(inv.issueDate)}</TableCell>
                      <TableCell className="font-bold">{inv.clientName}</TableCell>
                      <TableCell className="font-mono tracking-tight text-slate-800 dark:text-slate-100">{inv.clientGstin}</TableCell>
                      <TableCell className="text-center font-bold">{inv.placeOfSupply}</TableCell>
                      <TableCell className="text-right font-medium">{inv.taxableAmount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{inv.cgstTotal.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{inv.sgstTotal.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{inv.igstTotal.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold text-slate-800 dark:text-slate-150">
                        {inv.grandTotal.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {/* Sub-Tab 2: B2C Invoices */}
          {subTab === 'b2c' && (
            <div className="space-y-4 p-4">
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Grouped State-wise B2C Summary</h4>
              <Table className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <TableHeader className="bg-slate-50/50 dark:bg-slate-950/10">
                  <TableRow className="border-slate-200 dark:border-slate-800 text-[10px] font-extrabold text-slate-800 dark:text-slate-200">
                    <TableHead>Place of Supply (POS State)</TableHead>
                    <TableHead className="text-right">Total Taxable Value (₹)</TableHead>
                    <TableHead className="text-right">Total CGST (₹)</TableHead>
                    <TableHead className="text-right">Total SGST (₹)</TableHead>
                    <TableHead className="text-right">Total IGST (₹)</TableHead>
                    <TableHead className="text-right">Total B2C Value (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-[11px] font-semibold text-slate-650 dark:text-slate-350 divide-y divide-slate-100 dark:divide-slate-800">
                  {b2cStateSummaries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-slate-450 italic">
                        No state-wise B2C transaction aggregates found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    b2cStateSummaries.map((summary) => (
                      <TableRow key={summary.state} className="border-slate-100 dark:border-slate-800">
                        <TableCell className="font-bold text-slate-800 dark:text-slate-150">POS - {summary.state}</TableCell>
                        <TableCell className="text-right">{summary.taxableValue.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{summary.cgst.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{summary.sgst.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{summary.igst.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-bold text-slate-800 dark:text-slate-150">
                          {summary.total.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Sub-Tab 3: GST Slabs Summary */}
          {subTab === 'slabs' && (
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-950/10">
                <TableRow className="border-slate-200 dark:border-slate-800 text-[10px] font-extrabold text-slate-800 dark:text-slate-200">
                  <TableHead>GST Slab Rate</TableHead>
                  <TableHead className="text-right">Taxable Value (₹)</TableHead>
                  <TableHead className="text-right">CGST (₹)</TableHead>
                  <TableHead className="text-right">SGST (₹)</TableHead>
                  <TableHead className="text-right">IGST (₹)</TableHead>
                  <TableHead className="text-right">Total GST Collected (₹)</TableHead>
                  <TableHead className="text-right">Consolidated Total (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-[11px] font-semibold text-slate-650 dark:text-slate-350 divide-y divide-slate-100 dark:divide-slate-800">
                {gstSlabs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-450 italic">
                      No GST line item calculations found for this range.
                    </TableCell>
                  </TableRow>
                ) : (
                  gstSlabs.map((slab) => (
                    <TableRow key={slab.rate} className="border-slate-100 dark:border-slate-800">
                      <TableCell className="font-bold text-slate-800 dark:text-slate-150">{slab.rate}% GST</TableCell>
                      <TableCell className="text-right">{slab.taxableValue.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{slab.cgst.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{slab.sgst.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{slab.igst.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                        {(slab.cgst + slab.sgst + slab.igst).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-800 dark:text-slate-150">
                        {slab.total.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {/* Sub-Tab 4: HSN Summary */}
          {subTab === 'hsn' && (
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-950/10">
                <TableRow className="border-slate-200 dark:border-slate-800 text-[10px] font-extrabold text-slate-800 dark:text-slate-200">
                  <TableHead className="w-28">HSN/SAC Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center w-20">Quantity</TableHead>
                  <TableHead className="w-16 text-center">Unit</TableHead>
                  <TableHead className="text-right">Taxable Value (₹)</TableHead>
                  <TableHead className="text-right">Total Tax (₹)</TableHead>
                  <TableHead className="text-right">Total Amount (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-[11px] font-semibold text-slate-650 dark:text-slate-350 divide-y divide-slate-100 dark:divide-slate-800">
                {hsnSummaries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-450 italic">
                      No HSN coded product sales found for this range.
                    </TableCell>
                  </TableRow>
                ) : (
                  hsnSummaries.map((hsn) => (
                    <TableRow key={hsn.hsnCode} className="border-slate-100 dark:border-slate-800">
                      <TableCell className="font-mono font-bold text-slate-800 dark:text-slate-150">{hsn.hsnCode}</TableCell>
                      <TableCell className="truncate max-w-[200px]">{hsn.description}</TableCell>
                      <TableCell className="text-center">{hsn.quantity}</TableCell>
                      <TableCell className="text-center font-bold">{hsn.unit}</TableCell>
                      <TableCell className="text-right">{hsn.taxableValue.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-450">
                        {(hsn.cgst + hsn.sgst + hsn.igst).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-800 dark:text-slate-150">
                        {hsn.total.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  );
}
