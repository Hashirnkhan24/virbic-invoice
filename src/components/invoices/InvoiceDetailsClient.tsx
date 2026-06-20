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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

interface InvoiceDetailsClientProps {
  invoice: any; // Serialized invoice object
}

export default function InvoiceDetailsClient({ invoice: initialInvoice }: InvoiceDetailsClientProps) {
  const router = useRouter();
  const [invoice, setInvoice] = useState(initialInvoice);

  // ── Modals & Actions Loading ──
  const [isPaidDialogOpen, setIsPaidDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);

  // ── Payment Form State ──
  const [amountPaidInput, setAmountPaidInput] = useState(
    String(invoice.grandTotal - invoice.amountPaid)
  );
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // ── Cancellation Form State ──
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // ── Reminder Dialog State ──
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [reminderSubject, setReminderSubject] = useState('');
  const [reminderMessage, setReminderMessage] = useState('');

  const outstanding = invoice.grandTotal - invoice.amountPaid;
  const isUnpaid = invoice.status === 'SENT' || invoice.status === 'PARTIAL' || invoice.status === 'OVERDUE';
  const progressPercent = Math.min(100, Math.max(0, (invoice.amountPaid / invoice.grandTotal) * 100));

  // ── 1. Mark as Paid API Call ──
  const handleMarkPaidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amountPaidInput);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const newAmountPaid = invoice.amountPaid + parsedAmount;
      const isFullyPaid = newAmountPaid >= invoice.grandTotal;
      const targetStatus = isFullyPaid ? 'PAID' : 'PARTIAL';

      const res = await fetch(`/api/invoices/${invoice.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetStatus,
          amountPaid: newAmountPaid,
          paidAt: new Date(paymentDate).toISOString(),
          paymentNotes: paymentNotes.trim() || `Recorded payment of ${formatCurrency(parsedAmount)}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      // Update local state
      setInvoice(data.invoice);
      toast.success(isFullyPaid ? 'Invoice fully marked as Paid!' : 'Recorded partial payment.');
      setIsPaidDialogOpen(false);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to record payment.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

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

  // ── 4. Send Reminder Preview & Submit ──
  const openReminderDialog = () => {
    const amountStr = formatCurrency(outstanding, invoice.currency);
    const today = new Date();
    const dueDateObj = new Date(invoice.dueDate);
    const daysOverdue = Math.floor((today.getTime() - dueDateObj.getTime()) / (1000 * 60 * 60 * 24));
    const shareLink = typeof window !== 'undefined'
      ? `${window.location.origin}/i/${invoice.publicShareId}`
      : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/i/${invoice.publicShareId}`;

    const replacements: { [key: string]: string } = {
      number: String(invoice.invoiceNumber),
      amount: amountStr,
      client_name: invoice.client.name || 'Client',
      due_date: formatDate(invoice.dueDate),
      days_overdue: String(daysOverdue > 0 ? daysOverdue : 0),
      share_link: shareLink,
      business_name: invoice.business.name,
    };

    const replaceTokens = (text: string) => {
      let res = text;
      for (const [k, v] of Object.entries(replacements)) {
        const regex = new RegExp(`\\{${k}\\}`, 'gi');
        res = res.replace(regex, v);
      }
      return res;
    };

    const subjectTemplate = invoice.user?.reminderSubjectTemplate || "Reminder: Invoice {number} for {amount} is overdue";
    const bodyTemplate = invoice.user?.reminderBodyTemplate || `Dear {client_name},

This is a polite reminder that invoice {number} is currently overdue.
An outstanding balance of {amount} remains unpaid.

Invoice Details:
- Number: {number}
- Due Date: {due_date}
- Days Overdue: {days_overdue} days

You can view the invoice details and complete your payment online using the direct link below:
{share_link}

If you have already processed the payment, please ignore this email.

Sincerely,
{business_name}`;

    setReminderSubject(replaceTokens(subjectTemplate));
    setReminderMessage(replaceTokens(bodyTemplate));
    setIsReminderDialogOpen(true);
  };

  const handleSendReminderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingReminder(true);
    try {
      const emailTo = invoice.client.email;
      if (!emailTo) {
        toast.error('Client does not have an email registered.');
        return;
      }

      const res = await fetch(`/api/invoices/${invoice.id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailTo,
          subject: reminderSubject.trim(),
          message: reminderMessage.trim(),
          isReminder: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reminder email');

      toast.success('Payment reminder email sent successfully!');
      if (data.invoice) {
        setInvoice(data.invoice);
      }
      setIsReminderDialogOpen(false);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to send reminder.');
    } finally {
      setIsSendingReminder(false);
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
        <DeliveryActions invoice={invoice} />
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
                <Button
                  onClick={openReminderDialog}
                  disabled={isSendingReminder}
                  className="w-full h-9 font-bold text-xs bg-slate-900 hover:bg-slate-850 text-white cursor-pointer"
                >
                  {isSendingReminder ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                  ) : (
                    <Mail className="w-3.5 h-3.5 mr-2 text-emerald-400" />
                  )}
                  <span>Send Payment Reminder</span>
                </Button>
              )}

              {/* Mark as paid (unpaid only) */}
              {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                <Button
                  onClick={() => {
                    setAmountPaidInput(String(outstanding));
                    setIsPaidDialogOpen(true);
                  }}
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

          {/* 2. Payment Status Card */}
          <Card className="p-5 border border-slate-200/60 dark:border-slate-800/85 bg-white dark:bg-slate-900 rounded-xl shadow-xs text-left space-y-4">
            <h4 className="text-xs font-black text-slate-800 dark:text-slate-250 uppercase tracking-wider pb-1.5 border-b border-slate-100 dark:border-slate-850">
              Payment Status
            </h4>

            <div className="space-y-3.5">
              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500">Collected</span>
                  <span className="text-slate-850 dark:text-slate-100">{progressPercent.toFixed(0)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Summary Numbers */}
              <div className="grid grid-cols-2 gap-4 pt-1.5 border-t border-slate-100 dark:border-slate-850/50 text-xs">
                <div>
                  <p className="text-slate-400">Amount Paid</p>
                  <p className="font-bold text-slate-700 dark:text-slate-350 mt-0.5">
                    {formatCurrency(invoice.amountPaid, invoice.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Outstanding</p>
                  <p className="font-bold text-slate-700 dark:text-slate-350 mt-0.5">
                    {formatCurrency(outstanding, invoice.currency)}
                  </p>
                </div>
              </div>

              {/* Payment History / Notes */}
              {invoice.amountPaid > 0 && (
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-150 dark:border-slate-850 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <p className="font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                    <History className="w-3.5 h-3.5 text-slate-400" />
                    <span>Transaction History</span>
                  </p>
                  <div className="border-t border-slate-200 dark:border-slate-800 pt-1.5 space-y-1">
                    <p className="font-medium text-slate-500">
                      Paid on {invoice.paidAt ? formatDate(invoice.paidAt) : formatDate(invoice.updatedAt)}
                    </p>
                    <p className="italic bg-white dark:bg-slate-900 p-1.5 rounded border border-slate-100 dark:border-slate-850/50 text-[10px]">
                      &quot;{invoice.paymentNotes || 'Direct entry payment'}&quot;
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

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

      {/* ── MARK AS PAID DIALOG ── */}
      <Dialog open={isPaidDialogOpen} onOpenChange={setIsPaidDialogOpen}>
        <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-slate-50 tracking-tight text-left">
              Record Payment
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 text-left">
              Enter payment details to update the invoice collected status.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleMarkPaidSubmit} className="space-y-4 pt-2 text-left">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wide">
                Amount Received (Outstanding: {formatCurrency(outstanding, invoice.currency)})
              </label>
              <Input
                type="number"
                required
                min="0.01"
                step="any"
                max={outstanding}
                value={amountPaidInput}
                onChange={(e) => setAmountPaidInput(e.target.value)}
                className="h-10 text-sm font-mono border-slate-300 dark:border-slate-800 dark:bg-slate-950 text-left"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wide">
                Payment Date
              </label>
              <Input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="h-10 text-sm font-mono border-slate-300 dark:border-slate-800 dark:bg-slate-950"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wide">
                Payment Notes
              </label>
              <Textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="e.g., Paid via UPI / Bank transfer reference"
                className="text-xs border-slate-300 dark:border-slate-800 dark:bg-slate-950"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPaidDialogOpen(false)}
                className="h-9 font-bold text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingPayment}
                className="h-9 font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer"
              >
                {isSubmittingPayment ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Record Payment</span>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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

      {/* ── MOCK REMINDER EMAIL PREVIEW DIALOG ── */}
      <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
        <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-slate-50 tracking-tight text-left">
              Send Payment Reminder
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 text-left">
              Preview and customize the email notification text before delivering to {invoice.client.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendReminderSubmit} className="space-y-4 pt-2 text-left">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wide">
                Email Recipient
              </label>
              <Input
                type="email"
                disabled
                value={invoice.client.email || 'No email registered'}
                className="h-9 text-xs border-slate-250 dark:border-slate-850 dark:bg-slate-950/50"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wide">
                Subject
              </label>
              <Input
                required
                value={reminderSubject}
                onChange={(e) => setReminderSubject(e.target.value)}
                className="h-9 text-xs border-slate-300 dark:border-slate-800 dark:bg-slate-950 font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wide">
                Message Body
              </label>
              <Textarea
                required
                rows={7}
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                className="text-xs border-slate-300 dark:border-slate-800 dark:bg-slate-950 leading-relaxed font-sans"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsReminderDialogOpen(false)}
                className="h-9 font-bold text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSendingReminder}
                className="h-9 font-bold text-xs bg-slate-900 hover:bg-slate-850 text-white cursor-pointer"
              >
                {isSendingReminder ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-3.5 h-3.5 mr-2" />
                    <span>Send Reminder</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
