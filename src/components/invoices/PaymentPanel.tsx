import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  Coins,
  Trash2,
  Edit2,
  Loader2,
  Calendar,
  Info,
  X,
  CreditCard,
  UserCheck
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/helpers';
import { toast } from 'sonner';

interface Payment {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  notes: string | null;
  status: string;
  paidAt: string;
  createdAt: string;
}

interface PaymentPanelProps {
  invoice: any;
  onPaymentChange: () => void;
  isRecordOpen?: boolean;
  onRecordOpenChange?: (open: boolean) => void;
}

export default function PaymentPanel({
  invoice,
  onPaymentChange,
  isRecordOpen: externalIsRecordOpen,
  onRecordOpenChange: externalOnRecordOpenChange
}: PaymentPanelProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Dialog state
  const [localIsRecordOpen, setLocalIsRecordOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  
  const isRecordOpen = externalIsRecordOpen !== undefined ? externalIsRecordOpen : localIsRecordOpen;
  const setIsRecordOpen = externalOnRecordOpenChange !== undefined ? externalOnRecordOpenChange : setLocalIsRecordOpen;
  
  // Form states
  const [paymentId, setPaymentId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('UPI');
  const [reference, setReference] = useState('');
  const [notesText, setNotesText] = useState('');
  const [paidAt, setPaidAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const outstanding = Math.max(0, invoice.grandTotal - invoice.amountPaid);
  const progressPercent = Math.min(100, Math.max(0, (invoice.amountPaid / invoice.grandTotal) * 100));
  const isOverdue = invoice.status === 'OVERDUE' || (invoice.status === 'SENT' && new Date(invoice.dueDate) < new Date());

  // Fetch payment history
  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/payments`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch payments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [invoice.id]);

  // Open Record Dialog
  const openRecordDialog = () => {
    setAmount(outstanding.toFixed(2));
    setMethod('UPI');
    setReference('');
    setNotesText('');
    setPaidAt(new Date().toISOString().split('T')[0]);
    setIsRecordOpen(true);
  };

  // Open Edit Dialog
  const openEditDialog = (pay: Payment) => {
    setPaymentId(pay.id);
    setAmount(Number(pay.amount).toFixed(2));
    setMethod(pay.method);
    setReference(pay.reference || '');
    setNotesText(pay.notes || '');
    setPaidAt(new Date(pay.paidAt).toISOString().split('T')[0]);
    setIsEditOpen(true);
  };

  // Submit New Payment
  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    if (parsedAmount > outstanding + 0.01) {
      toast.error(`Amount cannot exceed the balance due of ${formatCurrency(outstanding, invoice.currency)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parsedAmount,
          method,
          reference: reference.trim(),
          notes: notesText.trim(),
          paidAt: new Date(paidAt).toISOString()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record payment');

      toast.success(parsedAmount >= outstanding ? 'Invoice fully settled!' : 'Recorded payment installment.');
      setIsRecordOpen(false);
      onPaymentChange();
      fetchPayments();

      if (data.whatsappUrl) {
        window.open(data.whatsappUrl, '_blank');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edited Payment
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/payments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          amount: parsedAmount,
          method,
          reference: reference.trim(),
          notes: notesText.trim(),
          paidAt: new Date(paidAt).toISOString()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update payment');

      toast.success('Payment details updated.');
      setIsEditOpen(false);
      onPaymentChange();
      fetchPayments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Payment
  const handleDeletePayment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment record? This will revert the invoice balance.')) return;
    setIsDeletingId(id);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/payments?paymentId=${id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete payment');

      toast.success('Payment deleted successfully.');
      onPaymentChange();
      fetchPayments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete payment');
    } finally {
      setIsDeletingId(null);
    }
  };

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadReceipt = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/pdf?receipt=1`);
      if (!res.ok) throw new Error('Failed to generate receipt PDF');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Receipt_${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Receipt PDF downloaded successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to download receipt PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* ── CARD: Payment Progress & Actions ── */}
      <Card className="p-5 border border-slate-200/60 dark:border-slate-800/85 bg-white dark:bg-slate-900 rounded-xl shadow-xs text-left space-y-4">
        <h4 className="text-xs font-black text-slate-800 dark:text-slate-250 uppercase tracking-wider pb-1.5 border-b border-slate-100 dark:border-slate-850">
          Payment Status
        </h4>

        {invoice.status === 'PAID' ? (
          /* Celebration fully paid state */
          <div className="py-4 text-center space-y-3.5">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450 flex items-center justify-center mx-auto shadow-sm">
              <UserCheck className="w-6 h-6" />
            </div>
            <div className="space-y-0.5">
              <h5 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">Fully Paid!</h5>
              <p className="text-xs text-slate-450">
                {formatCurrency(invoice.grandTotal, invoice.currency)} received in full.
              </p>
            </div>
            <div className="flex gap-2 w-full">
              <Button
                onClick={handleDownloadReceipt}
                disabled={isDownloading}
                className="flex-1 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer h-9 shadow-xs"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  'Download Receipt'
                )}
              </Button>
              <Button
                onClick={handlePrintReceipt}
                variant="outline"
                className="flex-1 text-xs font-bold border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer h-9 shadow-xs"
              >
                Print Receipt
              </Button>
            </div>
          </div>
        ) : (
          /* Collected vs Outstanding progress state */
          <div className="space-y-4">
            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-500">Collected Progress</span>
                <span className="text-slate-850 dark:text-slate-100">{progressPercent.toFixed(0)}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isOverdue ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Collected numbers */}
            <div className="grid grid-cols-2 gap-4 pt-1.5 border-t border-slate-105 dark:border-slate-850/50 text-xs">
              <div>
                <p className="text-slate-450 font-bold uppercase tracking-wider text-[9px]">Paid</p>
                <p className="font-bold text-slate-700 dark:text-slate-350 mt-0.5">
                  {formatCurrency(invoice.amountPaid, invoice.currency)}
                </p>
              </div>
              <div>
                <p className="text-slate-450 font-bold uppercase tracking-wider text-[9px]">Balance Due</p>
                <p className="font-extrabold text-slate-950 dark:text-slate-105 mt-0.5 text-sm">
                  {formatCurrency(outstanding, invoice.currency)}
                </p>
              </div>
            </div>

            {/* Record button */}
            <Button
              onClick={openRecordDialog}
              disabled={invoice.status === 'CANCELLED' || invoice.status === 'DRAFT'}
              className="w-full h-9 font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer"
            >
              <Coins className="w-3.5 h-3.5 mr-2" />
              <span>Record Payment</span>
            </Button>
          </div>
        )}
      </Card>

      {/* ── CARD: Transaction History ── */}
      {payments.length > 0 && (
        <Card className="p-5 border border-slate-200/60 dark:border-slate-800/85 bg-white dark:bg-slate-900 rounded-xl shadow-xs text-left space-y-4">
          <h4 className="text-xs font-black text-slate-850 dark:text-slate-200 uppercase tracking-wider pb-1.5 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between">
            <span>Transaction History</span>
            <span className="text-[10px] font-bold text-slate-450 lowercase">({payments.length} splits)</span>
          </h4>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {payments.map((pay) => (
              <div
                key={pay.id}
                className="group p-3 border border-slate-100 dark:border-slate-850 bg-slate-50/40 dark:bg-slate-950/20 rounded-lg hover:border-slate-200 dark:hover:border-slate-800 transition-all text-xs space-y-2 relative"
              >
                {/* Header: Check icon, Amount, and Actions */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{formatCurrency(Number(pay.amount), invoice.currency)}</span>
                  </div>
                  
                  {/* Inline Actions (visible on hover) */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white dark:bg-slate-900 border dark:border-slate-800 p-0.5 rounded shadow-sm scale-90">
                    <button
                      type="button"
                      onClick={() => openEditDialog(pay)}
                      className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-500 rounded cursor-pointer"
                      title="Edit Payment"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePayment(pay.id)}
                      disabled={isDeletingId === pay.id}
                      className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-550 hover:text-red-500 rounded cursor-pointer disabled:opacity-30"
                      title="Delete Payment"
                    >
                      {isDeletingId === pay.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Details: Method & Reference, Date */}
                <div className="flex justify-between items-center text-[10px] text-slate-450 font-medium">
                  <div className="flex items-center gap-1">
                    <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono font-bold uppercase tracking-wider text-[8px] text-slate-500 dark:text-slate-400">
                      {pay.method}
                    </span>
                    {pay.reference && (
                      <span className="truncate max-w-[100px] font-mono text-[9px]">
                        #{pay.reference}
                      </span>
                    )}
                  </div>
                  <span className="font-mono">{formatDate(pay.paidAt)}</span>
                </div>

                {/* Notes */}
                {pay.notes && (
                  <p className="text-[10px] italic text-slate-500 dark:text-slate-450 bg-white dark:bg-slate-950 p-2 rounded border border-slate-100/50 dark:border-slate-850/50 mt-1">
                    &quot;{pay.notes}&quot;
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── DIALOG: RECORD NEW PAYMENT ── */}
      <Dialog open={isRecordOpen} onOpenChange={setIsRecordOpen}>
        <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-lg font-extrabold text-slate-905 dark:text-slate-50 tracking-tight flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-emerald-500" />
              <span>Record Payment Split</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-normal">
              Register a full or partial payment installment for invoice {invoice.invoiceNumber}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordSubmit} className="space-y-4 pt-2 text-left">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Amount Received (Balance: {formatCurrency(outstanding, invoice.currency)})
              </label>
              <Input
                type="number"
                required
                min="0.01"
                step="any"
                max={outstanding + 0.01}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-10 text-sm font-mono border-slate-300 dark:border-slate-800 dark:bg-slate-950"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Method
                </label>
                <Select value={method} onValueChange={(val) => setMethod(val || 'UPI')}>
                  <SelectTrigger className="h-10 text-xs font-semibold border-slate-350 dark:border-slate-800 bg-white dark:bg-slate-950">
                    <SelectValue placeholder="Select method..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border dark:border-slate-800">
                    {['UPI', 'NEFT', 'IMPS', 'RTGS', 'CASH', 'CHEQUE', 'CARD', 'OTHER'].map((m) => (
                      <SelectItem key={m} value={m} className="text-xs font-semibold cursor-pointer">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Payment Date
                </label>
                <Input
                  type="date"
                  required
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                  className="h-10 text-sm font-mono border-slate-300 dark:border-slate-800 dark:bg-slate-950"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Reference / UTR Number
              </label>
              <Input
                type="text"
                placeholder="UTR, Cheque No, Transaction ID (optional)"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="h-10 text-xs border-slate-300 dark:border-slate-800 dark:bg-slate-950"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Notes
              </label>
              <Textarea
                placeholder="e.g. 50% Advance deposit / Final milestone payment (optional)"
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                className="text-xs border-slate-300 dark:border-slate-800 dark:bg-slate-950"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRecordOpen(false)}
                className="h-9 font-bold text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-9 font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer"
              >
                {isSubmitting ? (
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

      {/* ── DIALOG: EDIT EXISTING PAYMENT ── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-lg font-extrabold text-slate-905 dark:text-slate-50 tracking-tight flex items-center gap-1.5">
              <Edit2 className="w-4 h-4 text-indigo-500" />
              <span>Edit Payment Entry</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-normal">
              Modify the transaction details for this payment split.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2 text-left">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Amount Received
              </label>
              <Input
                type="number"
                required
                min="0.01"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-10 text-sm font-mono border-slate-300 dark:border-slate-800 dark:bg-slate-950"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Method
                </label>
                <Select value={method} onValueChange={(val) => setMethod(val || 'UPI')}>
                  <SelectTrigger className="h-10 text-xs font-semibold border-slate-350 dark:border-slate-800 bg-white dark:bg-slate-950">
                    <SelectValue placeholder="Select method..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border dark:border-slate-800">
                    {['UPI', 'NEFT', 'IMPS', 'RTGS', 'CASH', 'CHEQUE', 'CARD', 'OTHER'].map((m) => (
                      <SelectItem key={m} value={m} className="text-xs font-semibold cursor-pointer">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Payment Date
                </label>
                <Input
                  type="date"
                  required
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                  className="h-10 text-sm font-mono border-slate-300 dark:border-slate-800 dark:bg-slate-955"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Reference / UTR Number
              </label>
              <Input
                type="text"
                placeholder="UTR, Cheque No, Transaction ID"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="h-10 text-xs border-slate-300 dark:border-slate-800 dark:bg-slate-950"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Notes
              </label>
              <Textarea
                placeholder="Details of the payment"
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                className="text-xs border-slate-300 dark:border-slate-800 dark:bg-slate-955"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                className="h-9 font-bold text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-9 font-bold text-xs bg-indigo-650 hover:bg-indigo-700 text-white cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Update Entry</span>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
