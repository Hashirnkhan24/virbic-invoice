'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { 
  Search, 
  Lock, 
  Download, 
  Eye, 
  CreditCard, 
  AlertTriangle, 
  Loader2, 
  Building2, 
  Phone, 
  Mail, 
  FileText, 
  CheckCircle, 
  TrendingUp, 
  Clock, 
  Info,
  Globe,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import InvoicePreview from '@/components/invoice-templates/InvoicePreview';
import { formatCurrency } from '@/lib/helpers';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface BrandingConfig {
  title: string;
  brandColor: string;
  logoUrl: string | null;
  showPaidInvoices: boolean;
  allowPdfDownload: boolean;
  allowPayment: boolean;
  showPaymentHistory: boolean;
}

interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'PARTIAL';
  issueDate: string;
  dueDate: string;
  currency: string;
  grandTotal: number;
  amountPaid: number;
  publicShareId: string | null;
  razorpayPaymentLinkId: string | null;
  razorpayPaymentLinkUrl: string | null;
  razorpayPaymentLinkStatus: string | null;
}

interface PaymentHistoryItem {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  method: string;
  reference: string | null;
  paidAt: string;
  notes: string | null;
}

interface ClientPortalData {
  isPasswordProtected: boolean;
  branding: BrandingConfig;
  client?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  business?: {
    name: string;
    email: string | null;
    phone: string | null;
    logo: string | null;
    brandColor: string;
  };
  invoices?: InvoiceSummary[];
  payments?: PaymentHistoryItem[];
}

