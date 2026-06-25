'use client';

import React, { useEffect, useState } from 'react';
import { 
  Inbox, 
  Coins, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Copy, 
  Check, 
  Calendar,
  AlertTriangle,
  Clock,
  User,
  ExternalLink,
  Loader2,
  Trash2,
  Filter,
  Search
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/helpers';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface Client {
  id: string;
  name: string;
}

interface PaymentProof {
  id: string;
  invoiceId: string;
  userId: string;
  utr: string | null;
  screenshotUrl: string | null;
  amountPaid: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'AUTO_APPROVED';
  submittedAt: string;
  verifiedAt: string | null;
  rejectionReason: string | null;
  autoApproveAt: string | null;
  autoApproved: boolean;
  invoice: {
    invoiceNumber: number;
    currency: string;
    grandTotal: number;
    client: {
      name: string;
    };
  };
}

interface PaymentsInboxClientProps {
  initialClients: Client[];
}

export default function PaymentsInboxClient({ initialClients }: PaymentsInboxClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Pagination & Filter States
  const [statusFilter, setStatusFilter] = useState<string>('pending'); // approved, rejected, auto_approved, all
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    pendingCount: 0,
    autoApprovingSoonCount: 0,
    totalApprovedThisMonth: 0
  });

  // Action States
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [activeProof, setActiveProof] = useState<PaymentProof | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Reject Form States
  const [rejectionReason, setRejectionReason] = useState('Payment not received in UPI app');
  const [customReason, setCustomReason] = useState('');

  // Fetch Payments Inbox
  const fetchInbox = async () => {
    setLoading(true);
    try {
      const statusParam = activeTab === 'pending' ? 'pending' : statusFilter;
      const clientParam = clientFilter === 'all' ? '' : `&clientId=${clientFilter}`;
      
      const res = await fetch(`/api/payments/inbox?status=${statusParam}${clientParam}&page=${page}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setProofs(data.proofs || []);
        setTotalPages(data.pagination.pages || 1);
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch payments inbox:', err);
      toast.error('Failed to load payments inbox.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, [activeTab, statusFilter, clientFilter, page]);

  const handleCopyUtr = (utr: string, id: string) => {
    navigator.clipboard.writeText(utr);
    setCopiedId(id);
    toast.success('UTR copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Action: Approve API call
  const handleApproveSubmit = async () => {
    if (!activeProof) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proofId: activeProof.id,
          action: 'APPROVE'
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to approve payment');
      }

      toast.success('Payment approved and recorded!');
      setIsApproveOpen(false);
      fetchInbox();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Verification failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Reject API call
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProof) return;

    const finalReason = rejectionReason === 'Other' ? customReason.trim() : rejectionReason;
    if (!finalReason) {
      toast.error('Please enter a rejection reason.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proofId: activeProof.id,
          action: 'REJECT',
          rejectionReason: finalReason
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reject payment proof');
      }

      toast.success('Payment proof rejected. Client notified.');
      setIsRejectOpen(false);
      setCustomReason('');
      fetchInbox();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Format Countdown Timer
  const renderCountdown = (autoApproveAt: string | null) => {
    if (!autoApproveAt) return null;
    
    const diff = new Date(autoApproveAt).getTime() - Date.now();
    if (diff <= 0) return <span className="text-red-500 font-bold">Auto-approving now</span>;

    const totalMinutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const isSoon = hours < 24;

    return (
      <div className={`flex items-center gap-1 text-[11px] font-bold ${isSoon ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`}>
        <Clock className="w-3.5 h-3.5" />
        <span>Auto-approve in {hours}h {minutes}m</span>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 p-4 text-left">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-slate-200/60 dark:border-slate-800/85">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-slate-905 dark:text-slate-50 tracking-tight">
            Payments Inbox
          </h1>
          <p className="text-xs text-slate-500">
            Verify manual client bank transfers and UPI transactions.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 select-none">
        <Card className="p-4 border border-slate-200/60 dark:border-slate-800/85 bg-white dark:bg-slate-900 rounded-xl shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Pending Approvals</span>
            <span className="text-lg font-black text-slate-850 dark:text-slate-100">{stats.pendingCount} proofs</span>
          </div>
        </Card>

        <Card className="p-4 border border-slate-200/60 dark:border-slate-800/85 bg-white dark:bg-slate-900 rounded-xl shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Auto-Approving Soon</span>
            <span className="text-lg font-black text-slate-850 dark:text-slate-100">{stats.autoApprovingSoonCount} entries</span>
          </div>
        </Card>

        <Card className="p-4 border border-slate-200/60 dark:border-slate-800/85 bg-white dark:bg-slate-900 rounded-xl shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Settled This Month</span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-450">{formatCurrency(stats.totalApprovedThisMonth, 'INR')}</span>
          </div>
        </Card>
      </div>

      {/* Filter Tabs & Sub-filters */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 p-3.5 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-850 rounded-xl">
        {/* Navigation Tabs */}
        <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg shrink-0 w-fit select-none">
          <button
            onClick={() => { setActiveTab('pending'); setPage(1); }}
            className={`px-4 py-1.5 text-xs font-black tracking-tight rounded-md transition-all cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-white dark:bg-slate-800 text-slate-850 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
            }`}
          >
            Pending Verifications ({stats.pendingCount})
          </button>
          <button
            onClick={() => { setActiveTab('history'); setPage(1); }}
            className={`px-4 py-1.5 text-xs font-black tracking-tight rounded-md transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white dark:bg-slate-800 text-slate-850 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
            }`}
          >
            Verification History
          </button>
        </div>

        {/* Filters Dropdown */}
        <div className="flex flex-wrap items-center gap-3">
          {activeTab === 'history' && (
            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val || 'pending'); setPage(1); }}>
              <SelectTrigger className="h-9 w-36 text-xs font-bold border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border dark:border-slate-800">
                <SelectItem value="all" className="text-xs font-bold">All Statuses</SelectItem>
                <SelectItem value="approved" className="text-xs font-bold text-emerald-650">Approved</SelectItem>
                <SelectItem value="auto_approved" className="text-xs font-bold text-blue-500">Auto-Approved</SelectItem>
                <SelectItem value="rejected" className="text-xs font-bold text-red-500">Rejected</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Select value={clientFilter} onValueChange={(val) => { setClientFilter(val || 'all'); setPage(1); }}>
            <SelectTrigger className="h-9 w-40 text-xs font-bold border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900">
              <SelectValue placeholder="Filter by Client" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-900 border dark:border-slate-800">
              <SelectItem value="all" className="text-xs font-bold">All Clients</SelectItem>
              {initialClients.map((client) => (
                <SelectItem key={client.id} value={client.id} className="text-xs font-semibold">
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchInbox} 
            className="h-9 w-9 p-0 border-slate-250 dark:border-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
            title="Refresh list"
          >
            <Loader2 className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Main Inbox Lists */}
      {loading ? (
        /* Loading skeleton */
        <div className="py-24 text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
          <p className="text-xs text-slate-500 font-bold">Syncing payments inbox...</p>
        </div>
      ) : proofs.length === 0 ? (
        /* Empty State */
        <Card className="p-12 border border-dashed border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-50 dark:bg-slate-850 flex items-center justify-center text-slate-400 select-none">
            <Inbox className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-black text-slate-800 dark:text-slate-205">
              {activeTab === 'pending' ? 'All caught up!' : 'No payment history'}
            </h4>
            <p className="text-xs text-slate-450 max-w-sm">
              {activeTab === 'pending' 
                ? 'No client payment proofs are currently awaiting verification.' 
                : 'No historical verification logs matched your filters.'}
            </p>
          </div>
        </Card>
      ) : activeTab === 'pending' ? (
        /* ── Pending proofs list ── */
        <div className="grid grid-cols-1 gap-4">
          {proofs.map((proof) => (
            <Card 
              key={proof.id} 
              className="p-5 border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 rounded-xl shadow-xs grid grid-cols-1 md:grid-cols-12 gap-5 items-center hover:border-slate-300 dark:hover:border-slate-800 transition-all text-xs"
            >
              {/* Col 1: Client & Invoice metadata */}
              <div className="md:col-span-3 space-y-1.5 text-left">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center font-bold text-[10px] select-none">
                    {proof.invoice.client.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-850 dark:text-slate-100 leading-none">
                      {proof.invoice.client.name}
                    </h4>
                    <span className="text-[10px] text-slate-450 font-medium">Submitted {formatDate(proof.submittedAt)}</span>
                  </div>
                </div>
                <div className="pt-1 flex items-center gap-1.5">
                  <a 
                    href={`/invoices/${proof.invoiceId}`}
                    className="font-mono text-[10px] font-bold text-indigo-650 hover:underline flex items-center gap-0.5"
                  >
                    <span>INV-{proof.invoice.invoiceNumber}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  <span className="text-slate-300 dark:text-slate-800">|</span>
                  <span className="text-[10px] text-slate-450 font-medium">Total: {formatCurrency(proof.invoice.grandTotal, proof.invoice.currency)}</span>
                </div>
              </div>

              {/* Col 2: Claimed payment details */}
              <div className="md:col-span-3 text-left space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Claimed Payment</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-450 block">
                  {formatCurrency(Number(proof.amountPaid), proof.invoice.currency)}
                </span>
                {renderCountdown(proof.autoApproveAt)}
              </div>

              {/* Col 3: UTR verification box */}
              <div className="md:col-span-3 text-left space-y-1 bg-slate-50/50 dark:bg-slate-950/20 p-2.5 border border-slate-100 dark:border-slate-850 rounded-lg">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Submitted UTR</span>
                <div className="flex items-center justify-between gap-2 font-mono">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px] truncate max-w-[130px]">
                    {proof.utr}
                  </span>
                  <button
                    onClick={() => handleCopyUtr(proof.utr || '', proof.id)}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 rounded cursor-pointer"
                  >
                    {copiedId === proof.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Col 4: Screenshot click */}
              <div className="md:col-span-1 flex items-center justify-start md:justify-center">
                {proof.screenshotUrl ? (
                  <button
                    onClick={() => { setActiveProof(proof); setIsImageOpen(true); }}
                    className="group relative flex items-center justify-center w-12 h-12 border border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-950 rounded-lg overflow-hidden cursor-pointer"
                  >
                    <img 
                      src={proof.screenshotUrl} 
                      alt="Payment proof screenshot preview" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Eye className="w-4 h-4" />
                    </div>
                  </button>
                ) : (
                  <span className="text-[10px] font-bold text-slate-400 italic">No attachment</span>
                )}
              </div>

              {/* Col 5: Main approve/reject buttons */}
              <div className="md:col-span-2 flex items-center justify-end gap-2 shrink-0">
                <Button
                  onClick={() => { setActiveProof(proof); setIsRejectOpen(true); }}
                  variant="ghost"
                  className="h-8 text-xs font-bold text-red-550 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer px-2 rounded-lg"
                >
                  Reject
                </Button>
                <Button
                  onClick={() => { setActiveProof(proof); setIsApproveOpen(true); }}
                  className="h-8 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer px-3 rounded-lg"
                >
                  Approve
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* ── Historical logs table ── */
        <Card className="border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-850 font-bold text-slate-500 select-none">
                  <th className="p-3.5 pl-5">Date</th>
                  <th className="p-3.5">Client</th>
                  <th className="p-3.5">Invoice</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">UTR / Reference</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 pr-5">Rejection Details</th>
                </tr>
              </thead>
              <tbody>
                {proofs.map((proof) => (
                  <tr 
                    key={proof.id} 
                    className="border-b border-slate-50 dark:border-slate-850/40 hover:bg-slate-50/30 dark:hover:bg-slate-950/10 transition-colors"
                  >
                    {/* Date */}
                    <td className="p-3.5 pl-5 font-mono text-slate-500">
                      {formatDate(proof.submittedAt)}
                    </td>

                    {/* Client */}
                    <td className="p-3.5 font-extrabold text-slate-800 dark:text-slate-200">
                      {proof.invoice.client.name}
                    </td>

                    {/* Invoice Link */}
                    <td className="p-3.5 font-mono font-bold">
                      <a 
                        href={`/invoices/${proof.invoiceId}`}
                        className="text-indigo-650 hover:underline"
                      >
                        #{proof.invoice.invoiceNumber}
                      </a>
                    </td>

                    {/* Amount */}
                    <td className="p-3.5 font-black text-slate-800 dark:text-slate-100">
                      {formatCurrency(Number(proof.amountPaid), proof.invoice.currency)}
                    </td>

                    {/* UTR */}
                    <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                      {proof.utr}
                    </td>

                    {/* Status Badge */}
                    <td className="p-3.5 font-bold">
                      {proof.status === 'APPROVED' ? (
                        <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/20 text-emerald-650 dark:text-emerald-450 border border-emerald-500/10">
                          Approved
                        </span>
                      ) : proof.status === 'AUTO_APPROVED' ? (
                        <span className="inline-block px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-450 border border-blue-500/10">
                          Auto-Approved
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded bg-red-50 dark:bg-red-950/20 text-red-500 dark:text-red-450 border border-red-500/10">
                          Rejected
                        </span>
                      )}
                    </td>

                    {/* Rejection Reasons */}
                    <td className="p-3.5 pr-5 text-slate-500 italic max-w-xs truncate">
                      {proof.rejectionReason || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination Strip */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-850 text-xs select-none">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="h-8 font-bold text-xs"
          >
            Previous
          </Button>
          <span className="text-slate-500 font-bold">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="h-8 font-bold text-xs"
          >
            Next
          </Button>
        </div>
      )}

      {/* ── DIALOG: CONFIRM APPROVE PAYMENT ── */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent className="sm:max-w-[420px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <span>Confirm Payment Receipt?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-normal">
              Confirm that you have received the payment of{' '}
              <strong className="text-emerald-600 dark:text-emerald-450">
                {activeProof ? formatCurrency(activeProof.amountPaid, activeProof.invoice.currency) : ''}
              </strong>{' '}
              on your bank statement / UPI app.
            </DialogDescription>
          </DialogHeader>

          {activeProof && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-450 font-bold">UTR Reference:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{activeProof.utr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450 font-bold">Billed Client:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{activeProof.invoice.client.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450 font-bold">Invoice Number:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-205">#{activeProof.invoice.invoiceNumber}</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2 text-left sm:text-right">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsApproveOpen(false)}
              className="h-9 font-bold text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApproveSubmit}
              disabled={actionLoading}
              className="h-9 font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  <span>Settling...</span>
                </>
              ) : (
                'Confirm Received'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: REJECT PAYMENT PROOF ── */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="sm:max-w-[420px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <span>Reject Payment Proof?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-normal">
              Decline the submission. An automated warning email will be sent to the client to re-submit.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRejectSubmit} className="space-y-4 pt-2 text-left">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Rejection Reason
              </label>
              <Select value={rejectionReason} onValueChange={(val) => setRejectionReason(val || '')}>
                <SelectTrigger className="h-10 text-xs font-semibold border-slate-350 dark:border-slate-800 bg-white dark:bg-slate-950">
                  <SelectValue placeholder="Select reason..." />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border dark:border-slate-800">
                  {[
                    'Payment not received in UPI app',
                    'Wrong amount submitted',
                    'Incorrect UTR reference number',
                    'Screenshot unclear or cropped',
                    'Other'
                  ].map((r) => (
                    <SelectItem key={r} value={r} className="text-xs font-semibold cursor-pointer">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {rejectionReason === 'Other' && (
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Custom Rejection Details
                </label>
                <Textarea
                  required
                  placeholder="Enter details on what is wrong with the transaction reference..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="text-xs border-slate-300 dark:border-slate-800 dark:bg-slate-950"
                  rows={2}
                />
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-2 text-left sm:text-right">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRejectOpen(false)}
                className="h-9 font-bold text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={actionLoading}
                className="h-9 font-bold text-xs bg-red-500 hover:bg-red-650 text-white cursor-pointer"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    <span>Processing...</span>
                  </>
                ) : (
                  'Confirm Reject'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: FULL SCREEN SCREENSHOT EXPAND ── */}
      <Dialog open={isImageOpen} onOpenChange={setIsImageOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto bg-slate-900 border border-slate-800 p-3 rounded-2xl flex flex-col justify-center items-center shadow-2xl">
          {activeProof?.screenshotUrl ? (
            <img 
              src={activeProof.screenshotUrl} 
              alt="Payment Transaction Slip Receipt Upload" 
              className="max-w-full max-h-[70vh] rounded-lg object-contain"
            />
          ) : null}
          {activeProof && (
            <div className="pt-3 w-full flex justify-between items-center text-[10px] font-mono text-slate-400">
              <span>UTR: {activeProof.utr}</span>
              <span>Claimed: {formatCurrency(Number(activeProof.amountPaid), activeProof.invoice.currency)}</span>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
