'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Calendar,
  MoreVertical,
  Eye,
  Edit2,
  Download,
  Send,
  Copy,
  Trash2,
  Loader2,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  User,
  Archive,
  FolderDown,
  ArrowUpDown,
  FilterX,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import JSZip from 'jszip';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import DataTable, { Column } from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/helpers';
import CurrencyAmount from '@/components/shared/CurrencyAmount';

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  grandTotal: number;
  amountPaid: number;
  status: string;
  currency: string;
  client: {
    id: string;
    name: string;
    email: string | null;
  };
}

interface ClientOption {
  id: string;
  name: string;
}

export default function InvoicesPage() {
  const router = useRouter();

  // ── States ──
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [clients, setClients] = useState<ClientOption[]>([]);

  // ── Filters ──
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState('ALL');
  const [dateRange, setDateRange] = useState('ALL'); // ALL, THIS_MONTH, LAST_MONTH, THIS_QUARTER, CUSTOM
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [selectedClient, setSelectedClient] = useState('ALL');

  // ── Sorting ──
  const [sortBy, setSortBy] = useState<'invoiceNumber' | 'issueDate' | 'grandTotal'>('issueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // ── Pagination ──
  const [page, setPage] = useState(1);
  const limit = 10;

  // ── Selection & Bulk Actions ──
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkPaying, setIsBulkPaying] = useState(false);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);

  // ── Fetch Clients for Dropdown ──
  useEffect(() => {
    async function fetchClients() {
      try {
        const activeBizId = localStorage.getItem('active_business_id')?.replace(/^"|"$/g, '');
        const url = activeBizId ? `/api/clients?businessId=${activeBizId}` : '/api/clients';
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setClients(data.clients || []);
        }
      } catch (err) {
        console.error('Failed to fetch clients:', err);
      }
    }
    fetchClients();
  }, []);

  // ── Fetch Invoices based on filters ──
  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      // Calculate date filters
      let dateFrom = '';
      let dateTo = '';
      const now = new Date();

      if (dateRange === 'THIS_MONTH') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFrom = start.toISOString();
        dateTo = now.toISOString();
      } else if (dateRange === 'LAST_MONTH') {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        dateFrom = start.toISOString();
        dateTo = end.toISOString();
      } else if (dateRange === 'THIS_QUARTER') {
        const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
        const start = new Date(now.getFullYear(), quarterStartMonth, 1);
        dateFrom = start.toISOString();
        dateTo = now.toISOString();
      } else if (dateRange === 'CUSTOM') {
        if (customDateFrom) dateFrom = new Date(customDateFrom).toISOString();
        if (customDateTo) dateTo = new Date(customDateTo).toISOString();
      }

      const activeBizId = localStorage.getItem('active_business_id')?.replace(/^"|"$/g, '');
      const params = new URLSearchParams({
        status: statusTab,
        page: String(page),
        limit: String(limit),
      });

      if (activeBizId) params.append('businessId', activeBizId);
      if (selectedClient !== 'ALL') params.append('clientId', selectedClient);
      if (search.trim()) params.append('search', search.trim());
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const res = await fetch(`/api/invoices?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch invoices');
      
      const data = await res.json();
      setInvoices(data.invoices || []);
      setTotal(data.total || 0);
      setSelectedIds([]); // Reset selection when data reloads
    } catch (err: any) {
      console.error(err);
      toast.error('Could not load invoices.');
    } finally {
      setIsLoading(false);
    }
  };

  // Re-fetch when filters or page changes
  useEffect(() => {
    fetchInvoices();
  }, [statusTab, dateRange, customDateFrom, customDateTo, selectedClient, page, search]);

  // ── Client-side Sorting ──
  const sortedInvoices = useMemo(() => {
    return [...invoices].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'invoiceNumber') {
        comparison = a.invoiceNumber.localeCompare(b.invoiceNumber);
      } else if (sortBy === 'issueDate') {
        comparison = new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime();
      } else if (sortBy === 'grandTotal') {
        comparison = Number(a.grandTotal) - Number(b.grandTotal);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [invoices, sortBy, sortOrder]);

  const totalPages = Math.ceil(total / limit);

  // ── Row Selection Helpers ──
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(invoices.map((inv) => inv.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  // ── Single Actions ──
  const handleDownloadPDF = async (id: string, invoiceNum: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}/pdf`);
      if (!res.ok) throw new Error('Failed to generate PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanNum = invoiceNum.replace(/[^a-zA-Z0-9-_]/g, '_');
      a.download = `Invoice_${cleanNum}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`PDF downloaded: ${invoiceNum}`);
    } catch (err) {
      toast.error('Download failed.');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}/duplicate`, { method: 'POST' });
      if (!res.ok) throw new Error('Duplication failed');
      toast.success('Invoice duplicated successfully!');
      fetchInvoices();
    } catch (err) {
      toast.error('Failed to duplicate invoice.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Invoice deleted successfully!');
      fetchInvoices();
    } catch (err) {
      toast.error('Failed to delete invoice.');
    }
  };

  // ── Bulk Actions Execution ──
  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} invoices?`)) return;
    setIsBulkDeleting(true);
    try {
      await Promise.all(
        selectedIds.map((id) => fetch(`/api/invoices/${id}`, { method: 'DELETE' }))
      );
      toast.success(`Successfully deleted ${selectedIds.length} invoices.`);
      fetchInvoices();
    } catch (err) {
      toast.error('Some deletions failed.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkMarkPaid = async () => {
    setIsBulkPaying(true);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`/api/invoices/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'PAID', amountPaid: invoices.find((inv) => inv.id === id)?.grandTotal }),
          })
        )
      );
      toast.success(`Successfully marked ${selectedIds.length} invoices as Paid.`);
      fetchInvoices();
    } catch (err) {
      toast.error('Failed to update status.');
    } finally {
      setIsBulkPaying(false);
    }
  };

  const handleBulkDownloadZIP = async () => {
    setIsBulkDownloading(true);
    const zip = new JSZip();
    try {
      await Promise.all(
        selectedIds.map(async (id) => {
          const invRow = invoices.find((inv) => inv.id === id);
          if (!invRow) return;
          const res = await fetch(`/api/invoices/${id}/pdf`);
          if (res.ok) {
            const blob = await res.blob();
            const cleanNum = invRow.invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
            zip.file(`Invoice_${cleanNum}.pdf`, blob);
          }
        })
      );
      
      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoices_Export_${format(new Date(), 'yyyyMMdd_HHmmss')}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('ZIP archive generated and downloaded!');
    } catch (err) {
      toast.error('Failed to generate ZIP.');
    } finally {
      setIsBulkDownloading(false);
    }
  };

  // ── Sort Trigger Helper ──
  const triggerSort = (field: 'invoiceNumber' | 'issueDate' | 'grandTotal') => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // ── DataTable Columns Configuration ──
  const columns: Column<InvoiceRow>[] = [
    // Checkbox column
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={invoices.length > 0 && selectedIds.length === invoices.length}
          onChange={(e) => handleSelectAll(e.target.checked)}
          className="rounded border-slate-350 accent-emerald-500 cursor-pointer"
        />
      ),
      className: 'w-[40px] px-4 text-center',
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.id)}
          onChange={(e) => handleSelectRow(row.id, e.target.checked)}
          onClick={(e) => e.stopPropagation()} // prevent row navigation click
          className="rounded border-slate-350 accent-emerald-500 cursor-pointer"
        />
      ),
    },
    // Invoice Number
    {
      key: 'invoiceNumber',
      header: (
        <button
          onClick={() => triggerSort('invoiceNumber')}
          className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
        >
          <span>Invoice Number</span>
          <ArrowUpDown className="w-3.5 h-3.5" />
        </button>
      ),
      className: 'font-mono font-bold text-slate-850 dark:text-slate-100',
      render: (row) => <span>{row.invoiceNumber}</span>,
    },
    // Client Name
    {
      key: 'clientName',
      header: 'Client Name',
      render: (row) => <span className="font-semibold">{row.client.name}</span>,
    },
    // Issue Date
    {
      key: 'issueDate',
      header: (
        <button
          onClick={() => triggerSort('issueDate')}
          className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
        >
          <span>Issue Date</span>
          <ArrowUpDown className="w-3.5 h-3.5" />
        </button>
      ),
      render: (row) => <span className="text-slate-500">{formatDate(row.issueDate)}</span>,
    },
    // Due Date
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (row) => <span className="text-slate-500">{formatDate(row.dueDate)}</span>,
    },
    // Amount
    {
      key: 'grandTotal',
      header: (
        <button
          onClick={() => triggerSort('grandTotal')}
          className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200 ml-auto cursor-pointer"
        >
          <span>Amount</span>
          <ArrowUpDown className="w-3.5 h-3.5" />
        </button>
      ),
      className: 'text-right font-bold text-slate-855 dark:text-slate-50',
      render: (row) => {
        if (row.status === 'PARTIAL') {
          const pct = Math.min(100, Math.max(0, ((row.amountPaid || 0) / row.grandTotal) * 100));
          return (
            <div className="flex flex-col items-end gap-1 select-none">
              <div className="text-[10px] text-slate-500 font-semibold leading-none">
                {formatCurrency(Number(row.amountPaid || 0), row.currency)} / <span className="font-bold text-slate-850 dark:text-slate-50">{formatCurrency(Number(row.grandTotal), row.currency)}</span>
              </div>
              <div className="w-10 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        }
        return <CurrencyAmount amount={Number(row.grandTotal)} currency={row.currency} />;
      },
    },
    // Status
    {
      key: 'status',
      header: 'Status',
      className: 'text-center',
      render: (row) => (
        <StatusBadge
          status={row.status}
          amountPaid={row.amountPaid}
          grandTotal={row.grandTotal}
          currency={row.currency}
        />
      ),
    },
    // Actions Dropdown
    {
      key: 'actions',
      header: '',
      className: 'text-center w-[50px]',
      render: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger className="h-8 w-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md border-0 bg-transparent cursor-pointer p-0">
              <MoreVertical className="w-4 h-4 text-slate-500" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl shadow-lg w-40 text-left">
              <DropdownMenuItem
                onClick={() => router.push(`/invoices/${row.id}`)}
                className="text-xs font-semibold py-2 cursor-pointer flex items-center gap-2"
              >
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>View Details</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push(`/invoices/${row.id}/edit`)}
                className="text-xs font-semibold py-2 cursor-pointer flex items-center gap-2"
              >
                <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                <span>Edit Invoice</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDownloadPDF(row.id, row.invoiceNumber)}
                className="text-xs font-semibold py-2 cursor-pointer flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5 text-emerald-500" />
                <span>Download PDF</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDuplicate(row.id)}
                className="text-xs font-semibold py-2 cursor-pointer flex items-center gap-2"
              >
                <Copy className="w-3.5 h-3.5 text-indigo-500" />
                <span>Duplicate</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDelete(row.id)}
                className="text-xs font-semibold py-2 cursor-pointer flex items-center gap-2 text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 text-left">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-slate-200/60 dark:border-slate-800/80">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
            Invoices
          </h1>
          <p className="text-xs text-slate-500">View, search, and manage all your tax invoices.</p>
        </div>

        <Link href="/invoices/new">
          <Button className="h-9 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer shadow-md shadow-emerald-500/10">
            <Plus className="w-4 h-4 mr-1.5" />
            <span>New Invoice</span>
          </Button>
        </Link>
      </div>

      {/* ── Bulk Actions Floating Bar ── */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="sticky top-16 z-20 w-full bg-slate-900 text-white dark:bg-emerald-950/90 dark:text-emerald-50 py-3.5 px-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl border border-slate-850"
          >
            <div className="text-xs font-bold flex items-center gap-2">
              <span className="flex items-center justify-center w-5.5 h-5.5 rounded-full bg-emerald-500 text-white text-[10px] font-black">
                {selectedIds.length}
              </span>
              <span>Invoices Selected</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Mark as paid */}
              <Button
                size="sm"
                onClick={handleBulkMarkPaid}
                disabled={isBulkPaying || isBulkDeleting || isBulkDownloading}
                className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
              >
                {isBulkPaying ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                )}
                <span>Mark Paid</span>
              </Button>

              {/* Download ZIP */}
              <Button
                size="sm"
                onClick={handleBulkDownloadZIP}
                disabled={isBulkPaying || isBulkDeleting || isBulkDownloading}
                className="h-8 text-xs font-bold bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-100 cursor-pointer"
              >
                {isBulkDownloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <FolderDown className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
                )}
                <span>Export ZIP</span>
              </Button>

              {/* Delete */}
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={isBulkPaying || isBulkDeleting || isBulkDownloading}
                className="h-8 text-xs font-bold bg-red-650 hover:bg-red-600 text-white cursor-pointer"
              >
                {isBulkDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                )}
                <span>Delete</span>
              </Button>

              {/* Cancel selection */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds([])}
                className="h-8 text-xs font-bold text-slate-400 hover:text-white cursor-pointer hover:bg-slate-800"
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Filter Bar ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-5 shadow-xs space-y-4">
        {/* Search input + Client Select + Date Range Selector */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Search bar */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by invoice number or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 text-sm border-slate-350 dark:border-slate-800 dark:bg-slate-950"
            />
          </div>

          {/* Client Filter */}
          <div className="md:col-span-3 text-xs">
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full h-9 px-3 bg-white border border-slate-350 dark:border-slate-800 dark:bg-slate-950 rounded-lg text-slate-700 dark:text-slate-200 font-semibold focus:outline-none"
            >
              <option value="ALL">All Customers</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date range filter */}
          <div className="md:col-span-4 text-xs">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full h-9 px-3 bg-white border border-slate-350 dark:border-slate-800 dark:bg-slate-950 rounded-lg text-slate-700 dark:text-slate-200 font-semibold focus:outline-none"
            >
              <option value="ALL">All Time</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="LAST_MONTH">Last Month</option>
              <option value="THIS_QUARTER">This Quarter</option>
              <option value="CUSTOM">Custom Range...</option>
            </select>
          </div>
        </div>

        {/* Custom date range inputs (conditional) */}
        {dateRange === 'CUSTOM' && (
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">From:</span>
              <input
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                className="h-8 px-2.5 border border-slate-300 dark:border-slate-800 dark:bg-slate-950 rounded-md font-mono"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">To:</span>
              <input
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                className="h-8 px-2.5 border border-slate-300 dark:border-slate-800 dark:bg-slate-950 rounded-md font-mono"
              />
            </div>
          </div>
        )}

        {/* Status Tab buttons */}
        <div className="flex flex-wrap border-b border-slate-100 dark:border-slate-850/80 gap-1.5 pb-0.5 scrollbar-thin select-none">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'DRAFT', label: 'Drafts' },
            { id: 'SENT', label: 'Sent' },
            { id: 'PAID', label: 'Paid' },
            { id: 'OVERDUE', label: 'Overdue' },
            { id: 'CANCELLED', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusTab(tab.id);
                setPage(1); // reset to first page
              }}
              className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                statusTab === tab.id
                  ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Invoice DataTable ── */}
      <DataTable
        columns={columns}
        data={sortedInvoices}
        isLoading={isLoading}
        onRowClick={(row) => router.push(`/invoices/${row.id}`)}
        emptyState={{
          title: 'No invoices found',
          description: 'Try adjusting your search criteria or create a new invoice.',
          icon: <FilterX className="w-10 h-10 text-slate-400 mb-2" />,
        }}
      />

      {/* ── Numbered Pagination Controls ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between py-2 text-xs font-bold text-slate-550 select-none">
          <div>
            Showing <span className="text-slate-850 dark:text-slate-200">{(page - 1) * limit + 1}</span> to{' '}
            <span className="text-slate-850 dark:text-slate-200">{Math.min(page * limit, total)}</span> of{' '}
            <span className="text-slate-850 dark:text-slate-200">{total}</span> invoices
          </div>

          <div className="flex items-center gap-1.5">
            {/* Prev */}
            <Button
              variant="outline"
              size="icon"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="h-8 w-8 border-slate-200 dark:border-slate-850 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            {/* Numbers */}
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              return (
                <Button
                  key={`page-${pageNum}`}
                  variant={page === pageNum ? 'default' : 'outline'}
                  onClick={() => setPage(pageNum)}
                  className={`h-8 w-8 font-bold text-xs cursor-pointer ${
                    page === pageNum
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                      : 'border-slate-200 dark:border-slate-850 text-slate-650 hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </Button>
              );
            })}

            {/* Next */}
            <Button
              variant="outline"
              size="icon"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 w-8 border-slate-200 dark:border-slate-850 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