export default function ClientPortalPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  // State
  const [data, setData] = useState<ClientPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [passwordVerifying, setPasswordVerifying] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'outstanding' | 'paid'>('all');
  
  // Modal for Viewing Invoice
  const [viewingInvoiceId, setViewingInvoiceId] = useState<string | null>(null);
  const [fullInvoice, setFullInvoice] = useState<any | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [pdfDownloadingId, setPdfDownloadingId] = useState<string | null>(null);

  // Load portal data
  const loadPortalData = useCallback(async (pwdAttempt?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const pwd = pwdAttempt || sessionStorage.getItem(`portal_pwd_${slug}`) || '';
      const url = `/api/portal/${slug}${pwd ? `?password=${encodeURIComponent(pwd)}` : ''}`;
      
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Portal not found or disabled. Please contact the business owner.');
        }
        throw new Error('Failed to load client portal.');
      }
      
      const json: ClientPortalData = await res.json();
      
      if (json.isPasswordProtected && pwd) {
        // If password was wrong but saved in session
        sessionStorage.removeItem(`portal_pwd_${slug}`);
      }
      
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while loading.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (slug) {
      loadPortalData();
    }
  }, [slug, loadPortalData]);

  // Handle password unlock
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setPasswordVerifying(true);
    setPasswordError(null);

    try {
      const res = await fetch(`/api/portal/${slug}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const result = await res.json();

      if (res.status === 429) {
        setPasswordError(result.error || 'Too many attempts. Please try again later.');
        return;
      }

      if (!res.ok || !result.valid) {
        setPasswordError(result.error || 'Incorrect password. Access denied.');
        return;
      }

      // Save password and reload
      sessionStorage.setItem(`portal_pwd_${slug}`, password);
      await loadPortalData(password);
    } catch (err: any) {
      setPasswordError(err.message || 'Verification failed.');
    } finally {
      setPasswordVerifying(false);
    }
  };

  // Fetch full invoice detail for modal preview
  const handleViewInvoice = async (invoice: InvoiceSummary) => {
    if (!invoice.publicShareId) {
      toast.error('Unable to preview this invoice.');
      return;
    }
    
    setViewingInvoiceId(invoice.id);
    setLoadingInvoice(true);
    setFullInvoice(null);
    
    try {
      const pwd = sessionStorage.getItem(`portal_pwd_${slug}`) || '';
      const url = `/api/invoices/share/${invoice.publicShareId}${pwd ? `?password=${encodeURIComponent(pwd)}` : ''}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error('Failed to load invoice details.');
      }
      
      const json = await res.json();
      setFullInvoice(json.invoice);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to load invoice.');
      setViewingInvoiceId(null);
    } finally {
      setLoadingInvoice(false);
    }
  };

  // Download PDF
  const handleDownloadPdf = async (invoice: InvoiceSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!invoice.publicShareId) return;

    setPdfDownloadingId(invoice.id);
    try {
      const pwd = sessionStorage.getItem(`portal_pwd_${slug}`) || '';
      const params = new URLSearchParams();
      if (pwd) params.set('password', pwd);
      
      const queryString = params.toString();
      const url = `/api/invoices/share/${invoice.publicShareId}/pdf${queryString ? `?${queryString}` : ''}`;
      
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      const cleanNum = invoice.invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
      link.download = `Invoice_${cleanNum}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      
      toast.success('PDF downloaded successfully!');
    } catch (error: any) {
      console.error(error);
      toast.error('Could not download PDF. Please try again.');
    } finally {
      setPdfDownloadingId(null);
    }
  };

  // Pay Now Razorpay Link
  const handlePayNow = async (invoice: InvoiceSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (invoice.razorpayPaymentLinkUrl) {
      window.open(invoice.razorpayPaymentLinkUrl, '_blank');
      return;
    }
    
    // If no payment link exists, try generating one via the public-safe method or suggest contacting freelancer
    toast.loading('Redirecting to payment gateway...');
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/payment-link`, {
        method: 'POST',
      });
      
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to initialize payment');
      }
      
      const json = await res.json();
      if (json.short_url) {
        window.open(json.short_url, '_blank');
      } else {
        throw new Error('No payment gateway link returned');
      }
    } catch (err: any) {
      console.error(err);
      toast.dismiss();
      toast.error(err.message || 'Payment link generation failed. Please contact your invoicing manager.');
    } finally {
      toast.dismiss();
    }
  };

  // Render skeletons for loading state
  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-6 space-y-6">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Loading branded portal...</p>
      </div>
    );
  }

  // Render error page
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl">
          <AlertTriangle className="w-14 h-14 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-50 mb-2">Access Error</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">{error}</p>
          <button
            onClick={() => loadPortalData()}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 px-5 rounded-xl transition-all cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render Password Gate
  if (data?.isPasswordProtected) {
    const brandColor = data.branding.brandColor;
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6"
        >
          {data.branding.logoUrl ? (
            <img 
              src={data.branding.logoUrl} 
              alt="Brand Logo" 
              className="max-h-16 mx-auto object-contain rounded-lg"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-850 flex items-center justify-center mx-auto shadow-inner">
              <Globe className="w-7 h-7" style={{ color: brandColor }} />
            </div>
          )}

          <div className="space-y-1.5">
            <h2 className="text-lg font-black text-slate-900 dark:text-slate-50">
              {data.branding.title}
            </h2>
            <p className="text-xs text-slate-450 dark:text-slate-400">
              This portal is password protected. Enter the client portal password to unlock your invoices.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="relative">
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-sm h-11 px-4 pr-10 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:ring-2 focus:outline-none transition-all font-medium"
                style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
            </div>

            {passwordError && (
              <p className="text-[11px] font-bold text-red-500 text-left px-1">
                {passwordError}
              </p>
            )}

            <button
              type="submit"
              disabled={passwordVerifying || !password.trim()}
              className="w-full text-white font-bold h-11 rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              style={{ backgroundColor: brandColor }}
            >
              {passwordVerifying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Unlock Portal</span>
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // Fully authorized portal data
  const { branding, client, business, invoices = [], payments = [] } = data!;
  const brandColor = branding.brandColor;

  // Calculations for stats
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
  const outstanding = Math.max(0, totalInvoiced - totalPaid);

  // Filtered invoices
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Handle tab filtering
    if (activeTab === 'outstanding') {
      return matchesSearch && inv.status !== 'PAID';
    }
    if (activeTab === 'paid') {
      return matchesSearch && inv.status === 'PAID';
    }
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16 text-left">
      
      {/* ── Branded Header ── */}
      <header 
        className="sticky top-0 z-15 backdrop-blur-md border-b"
        style={{ 
          backgroundColor: `${brandColor}10`, // 10% opacity hex
          borderBottomColor: `${brandColor}40` // 25% opacity border
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {branding.logoUrl ? (
              <img 
                src={branding.logoUrl} 
                alt="Logo" 
                className="max-h-11 object-contain rounded-md"
              />
            ) : (
              <div 
                className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-xs"
              >
                <Building2 className="w-5 h-5" style={{ color: brandColor }} />
              </div>
            )}
            <div>
              <h1 className="text-base font-extrabold text-slate-900 dark:text-slate-100 leading-tight">
                {branding.title}
              </h1>
              <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest mt-0.5">
                Branded Client Space
              </p>
            </div>
          </div>
          
          <div className="text-right sm:text-right">
            <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">Welcome</span>
            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
              {client?.name}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 mt-8 space-y-8">
        
        {/* ── Stats Row ── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-850 flex items-center justify-center">
              <FileText className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Total Billed</span>
              <span className="text-lg font-black text-slate-800 dark:text-slate-100">
                {formatCurrency(totalInvoiced, invoices[0]?.currency || 'INR')}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Total Paid</span>
              <span className="text-lg font-black text-emerald-650 dark:text-emerald-450">
                {formatCurrency(totalPaid, invoices[0]?.currency || 'INR')}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
            <div 
              className={`w-11 h-11 rounded-xl flex items-center justify-center ${outstanding > 0 ? 'bg-amber-500/10' : 'bg-slate-100 dark:bg-slate-850'}`}
            >
              <CreditCard className={`w-5 h-5 ${outstanding > 0 ? 'text-amber-500' : 'text-slate-500'}`} />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Outstanding</span>
              <span className={`text-lg font-black ${outstanding > 0 ? 'text-amber-600 dark:text-amber-450' : 'text-slate-800 dark:text-slate-100'}`}>
                {formatCurrency(outstanding, invoices[0]?.currency || 'INR')}
              </span>
            </div>
          </div>
        </section>

        {/* ── Invoices List ── */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                Your Invoices
              </h3>
              <p className="text-xs text-slate-450 mt-0.5">
                View, download, and pay your billing statements.
              </p>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search invoice number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-xs h-9 px-3.5 pl-9 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-300 w-48 text-slate-800 dark:text-slate-100"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              </div>

              <div className="flex items-center bg-slate-50 dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-850 rounded-lg">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`text-[11px] font-bold h-7 px-3 rounded-md transition-all cursor-pointer ${activeTab === 'all' ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xs' : 'text-slate-500'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveTab('outstanding')}
                  className={`text-[11px] font-bold h-7 px-3 rounded-md transition-all cursor-pointer ${activeTab === 'outstanding' ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xs' : 'text-slate-500'}`}
                >
                  Outstanding
                </button>
                {branding.showPaidInvoices && (
                  <button
                    onClick={() => setActiveTab('paid')}
                    className={`text-[11px] font-bold h-7 px-3 rounded-md transition-all cursor-pointer ${activeTab === 'paid' ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xs' : 'text-slate-500'}`}
                  >
                    Paid
                  </button>
                )}
              </div>
            </div>
          </div>

          {filteredInvoices.length > 0 ? (
            <div className="overflow-x-auto border border-slate-150/40 dark:border-slate-850/30 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-950/20 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider border-b border-slate-150/30 dark:border-slate-850/20">
                    <th className="p-4">Invoice #</th>
                    <th className="p-4">Issue Date</th>
                    <th className="p-4">Due Date</th>
                    <th className="p-4">Total Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150/30 dark:divide-slate-850/15">
                  {filteredInvoices.map((inv) => {
                    let statusColor = "text-slate-500 bg-slate-50 border-slate-150 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800/40";
                    if (inv.status === 'PAID') statusColor = "text-emerald-700 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/10 dark:text-emerald-400 dark:border-emerald-900/30";
                    if (inv.status === 'OVERDUE') statusColor = "text-red-700 bg-red-50 border-red-100 dark:bg-red-950/10 dark:text-red-400 dark:border-red-900/30";
                    if (inv.status === 'SENT') statusColor = "text-blue-700 bg-blue-50 border-blue-100 dark:bg-blue-950/10 dark:text-blue-400 dark:border-blue-900/30";
                    if (inv.status === 'PARTIAL') statusColor = "text-amber-700 bg-amber-50 border-amber-100 dark:bg-amber-950/10 dark:text-amber-400 dark:border-amber-900/30";

                    return (
                      <tr 
                        key={inv.id} 
                        onClick={() => handleViewInvoice(inv)}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-850/10 cursor-pointer transition-colors"
                      >
                        <td className="p-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {inv.invoiceNumber}
                        </td>
                        <td className="p-4 text-slate-500">
                          {format(new Date(inv.issueDate), 'dd MMM yyyy')}
                        </td>
                        <td className="p-4 text-slate-500">
                          {format(new Date(inv.dueDate), 'dd MMM yyyy')}
                        </td>
                        <td className="p-4 font-bold text-slate-850 dark:text-slate-100">
                          {formatCurrency(inv.grandTotal, inv.currency)}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColor}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="p-4 flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleViewInvoice(inv)}
                            className="h-8 px-2.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-550 dark:text-slate-400 font-bold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">View</span>
                          </button>
                          
                          {branding.allowPdfDownload && (
                            <button
                              onClick={(e) => handleDownloadPdf(inv, e)}
                              disabled={pdfDownloadingId === inv.id}
                              className="h-8 px-2.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-550 dark:text-slate-400 font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              {pdfDownloadingId === inv.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                              <span className="hidden sm:inline">PDF</span>
                            </button>
                          )}

                          {branding.allowPayment && inv.status !== 'PAID' && (
                            <button
                              onClick={(e) => handlePayNow(inv, e)}
                              className="h-8 px-3 rounded-md text-white font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                              style={{ backgroundColor: brandColor }}
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Pay</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/20 dark:bg-slate-900/40 text-center">
              <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-xs text-slate-450 font-medium">No invoices found matching the filters.</p>
            </div>
          )}
        </section>

        {/* ── Payment History ── */}
        {branding.showPaymentHistory && (
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Clock className="w-4 h-4" style={{ color: brandColor }} />
                <span>Payment History</span>
              </h3>
              <p className="text-xs text-slate-450 mt-0.5">
                A ledger of payments settled for your invoices.
              </p>
            </div>

            {payments.length > 0 ? (
              <div className="space-y-4">
                <div className="overflow-x-auto border border-slate-150/40 dark:border-slate-850/30 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-950/20 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider border-b border-slate-150/30 dark:border-slate-850/20">
                        <th className="p-4">Paid Date</th>
                        <th className="p-4">Invoice #</th>
                        <th className="p-4">Amount Paid</th>
                        <th className="p-4">Method</th>
                        <th className="p-4">Reference ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150/30 dark:divide-slate-850/15">
                      {payments.map((pay) => (
                        <tr key={pay.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-850/10">
                          <td className="p-4 text-slate-500">
                            {format(new Date(pay.paidAt), 'dd MMM yyyy, hh:mm a')}
                          </td>
                          <td className="p-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {pay.invoiceNumber}
                          </td>
                          <td className="p-4 font-black text-emerald-650 dark:text-emerald-450">
                            {formatCurrency(pay.amount, invoices[0]?.currency || 'INR')}
                          </td>
                          <td className="p-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {pay.method}
                            </span>
                          </td>
                          <td className="p-4 font-mono text-slate-450 truncate max-w-[150px]" title={pay.reference || undefined}>
                            {pay.reference || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  You've made {payments.length} payment{payments.length > 1 ? 's' : ''} totaling {formatCurrency(totalPaid, invoices[0]?.currency || 'INR')}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-150 dark:border-slate-850 rounded-xl bg-slate-50/10 dark:bg-slate-900/20 text-center">
                <p className="text-xs text-slate-400 italic">No payments recorded yet.</p>
              </div>
            )}
          </section>
        )}

      </main>

      {/* ── Branded Footer ── */}
      <footer className="max-w-6xl mx-auto px-6 mt-16 text-center space-y-4 border-t border-slate-200 dark:border-slate-900 pt-8">
        <p className="text-[11px] text-slate-450 leading-relaxed">
          Questions or disputes? Contact <strong className="text-slate-700 dark:text-slate-350">{business?.name}</strong> 
          {business?.email ? (
            <> at <a href={`mailto:${business.email}`} className="underline font-bold" style={{ color: brandColor }}>{business.email}</a></>
          ) : ''}
          {business?.phone ? ` or call ${business.phone}` : ''}.
        </p>
        <p className="text-[10px] font-bold text-slate-400">
          Powered by <a href="https://billcraft.in" className="hover:underline transition-colors">BillCraft</a>
        </p>
      </footer>

      {/* ── Invoice Detail Modal ── */}
      <AnimatePresence>
        {viewingInvoiceId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-center items-start overflow-y-auto p-4 md:p-6"
            onClick={() => setViewingInvoiceId(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden mt-8 mb-8 text-left flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              
              {/* Modal Toolbar */}
              <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/80 px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Invoice Viewer
                  </h4>
                  {fullInvoice && (
                    <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                      Invoice {fullInvoice.invoiceNumber}
                    </h3>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {fullInvoice && branding.allowPdfDownload && (
                    <button
                      onClick={(e) => {
                        const invSummary = invoices.find(i => i.id === fullInvoice.id);
                        if (invSummary) handleDownloadPdf(invSummary, e);
                      }}
                      className="h-9 px-4 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition-all text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download PDF</span>
                    </button>
                  )}

                  {fullInvoice && branding.allowPayment && fullInvoice.status !== 'PAID' && (
                    <button
                      onClick={(e) => {
                        const invSummary = invoices.find(i => i.id === fullInvoice.id);
                        if (invSummary) handlePayNow(invSummary, e);
                      }}
                      className="h-9 px-4 rounded-xl text-white font-bold transition-all text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                      style={{ backgroundColor: brandColor }}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Pay Invoice</span>
                    </button>
                  )}

                  <button
                    onClick={() => setViewingInvoiceId(null)}
                    className="h-9 w-9 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-450 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl transition-all font-bold text-xs flex items-center justify-center cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-4 md:p-6 bg-slate-50 dark:bg-slate-950 flex-1 overflow-y-auto">
                {loadingInvoice ? (
                  <div className="h-96 flex flex-col justify-center items-center gap-3">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                    <p className="text-xs font-semibold text-slate-450">Loading template preview...</p>
                  </div>
                ) : fullInvoice ? (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg overflow-hidden max-w-3xl mx-auto">
                    <InvoicePreview
                      invoice={{
                        ...fullInvoice,
                        subTotal: Number(fullInvoice.subTotal),
                        discountTotal: Number(fullInvoice.discountTotal),
                        taxableAmount: Number(fullInvoice.taxableAmount),
                        cgstTotal: Number(fullInvoice.cgstTotal),
                        sgstTotal: Number(fullInvoice.sgstTotal),
                        igstTotal: Number(fullInvoice.igstTotal),
                        cessTotal: Number(fullInvoice.cessTotal),
                        roundOff: Number(fullInvoice.roundOff),
                        grandTotal: Number(fullInvoice.grandTotal),
                        amountPaid: Number(fullInvoice.amountPaid),
                      }}
                      totals={{
                        subTotal: Number(fullInvoice.subTotal),
                        discountTotal: Number(fullInvoice.discountTotal),
                        taxableAmount: Number(fullInvoice.taxableAmount),
                        cgstTotal: Number(fullInvoice.cgstTotal),
                        sgstTotal: Number(fullInvoice.sgstTotal),
                        igstTotal: Number(fullInvoice.igstTotal),
                        cessTotal: Number(fullInvoice.cessTotal),
                        roundOff: Number(fullInvoice.roundOff),
                        grandTotal: Number(fullInvoice.grandTotal),
                      }}
                      business={fullInvoice.business}
                      client={fullInvoice.client}
                      template={fullInvoice.template}
                    />
                  </div>
                ) : (
                  <div className="h-96 flex flex-col justify-center items-center text-center gap-3 text-red-500">
                    <AlertTriangle className="w-8 h-8" />
                    <p className="text-xs font-bold">Failed to render preview. Try downloading PDF.</p>
                  </div>
                )}
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
