'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Check,
  FileText,
  Send,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  StickyNote,
  Archive,
  RefreshCw,
  AlertTriangle,
  FileDown,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/helpers';
import ClientForm from '@/components/clients/ClientForm';
import ConfirmDialog from '@/components/shared/ConfirmDialog';

interface ClientDetailData {
  client: any;
  financials: {
    totalBilled: number;
    totalOutstanding: number;
    invoiceCount: number;
    lastInvoiceDate: string | null;
    lastInvoiceNumber: string | null;
    lastInvoiceStatus: string | null;
    averageInvoiceValue: number;
  };
  activities: any[];
  notes: any[];
  invoices: any[];
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<ClientDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Modals & form state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fetchClientDetails = useCallback(async () => {
    try {
      setError(null);
      const activeBizId = typeof window !== 'undefined' ? localStorage.getItem('active_business_id')?.replace(/^"|"$/g, '') : null;
      const url = activeBizId ? `/api/clients/${id}?businessId=${activeBizId}` : `/api/clients/${id}`;
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Client not found or unauthorized');
        }
        throw new Error('Failed to load client details');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchClientDetails();
    }
  }, [id, fetchClientDetails]);

  // Copy to clipboard helper
  const handleCopy = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Add Note handler
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    setNoteSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteContent }),
      });

      if (!res.ok) {
        throw new Error('Failed to add note');
      }

      toast.success('Note added successfully');
      setNoteContent('');
      // Refresh details
      await fetchClientDetails();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add note');
    } finally {
      setNoteSubmitting(false);
    }
  };

  // Delete Note handler
  const handleDeleteNote = async (noteId: string) => {
    try {
      const res = await fetch(`/api/clients/${id}/notes?noteId=${noteId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete note');
      }

      toast.success('Note deleted');
      await fetchClientDetails();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete note');
    }
  };

  // Restore Client handler
  const handleRestoreClient = async () => {
    try {
      const res = await fetch(`/api/clients/${id}/restore`, {
        method: 'PUT',
      });

      if (!res.ok) {
        throw new Error('Failed to restore client');
      }

      toast.success('Client restored from archive');
      await fetchClientDetails();
    } catch (err: any) {
      toast.error(err.message || 'Failed to restore client');
    }
  };

  // Delete Client handler
  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to delete client');
      }

      const resData = await res.json();
      if (resData.isSoftDeleted) {
        toast.success('Client archived successfully');
        setIsDeleteOpen(false);
        await fetchClientDetails();
      } else {
        toast.success('Client deleted permanently');
        setIsDeleteOpen(false);
        router.push('/clients');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete client');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Edit form submit handler
  const handleEditSubmit = async (formData: any) => {
    try {
      const activeBizId = typeof window !== 'undefined' ? localStorage.getItem('active_business_id')?.replace(/^"|"$/g, '') : null;
      const res = await fetch('/api/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...formData, businessId: data?.client?.businessId || activeBizId }),
      });

      if (!res.ok) {
        throw new Error('Failed to update client details');
      }

      toast.success('Client updated successfully');
      setIsEditOpen(false);
      await fetchClientDetails();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update client');
    }
  };

  // Send Payment Reminder handler
  const handleSendReminder = async (invoiceId: string, invoiceNum: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: data?.client?.email,
          subject: `Overdue Payment Reminder: Invoice ${invoiceNum}`,
          message: `<p>Hello ${data?.client?.name},</p><p>This is a friendly reminder that invoice <strong>${invoiceNum}</strong> is overdue.</p><p>Please settle the payment as soon as possible.</p>`,
          isReminder: true,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to send reminder');
      }

      toast.success(`Reminder sent for invoice ${invoiceNum}`);
      await fetchClientDetails();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send payment reminder');
    }
  };

  // Quick Action: Create invoice redirect
  const handleCreateInvoiceRedirect = () => {
    router.push(`/invoices?clientId=${id}`);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-60 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          </div>
          <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">Error Loading Client</h3>
        <p className="text-xs text-slate-500 mb-6">{error || 'Could not fetch client details.'}</p>
        <Link href="/clients">
          <Button variant="outline" className="gap-2 text-xs font-semibold cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Clients</span>
          </Button>
        </Link>
      </div>
    );
  }

  const { client, financials, activities, notes, invoices } = data;
  const initials = client.name
    ? client.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'C';

  const paidAmount = financials.totalBilled;
  const outstandingAmount = financials.totalOutstanding;
  const totalFinancials = paidAmount + outstandingAmount;
  const paidPercent = totalFinancials > 0 ? (paidAmount / totalFinancials) * 100 : 0;
  const outstandingPercent = totalFinancials > 0 ? (outstandingAmount / totalFinancials) * 100 : 0;

  return (
    <div className="space-y-6">
      
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/clients">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-slate-500 dark:text-slate-450 hover:text-slate-900 dark:hover:text-slate-100 font-semibold cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Clients</span>
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          {client.isDeleted ? (
            <Button
              onClick={handleRestoreClient}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold h-9 px-4 gap-1.5 rounded-lg cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restore Client</span>
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(true)}
                className="gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 cursor-pointer h-9 px-3.5"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Edit Client</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteOpen(true)}
                className="gap-1.5 text-xs font-semibold border-red-200/50 hover:bg-red-50 dark:border-red-950/30 dark:hover:bg-red-950/15 text-red-650 dark:text-red-400 cursor-pointer h-9 px-3.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Client</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Archived Alert Banner */}
      {client.isDeleted && (
        <div className="flex items-start sm:items-center justify-between gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-left">
          <div className="flex gap-2.5 items-start">
            <Archive className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <h4 className="text-xs font-bold text-amber-850 dark:text-amber-400">Archived Client</h4>
              <p className="text-[11px] text-amber-700 dark:text-amber-500/80 leading-relaxed mt-0.5">
                This client has been soft-deleted because they have associated invoices. Restore them to edit or create new invoices.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleRestoreClient}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-8 text-xs shrink-0 cursor-pointer rounded-lg"
          >
            Restore Client
          </Button>
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN (Header, Financials, Invoices, Notes) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Header Contact Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row gap-6 items-start text-left">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-extrabold text-xl shadow-md flex-shrink-0 uppercase">
              {initials}
            </div>

            <div className="flex-1 space-y-4 w-full">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-50">{client.name}</h1>
                  {client.gstin && (
                    <Badge variant="outline" className="font-mono text-[9px] font-bold text-emerald-700 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30">
                      GST: {client.gstin}
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Client since {format(new Date(client.createdAt), 'dd MMM yyyy')}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-650 dark:text-slate-400">
                {/* Contact items */}
                <div className="space-y-2">
                  {client.email ? (
                    <div className="flex items-center justify-between group py-0.5 border-b border-dashed border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 overflow-hidden mr-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                      <button
                        onClick={() => handleCopy(client.email, 'email')}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {copiedField === 'email' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">No email address</p>
                  )}

                  {client.phone ? (
                    <div className="flex items-center justify-between group py-0.5 border-b border-dashed border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 mr-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>{client.phone}</span>
                      </div>
                      <button
                        onClick={() => handleCopy(client.phone, 'phone')}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {copiedField === 'phone' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">No phone number</p>
                  )}
                </div>

                {/* Addresses */}
                <div className="space-y-2 md:border-l md:pl-4 md:border-slate-100 md:dark:border-slate-800/40">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[10px] uppercase text-slate-400 block tracking-wider">Billing Address</span>
                      {client.billingAddress ? (
                        <p className="mt-0.5 leading-relaxed">
                          {client.billingAddress}, {client.billingCity}
                          {client.billingState ? `, ${client.billingState}` : ''}
                          {client.billingPincode ? ` - ${client.billingPincode}` : ''}
                        </p>
                      ) : (
                        <p className="text-slate-400 italic mt-0.5">Not set</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Intelligence Dashboard */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm text-left space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-650" />
                <span>Revenue Intelligence</span>
              </h3>
              <p className="text-[11px] text-slate-450 mt-0.5">Financial overview and billing timeline for this customer.</p>
            </div>

            {/* 2x2 grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-150/40 dark:border-slate-850/30 rounded-xl p-3.5">
                <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Paid Revenue</span>
                <div className="text-base font-extrabold text-emerald-650 dark:text-emerald-450 mt-1">
                  {formatCurrency(paidAmount, 'INR')}
                </div>
              </div>

              <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-150/40 dark:border-slate-850/30 rounded-xl p-3.5">
                <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Outstanding</span>
                <div className="text-base font-extrabold text-amber-600 dark:text-amber-450 mt-1">
                  {formatCurrency(outstandingAmount, 'INR')}
                </div>
              </div>

              <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-150/40 dark:border-slate-850/30 rounded-xl p-3.5">
                <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Invoice Count</span>
                <div className="text-base font-extrabold text-slate-800 dark:text-slate-200 mt-1">
                  {financials.invoiceCount}
                </div>
              </div>

              <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-150/40 dark:border-slate-850/30 rounded-xl p-3.5">
                <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Avg Invoice Val</span>
                <div className="text-base font-extrabold text-slate-800 dark:text-slate-200 mt-1">
                  {formatCurrency(financials.averageInvoiceValue, 'INR')}
                </div>
              </div>
            </div>

            {/* Visual Stacked Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span>Collections Progress</span>
                <span>{paidPercent.toFixed(0)}% Collected</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${paidPercent}%` }}
                  className="bg-emerald-500 h-full transition-all duration-300"
                  title={`Collected: ${formatCurrency(paidAmount, 'INR')}`}
                />
                <div
                  style={{ width: `${outstandingPercent}%` }}
                  className="bg-amber-500 h-full transition-all duration-300"
                  title={`Outstanding: ${formatCurrency(outstandingAmount, 'INR')}`}
                />
              </div>
              <div className="flex gap-4 pt-1 text-[10px] font-bold text-slate-450 uppercase">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Collected ({formatCurrency(paidAmount, 'INR')})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Outstanding ({formatCurrency(outstandingAmount, 'INR')})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice History Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm text-left space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-650" />
                  <span>Recent Invoices</span>
                </h3>
                <p className="text-[11px] text-slate-450 mt-0.5">Last 10 invoices generated for this account.</p>
              </div>
              {!client.isDeleted && (
                <Button onClick={handleCreateInvoiceRedirect} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 text-xs rounded-lg gap-1.5 cursor-pointer">
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Invoice</span>
                </Button>
              )}
            </div>

            {invoices.length > 0 ? (
              <div className="overflow-x-auto border border-slate-150/40 dark:border-slate-850/30 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-950/20 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider border-b border-slate-150/30 dark:border-slate-850/20">
                      <th className="p-3">Inv Number</th>
                      <th className="p-3">Issue Date</th>
                      <th className="p-3">Due Date</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150/30 dark:divide-slate-850/15">
                    {invoices.map((inv) => {
                      let statusColor = "text-slate-500 bg-slate-50 border-slate-150 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800/40";
                      if (inv.status === 'PAID') statusColor = "text-emerald-700 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/10 dark:text-emerald-400 dark:border-emerald-900/30";
                      if (inv.status === 'OVERDUE') statusColor = "text-red-700 bg-red-50 border-red-100 dark:bg-red-950/10 dark:text-red-400 dark:border-red-900/30";
                      if (inv.status === 'SENT') statusColor = "text-blue-700 bg-blue-50 border-blue-100 dark:bg-blue-950/10 dark:text-blue-400 dark:border-blue-900/30";
                      if (inv.status === 'PARTIAL') statusColor = "text-amber-700 bg-amber-50 border-amber-100 dark:bg-amber-950/10 dark:text-amber-400 dark:border-amber-900/30";

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-850/10">
                          <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {inv.invoiceNumber}
                          </td>
                          <td className="p-3 text-slate-500">
                            {format(new Date(inv.issueDate), 'dd MMM yyyy')}
                          </td>
                          <td className="p-3 text-slate-500">
                            {format(new Date(inv.dueDate), 'dd MMM yyyy')}
                          </td>
                          <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                            {formatCurrency(Number(inv.grandTotal), inv.currency)}
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColor}`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="p-3 flex items-center justify-center gap-2">
                            <Link href={`/invoices/${inv.id}`}>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 cursor-pointer" title="View Invoice">
                                <ExternalLink className="w-3.5 h-3.5 text-slate-450" />
                              </Button>
                            </Link>
                            {inv.status === 'OVERDUE' && client.email && (
                              <Button
                                onClick={() => handleSendReminder(inv.id, inv.invoiceNumber)}
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-amber-500 hover:text-amber-600 cursor-pointer"
                                title="Send Payment Reminder"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-150 dark:border-slate-850 rounded-xl bg-slate-50/20 dark:bg-slate-900/40 text-center">
                <FileText className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-xs text-slate-450 font-medium">No invoices created for this client yet.</p>
                {!client.isDeleted && (
                  <Button onClick={handleCreateInvoiceRedirect} variant="outline" size="sm" className="mt-3 text-xs font-semibold cursor-pointer border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-300">
                    <Plus className="w-3 h-3 mr-1" />
                    <span>Create First Invoice</span>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Ad-Hoc Notes CRM Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm text-left space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 flex items-center gap-1.5">
                <StickyNote className="w-4 h-4 text-emerald-650" />
                <span>Client Notes</span>
              </h3>
              <p className="text-[11px] text-slate-450 mt-0.5">Internal ad-hoc CRM memos and customer context.</p>
            </div>

            <form onSubmit={handleAddNote} className="space-y-3">
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Type details about client preferences, payment terms, or custom instructions..."
                rows={3}
                className="w-full text-xs p-3 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none placeholder-slate-400 text-slate-800 dark:text-slate-200 leading-relaxed"
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={noteSubmitting || !noteContent.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 text-xs px-4 rounded-lg cursor-pointer flex items-center gap-1"
                >
                  {noteSubmitting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Save Note</span>
                </Button>
              </div>
            </form>

            {notes.length > 0 ? (
              <div className="space-y-3 pt-2">
                {notes.map((note) => (
                  <div key={note.id} className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100/60 dark:border-slate-850/30 rounded-xl p-4 flex gap-3 items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-700 dark:text-slate-350 leading-relaxed whitespace-pre-wrap">
                        {note.content}
                      </p>
                      <span className="text-[9px] font-bold text-slate-400 block tracking-wider">
                        {format(new Date(note.createdAt), 'dd MMM yyyy, hh:mm a')}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-slate-400 hover:text-red-500 cursor-pointer p-0.5 rounded transition-colors"
                      title="Delete Note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 border border-dashed border-slate-150 dark:border-slate-850 rounded-xl bg-slate-50/10 dark:bg-slate-900/20 text-center">
                <p className="text-xs text-slate-400 italic">No notes added yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (Activity Timeline & Side-actions) */}
        <div className="space-y-6 text-left">
          
          {/* Quick Actions Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Quick CRM Actions</h3>
            <div className="flex flex-col gap-2.5">
              {!client.isDeleted && (
                <Button onClick={handleCreateInvoiceRedirect} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs gap-1.5 rounded-lg cursor-pointer">
                  <Plus className="w-4 h-4" />
                  <span>Create Invoice</span>
                </Button>
              )}
              {client.email && (
                <Link href={`mailto:${client.email}`} className="w-full">
                  <Button variant="outline" className="w-full text-slate-700 border-slate-200 dark:border-slate-800 dark:text-slate-300 font-semibold h-9 text-xs gap-1.5 rounded-lg cursor-pointer">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>Email Client</span>
                  </Button>
                </Link>
              )}
              {client.phone && (
                <Link href={`tel:${client.phone}`} className="w-full">
                  <Button variant="outline" className="w-full text-slate-700 border-slate-200 dark:border-slate-800 dark:text-slate-300 font-semibold h-9 text-xs gap-1.5 rounded-lg cursor-pointer">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>Call Client</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* CRM Audit Activity Timeline */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-650" />
                <span>Activity Timeline</span>
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Audit log of client interactions and payments.</p>
            </div>

            {activities.length > 0 ? (
              <div className="relative border-l-2 border-slate-100 dark:border-slate-850 pl-4 space-y-5 text-left">
                {activities.map((act) => {
                  let actIcon = <FileText className="w-3.5 h-3.5" />;
                  let iconBg = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";

                  if (act.action === 'INVOICE_CREATED') {
                    actIcon = <Plus className="w-3.5 h-3.5" />;
                    iconBg = "bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400";
                  } else if (act.action === 'PAYMENT_RECEIVED') {
                    actIcon = <DollarSign className="w-3.5 h-3.5" />;
                    iconBg = "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400";
                  } else if (act.action === 'REMINDER_SENT') {
                    actIcon = <Send className="w-3.5 h-3.5" />;
                    iconBg = "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-450";
                  } else if (act.action === 'NOTE_ADDED') {
                    actIcon = <StickyNote className="w-3.5 h-3.5" />;
                    iconBg = "bg-purple-50 text-purple-600 dark:bg-purple-950/20 dark:text-purple-400";
                  } else if (act.action === 'CLIENT_RESTORED') {
                    actIcon = <RefreshCw className="w-3.5 h-3.5" />;
                    iconBg = "bg-teal-50 text-teal-600 dark:bg-teal-950/20 dark:text-teal-400";
                  }

                  return (
                    <div key={act.id} className="relative space-y-1">
                      {/* Timeline dot */}
                      <span className={`absolute -left-[25px] top-0.5 rounded-full p-1 border border-white dark:border-slate-900 ${iconBg} shadow-sm`}>
                        {actIcon}
                      </span>
                      
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {act.action.replace('_', ' ')}
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed leading-normal">
                        {act.details}
                      </p>
                      {act.amount && (
                        <p className="text-[11px] font-extrabold text-emerald-650 dark:text-emerald-400">
                          {formatCurrency(Number(act.amount), 'INR')}
                        </p>
                      )}
                      <span className="text-[9px] font-bold text-slate-400 block pt-0.5">
                        {format(new Date(act.createdAt), 'dd MMM yyyy, hh:mm a')}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-slate-400 italic">No activity recorded yet.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Edit Client Modal */}
      <ClientForm
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        initialData={client}
        onSubmit={handleEditSubmit}
      />

      {/* Client Delete Confirm Modal */}
      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title={invoices.length > 0 ? "Archive Customer Profile?" : "Delete Customer Profile?"}
        description={
          invoices.length > 0
            ? `Are you sure you want to archive ${client.name}? Since this client has invoice history, they will be archived (soft-deleted). You can restore them anytime.`
            : `Are you sure you want to delete ${client.name}? This client has zero invoices, so they will be deleted permanently.`
        }
        confirmText={invoices.length > 0 ? "Archive Client" : "Delete Client"}
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        variant="danger"
        isLoading={deleteLoading}
      />

    </div>
  );
}
