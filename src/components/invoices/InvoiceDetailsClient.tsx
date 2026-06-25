'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  History,
  Coins,
  CheckCircle,
  FileText,
  Trash2,
  Copy,
  Ban,
  ArrowLeft,
  Mail,
  Loader2,
  AlertCircle,
  Sparkles,
  Edit2,
  Send,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

import InvoicePreview from '@/components/invoice-templates/InvoicePreview';
import DeliveryActions from './DeliveryActions';
import StatusBadge from '@/components/shared/StatusBadge';
import ReminderHistory from './ReminderHistory';
import { formatCurrency, formatDate } from '@/lib/helpers';
import PaymentPanel from './PaymentPanel';
import SendReminderButton from './SendReminderButton';

interface InvoiceDetailsClientProps {
  invoice: any; // Serialized invoice object
  reminderTemplates?: any[];
  viewIntelligence?: any;
}

export default function InvoiceDetailsClient({ 
  invoice: initialInvoice,
  reminderTemplates = [],
  viewIntelligence,
}: InvoiceDetailsClientProps) {
  const router = useRouter();
  const [invoice, setInvoice] = useState(initialInvoice);

  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);

  const getChartData = () => {
    if (!viewIntelligence || !viewIntelligence.viewEvents) return [];
    
    // Group last 30 days
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      days[dateStr] = 0;
    }
    
    viewIntelligence.viewEvents.forEach((e: any) => {
      const dateStr = new Date(e.viewedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      if (days[dateStr] !== undefined) {
        days[dateStr]++;
      }
    });
    
    return Object.entries(days).map(([date, count]) => ({
      date,
      Views: count
    }));
  };

  const refetchInvoice = async () => {
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`);
      if (res.ok) {
        const data = await res.json();
        setInvoice((prev: any) => ({
          ...data.invoice,
          reminders: prev.reminders
        }));
      }
    } catch (err) {
      console.error('Failed to refetch invoice details:', err);
    }
  };

  // ── Cancellation Form State ──
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const outstanding = invoice.grandTotal - invoice.amountPaid;
  const isUnpaid = invoice.status === 'SENT' || invoice.status === 'PARTIAL' || invoice.status === 'OVERDUE';
  const progressPercent = Math.min(100, Math.max(0, (invoice.amountPaid / invoice.grandTotal) * 100));

  // ── 2. Cancel Invoice API Call ──
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason for cancellation.');
      return;
    }

    setIsSubmittingCancel(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CANCELLED',
          paymentNotes: `Cancelled: ${cancelReason.trim()}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel invoice');

      // Update local state
      setInvoice(data.invoice);
      toast.success('Invoice cancelled successfully.');
      setIsCancelDialogOpen(false);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to cancel invoice.');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // ── 3. Duplicate Invoice API Call ──
  const handleDuplicate = async () => {
    setIsDuplicating(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/duplicate`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to duplicate');

      toast.success('Invoice duplicated successfully!');
      router.push(`/invoices/${data.invoice.id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to duplicate invoice.');
    } finally {
      setIsDuplicating(false);
    }
  };

  const totals = {
    subTotal: Number(invoice.subTotal),
    discountTotal: Number(invoice.discountTotal),
    taxableAmount: Number(invoice.taxableAmount),
    cgstTotal: Number(invoice.cgstTotal),
    sgstTotal: Number(invoice.sgstTotal),
    igstTotal: Number(invoice.igstTotal),
    cessTotal: Number(invoice.cessTotal),
    roundOff: Number(invoice.roundOff),
    grandTotal: Number(invoice.grandTotal),
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 p-4 text-left">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-slate-200/60 dark:border-slate-800/85">
        <div className="space-y-1">
          <Link
            href="/invoices"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-350 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Invoices</span>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
              Invoice Details
            </h1>
            <span className="font-mono text-xs text-slate-450 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-bold">
              {invoice.invoiceNumber}
            </span>
            <StatusBadge status={invoice.status} />
          </div>
          <p className="text-xs text-slate-500">
            Created on {formatDate(invoice.createdAt)}
          </p>
        </div>

        {/* Header Action Shortcuts */}
        <div className="flex flex-wrap gap-2.5">
          <Link href={`/invoices/${invoice.id}/edit`}>
            <Button variant="outline" size="sm" className="h-9 text-xs font-bold border-slate-250 dark:border-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer">
              <Edit2 className="w-3.5 h-3.5 mr-1 text-blue-500" />
              <span>Edit</span>
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDuplicate}
            disabled={isDuplicating}
            className="h-9 text-xs font-bold border-slate-250 dark:border-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            {isDuplicating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
            ) : (
              <Copy className="w-3.5 h-3.5 mr-1 text-indigo-500" />
            )}
            <span>Duplicate</span>
          </Button>
        </div>
      </div>

      {/* ── Action Delivery Bar ── */}
      <div className="space-y-2">
        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          Delivery & Copy Actions
        </h3>
        <DeliveryActions invoice={invoice} onUpdate={refetchInvoice} />
      </div>

      {/* ── Main content grid: Preview vs Sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Visual Invoice Template Preview */}
        <div className="lg:col-span-2 space-y-2">
          <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Visual Invoice Template
          </h3>
          <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-md">
            <InvoicePreview
              invoice={invoice}
              totals={totals}
              business={invoice.business}
              client={invoice.client}
              template={invoice.template}
            />
          </div>
        </div>

        {/* Right Action/Status Sidebar */}
        <div className="space-y-6">
          {/* 1. Invoice Actions Card */}
          <Card className="p-5 border border-slate-200/60 dark:border-slate-800/85 bg-white dark:bg-slate-900 rounded-xl shadow-xs text-left space-y-4">
            <h4 className="text-xs font-black text-slate-800 dark:text-slate-250 uppercase tracking-wider pb-1.5 border-b border-slate-100 dark:border-slate-850">
              Invoice Actions
            </h4>

            <div className="flex flex-col gap-2.5">
              {/* Send Reminder (only if unpaid status) */}
              {isUnpaid && (
                <SendReminderButton 
                  invoice={invoice} 
                  reminderTemplates={reminderTemplates} 
                  onReminderSent={(updatedInvoice) => {
                    setInvoice(updatedInvoice);
                  }}
                />
              )}

              {/* Mark as paid (unpaid only) */}
              {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                <Button
                  onClick={() => setIsRecordPaymentOpen(true)}
                  className="w-full h-9 font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer"
                >
                  <Coins className="w-3.5 h-3.5 mr-2" />
                  <span>Mark as Paid</span>
                </Button>
              )}

              {/* Cancel Invoice */}
              {invoice.status !== 'CANCELLED' && (
                <Button
                  variant="outline"
                  onClick={() => setIsCancelDialogOpen(true)}
                  className="w-full h-9 font-bold text-xs border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/20 text-red-650 dark:text-red-400 cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5 mr-2" />
                  <span>Cancel Invoice</span>
                </Button>
              )}
            </div>
          </Card>

          {/* 2. Payment Status Panel */}
          <PaymentPanel
            invoice={invoice}
            onPaymentChange={refetchInvoice}
            isRecordOpen={isRecordPaymentOpen}
            onRecordOpenChange={setIsRecordPaymentOpen}
          />

          {/* View Intelligence Card */}
          {invoice.publicShareId && viewIntelligence && (
            <Card className="p-5 border border-slate-200/60 dark:border-slate-800/85 bg-white dark:bg-slate-900 rounded-xl shadow-xs text-left space-y-4">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-250 uppercase tracking-wider pb-1.5 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between">
                <span>View Intelligence</span>
                <Eye className="w-3.5 h-3.5 text-slate-400" />
              </h4>

              <div className="space-y-3.5 text-xs">
                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2 text-center bg-slate-50/50 dark:bg-slate-950/20 p-2.5 rounded-lg border border-slate-100 dark:border-slate-850/60">
                  <div>
                    <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Total Views</span>
                    <span className="text-lg font-black text-slate-800 dark:text-slate-100">{viewIntelligence.viewCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Unique Viewers</span>
                    <span className="text-lg font-black text-slate-800 dark:text-slate-100 font-mono">
                      {new Set((viewIntelligence.viewEvents || []).map((e: any) => e.ipHash || e.id)).size || 0}
                    </span>
                  </div>
                </div>

                {/* Last Viewed info */}
                <div className="space-y-1.5 font-semibold text-slate-600 dark:text-slate-400">
                  {viewIntelligence.lastViewedAt ? (
                    <>
                      <p className="flex justify-between">
                        <span className="text-slate-450">Last Viewed:</span>
                        <span className="text-slate-800 dark:text-slate-200">
                          {new Date(viewIntelligence.lastViewedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-450">Last Device:</span>
                        <span className="text-slate-800 dark:text-slate-200 capitalize">
                          {viewIntelligence.lastDeviceType || 'unknown'}
                        </span>
                      </p>
                    </>
                  ) : (
                    <p className="text-slate-450 italic text-center py-1">Never viewed by client yet</p>
                  )}
                </div>

                {/* Insight Badge */}
                {viewIntelligence.insight && (
                  <div className={`p-2.5 rounded-lg border text-[10px] font-bold flex items-start gap-1.5 leading-tight ${
                    viewIntelligence.insightType === 'action' 
                      ? 'bg-red-50/50 border-red-100 dark:bg-red-950/10 dark:border-red-900/30 text-red-650 dark:text-red-400'
                      : viewIntelligence.insightType === 'warning'
                      ? 'bg-amber-50/50 border-amber-105 dark:bg-amber-950/10 dark:border-amber-900/30 text-amber-650 dark:text-amber-400'
                      : 'bg-blue-50/50 border-blue-100 dark:bg-blue-950/10 dark:border-blue-900/30 text-blue-650 dark:text-blue-400'
                  }`}>
                    <span className="mt-0.5 shrink-0">{viewIntelligence.insightType === 'action' ? '⚠️' : viewIntelligence.insightType === 'warning' ? '🔔' : 'ℹ️'}</span>
                    <span>{viewIntelligence.insight}</span>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAnalyticsOpen(true)}
                  className="w-full h-8 text-[10px] font-bold border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-350 cursor-pointer"
                >
                  View Analytics Details
                </Button>
              </div>
            </Card>
          )}

          {/* 3. Activity Audit Log Card */}
          <Card className="p-5 border border-slate-200/60 dark:border-slate-800/85 bg-white dark:bg-slate-900 rounded-xl shadow-xs text-left space-y-4">
            <h4 className="text-xs font-black text-slate-800 dark:text-slate-250 uppercase tracking-wider pb-1.5 border-b border-slate-100 dark:border-slate-850">
              Activity Log
            </h4>

            <div className="space-y-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
              {/* Created */}
              <div className="flex gap-2.5 items-start">
                <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-500 mt-0.5">
                  <Calendar className="w-3 h-3" />
                </div>
                <div>
                  <p className="text-slate-800 dark:text-slate-200">Invoice Created</p>
                  <p className="text-[10px] text-slate-450 mt-0.5">{formatDate(invoice.createdAt)}</p>
                </div>
              </div>

              {/* Sent */}
              {invoice.status !== 'DRAFT' && (
                <div className="flex gap-2.5 items-start">
                  <div className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center shrink-0 text-blue-500 mt-0.5">
                    <Send className="w-3 h-3" />
                  </div>
                  <div>
                    <p className="text-slate-800 dark:text-slate-200">Invoice Sent</p>
                    <p className="text-[10px] text-slate-450 mt-0.5">Dispatched on {formatDate(invoice.issueDate)}</p>
                  </div>
                </div>
              )}

              {/* Viewed */}
              <div className="flex gap-2.5 items-start">
                <div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center shrink-0 text-indigo-500 mt-0.5">
                  <Sparkles className="w-3 h-3" />
                </div>
                <div>
                  <p className="text-slate-800 dark:text-slate-200">Public Views</p>
                  <p className="text-[10px] text-slate-450 mt-0.5">Accessed {invoice.viewCount} times</p>
                </div>
              </div>

              {/* Paid */}
              {invoice.status === 'PAID' && (
                <div className="flex gap-2.5 items-start">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center shrink-0 text-emerald-500 mt-0.5">
                    <CheckCircle className="w-3 h-3" />
                  </div>
                  <div>
                    <p className="text-slate-800 dark:text-slate-200">Settled (Paid)</p>
                    <p className="text-[10px] text-slate-450 mt-0.5">
                      Fully paid on {invoice.paidAt ? formatDate(invoice.paidAt) : formatDate(invoice.updatedAt)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* 4. Sent Reminders History Log */}
          <ReminderHistory reminders={invoice.reminders} />
        </div>
      </div>

      {/* ── CANCEL INVOICE DIALOG ── */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-slate-50 tracking-tight text-left">
              Cancel Invoice
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 text-left">
              Are you sure you want to cancel this invoice? This action marks the status as Cancelled and is irreversible.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCancelSubmit} className="space-y-4 pt-2 text-left">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wide">
                Reason for Cancellation
              </label>
              <Textarea
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g., Duplicate entry, client requested amendments, project cancelled"
                className="text-xs border-slate-300 dark:border-slate-800 dark:bg-slate-950"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCancelDialogOpen(false)}
                className="h-9 font-bold text-xs"
              >
                Go Back
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingCancel}
                className="h-9 font-bold text-xs bg-red-650 hover:bg-red-600 text-white cursor-pointer"
              >
                {isSubmittingCancel ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Cancel Invoice</span>
                )}
              </Button>
            </div>
          </form>
         </DialogContent>
      </Dialog>

      {/* View Analytics Modal */}
      {invoice.publicShareId && viewIntelligence && (
        <Dialog open={isAnalyticsOpen} onOpenChange={setIsAnalyticsOpen}>
          <DialogContent className="max-w-2xl w-full bg-white dark:bg-slate-900 border dark:border-slate-850 p-6 rounded-xl overflow-hidden flex flex-col max-h-[85vh]">
            <DialogHeader className="text-left space-y-1">
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-50 flex items-center gap-1.5">
                <Eye className="w-4.5 h-4.5 text-emerald-600" />
                <span>Engagement Analytics for #{invoice.invoiceNumber}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-450">
                Detailed view event history and engagement timeline.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 my-4 overflow-y-auto pr-1 flex-1 text-left">
              {/* Mini Chart */}
              <div className="space-y-1.5">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Views over time (Last 30 Days)</h5>
                <div className="h-44 w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850/60 rounded-xl p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={getChartData()} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="viewsColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0f172a', 
                          border: 'none', 
                          borderRadius: '8px', 
                          fontSize: '10px',
                          color: '#fff'
                        }} 
                      />
                      <Area type="monotone" dataKey="Views" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#viewsColor)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Correlation Summary */}
              {invoice.status === 'PAID' && (
                <div className="p-3 bg-emerald-50/30 border border-emerald-100/50 dark:bg-emerald-950/10 dark:border-emerald-900/20 rounded-xl flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">Views before payment collected:</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-450 text-xs">
                    {viewIntelligence.viewsBeforePayment || 0} views
                  </span>
                </div>
              )}

              {/* Detailed events list */}
              <div className="space-y-2">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detailed Event Logs</h5>
                <div className="border border-slate-200/60 dark:border-slate-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full border-collapse text-left text-[11px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-250/20 text-slate-450 font-extrabold uppercase">
                        <th className="py-2.5 px-3">Date & Time</th>
                        <th className="py-2.5 px-3">Device</th>
                        <th className="py-2.5 px-3">Browser</th>
                        <th className="py-2.5 px-3">Location</th>
                        <th className="py-2.5 px-3">Referrer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-semibold text-slate-700 dark:text-slate-350">
                      {viewIntelligence.viewEvents && viewIntelligence.viewEvents.length > 0 ? (
                        viewIntelligence.viewEvents.map((event: any) => (
                          <tr key={event.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/10">
                            <td className="py-2 px-3 font-mono">{new Date(event.viewedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                            <td className="py-2 px-3 capitalize">{event.deviceType}</td>
                            <td className="py-2 px-3">{event.browser}</td>
                            <td className="py-2 px-3">{event.country === 'unknown' ? 'IN' : event.country}</td>
                            <td className="py-2 px-3 truncate max-w-[120px] font-normal" title={event.referrer}>{event.referrer === 'direct' ? 'Direct Link' : event.referrer}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-400 italic">No events recorded.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-850">
              <Button
                variant="outline"
                onClick={() => setIsAnalyticsOpen(false)}
                className="h-9 font-bold text-xs border-slate-200 dark:border-slate-800 cursor-pointer"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
