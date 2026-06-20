'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Palette,
  FileText,
  Sliders,
  Bell,
  CreditCard,
  Database,
  Plus,
  Check,
  Edit2,
  Trash2,
  Upload,
  AlertTriangle,
  Download,
  UploadCloud,
  Loader2,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

import BusinessForm from '@/components/business/BusinessForm';
import InvoicePreview from '@/components/invoice-templates/InvoicePreview';
import { TEMPLATE_META } from '@/components/invoice-templates/TemplateRenderer';
import { INDIAN_STATES } from '@/lib/constants';

interface SettingsClientProps {
  user: any;
  subscription: any;
  businesses: any[];
}

const TABS = [
  { id: 'business', label: 'Business Profile', icon: Building2 },
  { id: 'branding', label: 'Branding & Templates', icon: Palette },
  { id: 'defaults', label: 'Invoice Defaults', icon: Sliders },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'billing', label: 'Billing & Plan', icon: CreditCard },
  { id: 'data', label: 'Data & Export', icon: Database },
];

const PREDEFINED_COLORS = [
  { name: 'Emerald', value: '#10b981' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Slate', value: '#64748b' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Pink', value: '#ec4899' },
];

export default function SettingsClient({
  user: initialUser,
  subscription: initialSubscription,
  businesses: initialBusinesses,
}: SettingsClientProps) {
  const router = useRouter();

  // ── Tab State ──
  const [activeTab, setActiveTab] = useState('business');

  // ── Core Data States ──
  const [businesses, setBusinesses] = useState<any[]>(initialBusinesses);
  const [user, setUser] = useState<any>(initialUser);
  const [subscription, setSubscription] = useState<any>(initialSubscription);

  const activeBusiness = businesses.find((b) => b.isDefault) || businesses[0] || null;

  // ── Modals & Dialogs ──
  const [isAddBizOpen, setIsAddBizOpen] = useState(false);
  const [editingBiz, setEditingBiz] = useState<any | null>(null);
  const [deletingBizId, setDeletingBizId] = useState<string | null>(null);
  const [isDeletingBizLoading, setIsDeletingBizLoading] = useState(false);

  const [isCancelSubscriptionOpen, setIsCancelSubscriptionOpen] = useState(false);
  const [isCancellingSubscription, setIsCancellingSubscription] = useState(false);

  const [dangerConfirmText, setDangerConfirmText] = useState('');
  const [dangerAction, setDangerAction] = useState<'purge' | 'deleteAccount' | null>(null);
  const [isDangerLoading, setIsDangerLoading] = useState(false);

  // ── Branding Tab Local States ──
  const [selectedTemplate, setSelectedTemplate] = useState(activeBusiness?.defaultTemplate || 'modern');
  const [brandColor, setBrandColor] = useState(activeBusiness?.brandColor || '#10b981');
  const [logoBase64, setLogoBase64] = useState<string | null>(activeBusiness?.logo || null);
  const [sigBase64, setSigBase64] = useState<string | null>(activeBusiness?.signature || null);
  const [terms, setTerms] = useState(activeBusiness?.defaultTerms || '');
  const [notes, setNotes] = useState(activeBusiness?.defaultNotes || '');
  const [isBrandingSaving, setIsBrandingSaving] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);

  // ── Defaults Tab Local States ──
  const [dueDays, setDueDays] = useState(activeBusiness?.defaultDueDateDays ?? 30);
  const [gstRate, setGstRate] = useState(Number(activeBusiness?.defaultGstRate || 18));
  const [placeOfSupply, setPlaceOfSupply] = useState(activeBusiness?.defaultPlaceOfSupply || '');
  const [prefix, setPrefix] = useState(activeBusiness?.invoicePrefix || 'INV');
  const [nextNumber, setNextNumber] = useState(activeBusiness?.invoiceNumber ?? 1);
  const [currency, setCurrency] = useState(activeBusiness?.currency || 'INR');
  const [isDefaultsSaving, setIsDefaultsSaving] = useState(false);

  // ── Notifications Tab Local States ──
  const [notifs, setNotifs] = useState({
    emailInvoiceSent: user?.emailInvoiceSent ?? true,
    emailPaymentReceived: user?.emailPaymentReceived ?? true,
    emailInvoiceOverdue: user?.emailInvoiceOverdue ?? true,
    emailWeeklySummary: user?.emailWeeklySummary ?? true,
    reminderOverdueEnabled: user?.reminderOverdueEnabled ?? true,
    reminderFrequencyDays: user?.reminderFrequencyDays ?? 3,
    reminderMaxCount: user?.reminderMaxCount ?? 3,
    reminderSubjectTemplate: user?.reminderSubjectTemplate || 'Reminder: Invoice {number} for {amount} is overdue',
    reminderBodyTemplate: user?.reminderBodyTemplate || '',
  });
  const [isNotifsSaving, setIsNotifsSaving] = useState(false);

  // ── Import Local States ──
  const [clientsImportFile, setClientsImportFile] = useState<File | null>(null);
  const [itemsImportFile, setItemsImportFile] = useState<File | null>(null);
  const [isClientsImporting, setIsClientsImporting] = useState(false);
  const [isItemsImporting, setIsItemsImporting] = useState(false);

  // Stable dates for mockInvoice to prevent impure Date calls during rendering
  const [mockInvoiceDates, setMockInvoiceDates] = useState({
    invoiceNumber: '',
    issueDate: '',
    dueDate: '',
  });

  useEffect(() => {
    const now = new Date();
    const invoiceNumber = `${prefix}/${now.getFullYear()}/${String(nextNumber).padStart(3, '0')}`;
    const issueDate = now.toISOString();
    const dueDate = new Date(now.getTime() + (dueDays || 30) * 24 * 60 * 60 * 1000).toISOString();
    setMockInvoiceDates({ invoiceNumber, issueDate, dueDate });
  }, [prefix, nextNumber, dueDays]);

  // Formatted billing date string to prevent impure Date calls during rendering
  const [nextBillingCycleStr, setNextBillingCycleStr] = useState('');

  useEffect(() => {
    if (subscription?.currentPeriodEnd) {
      setNextBillingCycleStr(new Date(subscription.currentPeriodEnd).toLocaleDateString());
    } else {
      setNextBillingCycleStr(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toLocaleDateString());
    }
  }, [subscription?.currentPeriodEnd]);

  // ── Mock Invoice data for template preview ──
  const mockInvoice = {
    invoiceNumber: mockInvoiceDates.invoiceNumber || `${prefix}/2026/${String(nextNumber).padStart(3, '0')}`,
    issueDate: mockInvoiceDates.issueDate || '2026-06-20T12:00:00.000Z',
    dueDate: mockInvoiceDates.dueDate || '2026-07-20T12:00:00.000Z',
    currency: currency,
    placeOfSupply: placeOfSupply || '27',
    reverseCharge: false,
    isInterState: placeOfSupply !== '27',
    subTotal: 10000,
    discountTotal: 1000,
    taxableAmount: 9000,
    cgstTotal: placeOfSupply === '27' ? 810 : 0,
    sgstTotal: placeOfSupply === '27' ? 810 : 0,
    igstTotal: placeOfSupply !== '27' ? 1620 : 0,
    cessTotal: 0,
    roundOff: 0,
    grandTotal: 10620,
    notes: notes || 'Thank you for choosing Virbic!',
    terms: terms || 'Please settle this payment within the due date.',
    business: {
      name: activeBusiness?.name || 'Your Business Acme Ltd',
      gstin: activeBusiness?.gstin || '27AAAAA1111A1Z1',
      address: activeBusiness?.address || '404 Innovation Hub',
      city: activeBusiness?.city || 'Mumbai',
      state: activeBusiness?.state || 'Maharashtra',
      pincode: activeBusiness?.pincode || '400051',
      logo: logoBase64 || undefined,
      signature: sigBase64 || undefined,
      brandColor: brandColor,
    },
    client: {
      name: 'Acme Corporation',
      gstin: '27BBBBB2222B2Z2',
      email: 'finance@acme.com',
      phone: '9988776655',
      billingAddress: '789 Enterprise Lane',
      billingCity: 'Pune',
      billingState: '27',
      billingPincode: '411001',
    },
    lineItems: [
      {
        description: 'Software Integration & Consultations',
        hsnCode: '9983',
        quantity: 1,
        unit: 'HRS',
        rate: 10000,
        discount: 10,
        discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'AMOUNT',
        gstRate: gstRate || 18,
      },
    ],
  };

  const mockTotals = {
    subTotal: mockInvoice.subTotal,
    discountTotal: mockInvoice.discountTotal,
    taxableAmount: mockInvoice.taxableAmount,
    cgstTotal: mockInvoice.cgstTotal,
    sgstTotal: mockInvoice.sgstTotal,
    igstTotal: mockInvoice.igstTotal,
    cessTotal: mockInvoice.cessTotal,
    roundOff: mockInvoice.roundOff,
    grandTotal: mockInvoice.grandTotal,
  };

  // ── 1. BUSINESS PROFILE ACTIONS ──
  const handleAddBusiness = async (data: any) => {
    try {
      const res = await fetch('/api/business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to create business');

      toast.success('New business profile created!');
      setBusinesses((prev) => [...prev, body.business]);
      setIsAddBizOpen(false);
      window.dispatchEvent(new CustomEvent('business-changed'));
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to add business.');
    }
  };

  const handleEditBusinessSubmit = async (data: any) => {
    if (!editingBiz) return;
    try {
      const res = await fetch('/api/settings/business', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingBiz.id, ...data }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to update business');

      toast.success('Business profile updated successfully!');
      setBusinesses((prev) => prev.map((b) => (b.id === editingBiz.id ? body.business : b)));
      setEditingBiz(null);
      window.dispatchEvent(new CustomEvent('business-changed'));
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to edit business.');
    }
  };

  const handleSetDefaultBusiness = async (id: string) => {
    const previousState = [...businesses];
    // Optimistic UI
    setBusinesses((prev) =>
      prev.map((b) => ({ ...b, isDefault: b.id === id }))
    );

    try {
      const res = await fetch('/api/settings/business', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'setDefault' }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to set default business');

      toast.success('Default business updated.');
      // Update local states values with the new default business defaults
      setSelectedTemplate(body.business.defaultTemplate);
      setBrandColor(body.business.brandColor);
      setLogoBase64(body.business.logo);
      setSigBase64(body.business.signature);
      setTerms(body.business.defaultTerms || '');
      setNotes(body.business.defaultNotes || '');
      setDueDays(body.business.defaultDueDateDays);
      setGstRate(Number(body.business.defaultGstRate || 18));
      setPlaceOfSupply(body.business.defaultPlaceOfSupply || '');
      setPrefix(body.business.invoicePrefix);
      setNextNumber(body.business.invoiceNumber);
      setCurrency(body.business.currency);

      window.dispatchEvent(new CustomEvent('business-changed'));
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to update default business.');
      setBusinesses(previousState); // Rollback
    }
  };

  const handleDeleteBusiness = async () => {
    if (!deletingBizId) return;
    setIsDeletingBizLoading(true);
    try {
      const res = await fetch(`/api/settings/business?id=${deletingBizId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to delete business');
      }

      toast.success('Business profile deleted.');
      setBusinesses((prev) => prev.filter((b) => b.id !== deletingBizId));
      setDeletingBizId(null);
      window.dispatchEvent(new CustomEvent('business-changed'));
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to delete profile.');
    } finally {
      setIsDeletingBizLoading(false);
    }
  };

  // ── 2. BRANDING PROFILE ACTIONS ──
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'sig') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Str = reader.result as string;
      if (type === 'logo') setLogoBase64(base64Str);
      else setSigBase64(base64Str);
      toast.success(`${type === 'logo' ? 'Logo' : 'Signature'} loaded! Click Save Branding to commit.`);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBranding = async () => {
    if (!activeBusiness) return;
    setIsBrandingSaving(true);

    try {
      const res = await fetch('/api/settings/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: activeBusiness.id,
          defaultTemplate: selectedTemplate,
          brandColor,
          logo: logoBase64,
          signature: sigBase64,
          defaultTerms: terms,
          defaultNotes: notes,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to save branding');

      // Update in local lists
      setBusinesses((prev) =>
        prev.map((b) => (b.id === activeBusiness.id ? body.business : b))
      );
      toast.success('Branding & template configurations saved!');
      window.dispatchEvent(new CustomEvent('business-changed'));
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to update branding settings.');
    } finally {
      setIsBrandingSaving(false);
    }
  };

  // ── 3. INVOICE DEFAULTS ACTIONS ──
  const handleSaveDefaults = async () => {
    if (!activeBusiness) return;
    setIsDefaultsSaving(true);

    try {
      const res = await fetch('/api/settings/defaults', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: activeBusiness.id,
          defaultDueDateDays: Number(dueDays),
          defaultGstRate: Number(gstRate),
          defaultPlaceOfSupply: placeOfSupply || null,
          invoicePrefix: prefix,
          invoiceNumber: Number(nextNumber),
          currency,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to save invoice defaults');

      setBusinesses((prev) =>
        prev.map((b) => (b.id === activeBusiness.id ? body.business : b))
      );
      toast.success('Invoicing defaults saved!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to update defaults.');
    } finally {
      setIsDefaultsSaving(false);
    }
  };

  // ── 4. NOTIFICATION SETTINGS ACTIONS ──
  const handleSaveNotifications = async () => {
    setIsNotifsSaving(true);
    try {
      const res = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifs),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to save notifications');

      setUser(body.user);
      toast.success('Notification settings saved!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to update notification prefs.');
    } finally {
      setIsNotifsSaving(false);
    }
  };

  // ── 5. BILLING & PLAN ACTIONS ──
  const handleCancelSubscription = async () => {
    setIsCancellingSubscription(true);
    try {
      // Mock plan cancel endpoint
      toast.success('Subscription cancelled successfully. You will stay on Free tier.');
      setSubscription((prev: any) => ({
        ...prev,
        plan: 'FREE',
        invoicesLimit: 5,
        status: 'CANCELLED',
      }));
      setIsCancelSubscriptionOpen(false);
    } catch (err) {
      toast.error('Failed to cancel subscription');
    } finally {
      setIsCancellingSubscription(false);
    }
  };

  // ── 6. DATA PORTABILITY & DANGER ZONE ACTIONS ──
  const handleImportClients = async () => {
    if (!clientsImportFile) return;
    setIsClientsImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', clientsImportFile);
      fd.append('importType', 'clients');

      const res = await fetch('/api/settings/export', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');

      toast.success(`Successfully imported ${data.imported} clients!`);
      setClientsImportFile(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to import clients.');
    } finally {
      setIsClientsImporting(false);
    }
  };

  const handleImportItems = async () => {
    if (!itemsImportFile) return;
    setIsItemsImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', itemsImportFile);
      fd.append('importType', 'items');

      const res = await fetch('/api/settings/export', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');

      toast.success(`Successfully imported ${data.imported} items to catalog!`);
      setItemsImportFile(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to import items.');
    } finally {
      setIsItemsImporting(false);
    }
  };

  const handleDangerAction = async () => {
    if (dangerConfirmText !== 'DELETE') {
      toast.error('Please type "DELETE" exactly to confirm.');
      return;
    }

    setIsDangerLoading(true);
    try {
      const res = await fetch(`/api/settings/export?action=${dangerAction === 'purge' ? 'deleteAllData' : 'deleteAccount'}`, {
        method: 'DELETE',
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Operation failed');

      toast.success(body.message);
      setDangerAction(null);
      setDangerConfirmText('');

      if (dangerAction === 'deleteAccount') {
        router.push('/');
      } else {
        router.refresh();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Data action failed.');
    } finally {
      setIsDangerLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 p-4 text-left space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
          Settings
        </h1>
        <p className="text-xs text-slate-500">
          Manage your account profile, business series, templates, and subscription settings.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Settings Sidebar Tabs */}
        <div className="lg:col-span-1 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 border-b lg:border-b-0 lg:border-r border-slate-200/60 dark:border-slate-800/85 pr-0 lg:pr-4 shrink-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all text-left whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 font-extrabold border-l-2 border-emerald-500 rounded-l-none'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600 dark:text-emerald-405' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Settings Content Area */}
        <div className="lg:col-span-3 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              {/* ── TAB: BUSINESS PROFILE ── */}
              {activeTab === 'business' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-850">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-850 dark:text-slate-100">
                        Business Profiles
                      </h2>
                      <p className="text-[11px] text-slate-455">
                        Add and configure company entities that appear as the supplier on your tax invoices.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setIsAddBizOpen(true)}
                      className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      <span>Add Business</span>
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {businesses.map((biz) => (
                      <Card
                        key={biz.id}
                        className={`p-4 border text-left flex flex-col justify-between gap-4 transition-all relative ${
                          biz.isDefault
                            ? 'border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/5'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-105 truncate">
                              {biz.name}
                            </h3>
                            {biz.isDefault && (
                              <span className="text-[9px] font-extrabold tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 px-2 py-0.5 rounded-full uppercase">
                                Default
                              </span>
                            )}
                          </div>
                          {biz.gstin && (
                            <p className="text-[10px] font-mono text-slate-500 font-semibold">
                              GSTIN: {biz.gstin}
                            </p>
                          )}
                          {biz.upiId && (
                            <p className="text-[10px] font-mono text-slate-500 font-semibold">
                              UPI ID: {biz.upiId}
                            </p>
                          )}
                          <p className="text-xs text-slate-550 line-clamp-2">
                            {biz.address}, {biz.city}, {biz.state} - {biz.pincode}
                          </p>
                          <p className="text-[11px] text-slate-450 truncate">
                            Email: {biz.email || 'N/A'} | Phone: {biz.phone || 'N/A'}
                          </p>
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-850/60">
                          {!biz.isDefault ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetDefaultBusiness(biz.id)}
                              className="text-[10px] font-bold h-8 border-slate-305 text-slate-700 dark:text-slate-300 dark:border-slate-800 cursor-pointer"
                            >
                              Set Default
                            </Button>
                          ) : (
                            <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              <span>Active Series</span>
                            </div>
                          )}

                          <div className="flex gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingBiz(biz)}
                              className="h-8 w-8 text-slate-500 hover:text-slate-850 dark:hover:text-slate-200 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            {!biz.isDefault && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeletingBizId(biz.id)}
                                className="h-8 w-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* ── TAB: BRANDING & TEMPLATES ── */}
              {activeTab === 'branding' && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* Left Column: Form & Design Options */}
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-850 dark:text-slate-100">
                        Branding & Templates
                      </h2>
                      <p className="text-[11px] text-slate-455">
                        Customize how client-facing PDF documents and template styles look for your invoices.
                      </p>
                    </div>

                    {/* Template Selector */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wide">
                        Default Invoicing Template Style
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-5 xl:grid-cols-3 gap-2">
                        {Object.keys(TEMPLATE_META).map((key) => {
                          const meta = TEMPLATE_META[key as keyof typeof TEMPLATE_META];
                          const isSelected = selectedTemplate === key;
                          return (
                            <button
                              key={key}
                              onClick={() => setSelectedTemplate(key)}
                              className={`p-2.5 rounded-lg border text-left flex flex-col justify-between gap-1 transition-all cursor-pointer hover:border-slate-400 ${
                                isSelected
                                  ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500'
                                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30'
                              }`}
                            >
                              <div className="flex justify-between items-center gap-1.5">
                                <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                                  {meta.label}
                                </span>
                                {isSelected && <Check className="w-3 h-3 text-emerald-500 shrink-0" />}
                              </div>
                              <div className="flex gap-1 mt-0.5">
                                {meta.colors.map((c, i) => (
                                  <span
                                    key={i}
                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Brand Color Select */}
                    <div className="space-y-2.5">
                      <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wide">
                        Brand Identity Accent Color
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        {PREDEFINED_COLORS.map((col) => (
                          <button
                            key={col.value}
                            type="button"
                            onClick={() => setBrandColor(col.value)}
                            className="w-8 h-8 rounded-full border border-slate-200/50 flex items-center justify-center cursor-pointer transition-all hover:scale-105"
                            style={{ backgroundColor: col.value }}
                          >
                            {brandColor.toLowerCase() === col.value.toLowerCase() && (
                              <Check className="w-4 h-4 text-white drop-shadow-sm" />
                            )}
                          </button>
                        ))}
                        <div className="flex items-center gap-1 border border-slate-250 dark:border-slate-800 rounded-lg px-2 py-1 text-xs font-mono h-8 bg-white dark:bg-slate-950">
                          <input
                            type="color"
                            value={brandColor}
                            onChange={(e) => setBrandColor(e.target.value)}
                            className="w-5 h-5 rounded-full border-0 cursor-pointer outline-none bg-transparent"
                          />
                          <input
                            type="text"
                            maxLength={7}
                            value={brandColor}
                            onChange={(e) => setBrandColor(e.target.value)}
                            className="w-16 bg-transparent border-0 outline-none text-left p-0 text-[11px] font-bold font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Logo & Signature Uploads */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Logo Section */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wide">
                          Corporate Logo
                        </label>
                        <div className="border border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-950/30 flex flex-col items-center justify-center gap-2 text-center min-h-[140px]">
                          {logoBase64 ? (
                            <div className="relative group max-w-[120px] max-h-[80px]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={logoBase64}
                                alt="Logo Preview"
                                className="object-contain max-h-[80px] rounded"
                              />
                              <button
                                onClick={() => setLogoBase64(null)}
                                className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-650 text-white rounded-full p-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2 flex flex-col items-center">
                              <UploadCloud className="w-8 h-8 text-slate-400" />
                              <p className="text-[10px] text-slate-500 font-semibold">Max 2MB. SVG, PNG, JPG</p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => logoInputRef.current?.click()}
                                className="h-7 text-[10px] font-bold cursor-pointer"
                              >
                                Choose File
                              </Button>
                            </div>
                          )}
                          <input
                            type="file"
                            ref={logoInputRef}
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, 'logo')}
                            className="hidden"
                          />
                        </div>
                      </div>

                      {/* Signature Section */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wide">
                          Authorized Signature
                        </label>
                        <div className="border border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-950/30 flex flex-col items-center justify-center gap-2 text-center min-h-[140px]">
                          {sigBase64 ? (
                            <div className="relative group max-w-[120px] max-h-[80px]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={sigBase64}
                                alt="Signature Preview"
                                className="object-contain max-h-[80px] rounded"
                              />
                              <button
                                onClick={() => setSigBase64(null)}
                                className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-650 text-white rounded-full p-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2 flex flex-col items-center">
                              <UploadCloud className="w-8 h-8 text-slate-400" />
                              <p className="text-[10px] text-slate-500 font-semibold">Sign on white BG, max 2MB</p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => sigInputRef.current?.click()}
                                className="h-7 text-[10px] font-bold cursor-pointer"
                              >
                                Choose File
                              </Button>
                            </div>
                          )}
                          <input
                            type="file"
                            ref={sigInputRef}
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, 'sig')}
                            className="hidden"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Terms & notes */}
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wide">
                          Default Terms & Conditions
                        </label>
                        <Textarea
                          value={terms}
                          onChange={(e) => setTerms(e.target.value)}
                          placeholder="e.g. Please send the payment to the listed bank account. Interest charged at 18% on delayed payment."
                          className="text-xs min-h-[80px] border-slate-250 dark:border-slate-800 dark:bg-slate-950"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wide">
                          Default Notes
                        </label>
                        <Textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="e.g. Thank you for your business!"
                          className="text-xs min-h-[80px] border-slate-250 dark:border-slate-800 dark:bg-slate-950"
                        />
                      </div>
                    </div>

                    {/* Save Action */}
                    <Button
                      onClick={handleSaveBranding}
                      disabled={isBrandingSaving || !activeBusiness}
                      className="w-full h-10 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs cursor-pointer shadow-md shadow-emerald-500/10"
                    >
                      {isBrandingSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          <span>Saving Changes...</span>
                        </>
                      ) : (
                        <span>Save Branding Preferences</span>
                      )}
                    </Button>
                  </div>

                  {/* Right Column: Dynamic Live Preview */}
                  <div className="space-y-2 xl:sticky xl:top-6">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center xl:text-left">
                      Live Invoicing Document Preview
                    </label>
                    <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-lg scale-95 origin-top-left max-w-[800px] bg-white">
                      <InvoicePreview
                        invoice={mockInvoice}
                        totals={mockTotals}
                        business={mockInvoice.business}
                        client={mockInvoice.client}
                        template={selectedTemplate}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB: INVOICE DEFAULTS ── */}
              {activeTab === 'defaults' && (
                <div className="max-w-xl space-y-6">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-850 dark:text-slate-100">
                      Invoice Defaults
                    </h2>
                    <p className="text-[11px] text-slate-455">
                      Configure standard tax values, payment schedules, currencies, and numbering rules.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Due Date Days */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wide">
                        Payment Term Period (Days)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={dueDays}
                        onChange={(e) => setDueDays(Number(e.target.value))}
                        className="h-10 text-xs border-slate-250 dark:border-slate-800 dark:bg-slate-950 font-semibold"
                      />
                    </div>

                    {/* Default GST Rate */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wide">
                        Default GST Rate (%)
                      </label>
                      <select
                        value={gstRate}
                        onChange={(e) => setGstRate(Number(e.target.value))}
                        className="w-full h-10 px-3 rounded-lg border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold"
                      >
                        <option value={0}>0% (Exempt / Nil)</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18% (Standard)</option>
                        <option value={28}>28%</option>
                      </select>
                    </div>

                    {/* Place of Supply */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wide">
                        Default Place of Supply
                      </label>
                      <select
                        value={placeOfSupply}
                        onChange={(e) => setPlaceOfSupply(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold"
                      >
                        <option value="">Auto (Determine from Client GST)</option>
                        {INDIAN_STATES.map((state) => (
                          <option key={state.gstCode} value={state.gstCode}>
                            [{state.gstCode}] {state.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Currency */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wide">
                        Invoice Currency
                      </label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold"
                      >
                        <option value="INR">INR (₹) - Indian Rupee</option>
                        <option value="USD">USD ($) - US Dollar</option>
                        <option value="EUR">EUR (€) - Euro</option>
                        <option value="GBP">GBP (£) - British Pound</option>
                        <option value="SGD">SGD ($) - Singapore Dollar</option>
                        <option value="AED">AED (Dh) - UAE Dirham</option>
                      </select>
                    </div>

                    {/* Invoice prefix */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wide">
                        Series Numbering Prefix
                      </label>
                      <Input
                        value={prefix}
                        onChange={(e) => setPrefix(e.target.value)}
                        className="h-10 text-xs border-slate-250 dark:border-slate-800 dark:bg-slate-950 font-semibold"
                      />
                    </div>

                    {/* Next Invoice Number */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wide">
                        Next Series Counter
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min="1"
                          value={nextNumber}
                          onChange={(e) => setNextNumber(Number(e.target.value))}
                          className="h-10 text-xs border-slate-250 dark:border-slate-800 dark:bg-slate-950 font-semibold flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            if (confirm('Reset invoice sequence counter back to 1? This can cause duplicate numbers if old numbers exist.')) {
                              setNextNumber(1);
                              toast.info('Counter reset local value. Click save to commit.');
                            }
                          }}
                          className="h-10 text-[10px] font-bold border-red-250 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer shrink-0"
                        >
                          Reset Counter
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Series Preview */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg flex items-center gap-2 text-xs font-semibold">
                    <Info className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-slate-600 dark:text-slate-400">
                      Preview of next invoice number:
                    </span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-450 font-extrabold">
                      {prefix}/{new Date().getFullYear()}/{String(nextNumber).padStart(3, '0')}
                    </span>
                  </div>

                  {/* Save Defaults */}
                  <Button
                    onClick={handleSaveDefaults}
                    disabled={isDefaultsSaving || !activeBusiness}
                    className="w-full h-10 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs cursor-pointer shadow-md shadow-emerald-500/10"
                  >
                    {isDefaultsSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Invoicing Defaults</span>
                    )}
                  </Button>
                </div>
              )}

              {/* ── TAB: NOTIFICATIONS ── */}
              {activeTab === 'notifications' && (
                <div className="max-w-xl space-y-6">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-850 dark:text-slate-100">
                      Notifications & Reminders
                    </h2>
                    <p className="text-[11px] text-slate-455">
                      Toggle system confirmation emails and configure automated payment reminder intervals.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Toggles */}
                    <div className="space-y-3 pb-4 border-b border-slate-100 dark:border-slate-850">
                      <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        Email Notifications
                      </h3>

                      <div className="flex justify-between items-center py-1">
                        <div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Invoice dispatched confirmation
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Receive a confirmation copy when sending an invoice to client.
                          </p>
                        </div>
                        <Switch
                          checked={notifs.emailInvoiceSent}
                          onCheckedChange={(checked) =>
                            setNotifs((prev) => ({ ...prev, emailInvoiceSent: checked }))
                          }
                        />
                      </div>

                      <div className="flex justify-between items-center py-1">
                        <div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Payment collected alerts
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Get notified instantly when clients settle invoices.
                          </p>
                        </div>
                        <Switch
                          checked={notifs.emailPaymentReceived}
                          onCheckedChange={(checked) =>
                            setNotifs((prev) => ({ ...prev, emailPaymentReceived: checked }))
                          }
                        />
                      </div>

                      <div className="flex justify-between items-center py-1">
                        <div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Overdue status notifications
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Get alerted immediately when an invoice remains outstanding past due date.
                          </p>
                        </div>
                        <Switch
                          checked={notifs.emailInvoiceOverdue}
                          onCheckedChange={(checked) =>
                            setNotifs((prev) => ({ ...prev, emailInvoiceOverdue: checked }))
                          }
                        />
                      </div>

                      <div className="flex justify-between items-center py-1">
                        <div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Weekly financial digest
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Receive a summarized email of weekly billing metrics and active outstanding balances.
                          </p>
                        </div>
                        <Switch
                          checked={notifs.emailWeeklySummary}
                          onCheckedChange={(checked) =>
                            setNotifs((prev) => ({ ...prev, emailWeeklySummary: checked }))
                          }
                        />
                      </div>
                    </div>

                    {/* Reminders section */}
                    <div className="space-y-4 pt-1">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                            Automated Reminders Schedule
                          </h3>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Automate reminder delivery sequences for outstanding client accounts.
                          </p>
                        </div>
                        <Switch
                          checked={notifs.reminderOverdueEnabled}
                          onCheckedChange={(checked) =>
                            setNotifs((prev) => ({ ...prev, reminderOverdueEnabled: checked }))
                          }
                        />
                      </div>

                      {notifs.reminderOverdueEnabled && (
                        <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wide">
                                Dispatch Interval (Days)
                              </label>
                              <Input
                                type="number"
                                min="1"
                                value={notifs.reminderFrequencyDays}
                                onChange={(e) =>
                                  setNotifs((prev) => ({
                                    ...prev,
                                    reminderFrequencyDays: Number(e.target.value),
                                  }))
                                }
                                className="h-9 text-xs border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wide">
                                Maximum reminder dispatch limit
                              </label>
                              <Input
                                type="number"
                                min="1"
                                value={notifs.reminderMaxCount}
                                onChange={(e) =>
                                  setNotifs((prev) => ({
                                    ...prev,
                                    reminderMaxCount: Number(e.target.value),
                                  }))
                                }
                                className="h-9 text-xs border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wide">
                              Reminder Email Subject Template
                            </label>
                            <Input
                              type="text"
                              value={notifs.reminderSubjectTemplate}
                              onChange={(e) =>
                                setNotifs((prev) => ({
                                  ...prev,
                                  reminderSubjectTemplate: e.target.value,
                                }))
                              }
                              className="h-9 text-xs border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-medium text-slate-800 dark:text-slate-250"
                              placeholder="e.g. Reminder: Invoice {number} is overdue"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wide">
                              Reminder Email Body Template
                            </label>
                            <textarea
                              rows={6}
                              value={notifs.reminderBodyTemplate || ''}
                              onChange={(e) =>
                                setNotifs((prev) => ({
                                  ...prev,
                                  reminderBodyTemplate: e.target.value,
                                }))
                              }
                              className="w-full p-2 text-xs border border-slate-300 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              placeholder="Dear {client_name},&#10;&#10;This is a polite reminder that invoice {number} with balance {amount} is overdue.&#10;&#10;Please view and pay here: {share_link}&#10;&#10;Best,&#10;{business_name}"
                            />
                          </div>

                          <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal space-y-1">
                            <p className="font-bold uppercase tracking-wider text-slate-500">Available Placeholders:</p>
                            <div className="grid grid-cols-2 gap-1 font-mono bg-slate-100 dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-850 text-slate-700 dark:text-slate-400">
                              <div><span className="text-emerald-600 dark:text-emerald-400 font-bold">{"{number}"}</span> - Invoice No.</div>
                              <div><span className="text-emerald-600 dark:text-emerald-400 font-bold">{"{amount}"}</span> - Outstanding Amt</div>
                              <div><span className="text-emerald-600 dark:text-emerald-400 font-bold">{"{client_name}"}</span> - Client Name</div>
                              <div><span className="text-emerald-600 dark:text-emerald-400 font-bold">{"{due_date}"}</span> - Due Date</div>
                              <div><span className="text-emerald-600 dark:text-emerald-400 font-bold">{"{days_overdue}"}</span> - Days Overdue</div>
                              <div><span className="text-emerald-600 dark:text-emerald-400 font-bold">{"{share_link}"}</span> - Public Invoice URL</div>
                              <div className="col-span-2"><span className="text-emerald-600 dark:text-emerald-400 font-bold">{"{business_name}"}</span> - Business Name</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Save Notifications */}
                    <Button
                      onClick={handleSaveNotifications}
                      disabled={isNotifsSaving}
                      className="w-full h-10 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs cursor-pointer shadow-md shadow-emerald-500/10"
                    >
                      {isNotifsSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          <span>Saving Configs...</span>
                        </>
                      ) : (
                        <span>Save Notifications Configs</span>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* ── TAB: BILLING & SUBSCRIPTIONS ── */}
              {activeTab === 'billing' && (
                <div className="space-y-6 max-w-4xl">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-850 dark:text-slate-100">
                      Billing & Subscriptions
                    </h2>
                    <p className="text-[11px] text-slate-455">
                      Review active license, check invoice production limits, and download dynamic receipts.
                    </p>
                  </div>

                  {/* Usage License Card */}
                  <Card className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 px-2 py-0.5 rounded">
                          Current Tier: {subscription?.plan || 'FREE'}
                        </span>
                        <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mt-2">
                          Monthly Invoices Usage
                        </h3>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400">Next Billing Cycle</p>
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-350">
                          {nextBillingCycleStr}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                        <span>Used: {subscription?.invoicesUsed ?? 0}</span>
                        <span>
                          Limit:{' '}
                          {subscription?.invoicesLimit === -1
                            ? 'Unlimited'
                            : `${subscription?.invoicesLimit ?? 5} Invoices`}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{
                            width: `${
                              subscription?.invoicesLimit === -1
                                ? 25
                                : ((subscription?.invoicesUsed ?? 0) / (subscription?.invoicesLimit ?? 5)) * 100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </Card>

                  {/* Plan Comparison Table */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-black text-slate-850 dark:text-slate-200 uppercase tracking-wider">
                      Compare Plans
                    </h3>
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse min-w-[500px]">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 font-extrabold text-slate-800 dark:text-slate-200">
                            <th className="p-3">Features Matrix</th>
                            <th className="p-3 text-center">Free (₹0/mo)</th>
                            <th className="p-3 text-center">Starter (₹499/mo)</th>
                            <th className="p-3 text-center bg-emerald-500/5 dark:bg-emerald-950/20">
                              Pro (₹1,499/mo)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-600 dark:text-slate-350">
                          <tr>
                            <td className="p-3 font-bold text-slate-700 dark:text-slate-200">
                              Invoices Per Month
                            </td>
                            <td className="p-3 text-center">5 Invoices</td>
                            <td className="p-3 text-center">15 Invoices</td>
                            <td className="p-3 text-center bg-emerald-500/5 dark:bg-emerald-950/20 font-bold text-emerald-600 dark:text-emerald-400">
                              Unlimited
                            </td>
                          </tr>
                          <tr>
                            <td className="p-3 font-bold text-slate-700 dark:text-slate-200">
                              Business Profile Entities
                            </td>
                            <td className="p-3 text-center">1 profile</td>
                            <td className="p-3 text-center">3 profiles</td>
                            <td className="p-3 text-center bg-emerald-500/5 dark:bg-emerald-950/20 font-bold text-emerald-600 dark:text-emerald-400">
                              Unlimited
                            </td>
                          </tr>
                          <tr>
                            <td className="p-3 font-bold text-slate-700 dark:text-slate-200">
                              GST/PAN Mandatory Tables
                            </td>
                            <td className="p-3 text-center">
                              <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                            </td>
                            <td className="p-3 text-center">
                              <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                            </td>
                            <td className="p-3 text-center bg-emerald-500/5 dark:bg-emerald-950/20">
                              <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                            </td>
                          </tr>
                          <tr>
                            <td className="p-3 font-bold text-slate-700 dark:text-slate-200">
                              Templates Gallery
                            </td>
                            <td className="p-3 text-center">Modern & Minimal</td>
                            <td className="p-3 text-center">Standard 5 Styles</td>
                            <td className="p-3 text-center bg-emerald-500/5 dark:bg-emerald-950/20 font-bold text-emerald-600 dark:text-emerald-400">
                              All 10 Premium
                            </td>
                          </tr>
                          <tr>
                            <td className="p-3 font-bold text-slate-700 dark:text-slate-200">
                              Bulk ZIP PDF Exports
                            </td>
                            <td className="p-3 text-center">-</td>
                            <td className="p-3 text-center">
                              <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                            </td>
                            <td className="p-3 text-center bg-emerald-500/5 dark:bg-emerald-950/20">
                              <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Payment History */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-black text-slate-850 dark:text-slate-200 uppercase tracking-wider">
                      Billing Receipts History
                    </h3>
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 font-extrabold text-slate-800 dark:text-slate-200">
                            <th className="p-3">Receipt date</th>
                            <th className="p-3">Amount Charged</th>
                            <th className="p-3">Reference Plan</th>
                            <th className="p-3 text-right">Receipt Download</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-650 dark:text-slate-350">
                          {subscription?.plan !== 'FREE' ? (
                            <tr>
                              <td className="p-3">
                                {subscription?.updatedAt
                                  ? new Date(subscription.updatedAt).toLocaleDateString()
                                  : new Date().toLocaleDateString()}
                              </td>
                              <td className="p-3 font-bold">
                                {subscription?.plan === 'STARTER' ? '₹499.00' : '₹1,499.00'}
                              </td>
                              <td className="p-3">{subscription?.plan} plan</td>
                              <td className="p-3 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toast.success('Downloading dynamic PDF receipt...')}
                                  className="h-8 text-[11px] font-bold text-emerald-600 dark:text-emerald-450 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 cursor-pointer"
                                >
                                  <Download className="w-3.5 h-3.5 mr-1" />
                                  <span>Download</span>
                                </Button>
                              </td>
                            </tr>
                          ) : (
                            <tr>
                              <td colSpan={4} className="p-4 text-center text-slate-450 italic">
                                No billing receipt entries available for Free Tier.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* subscription cancel zone */}
                  {subscription?.plan !== 'FREE' && (
                    <div className="p-5 border border-red-200 dark:border-red-950/40 rounded-xl bg-red-50/10 dark:bg-red-950/5 space-y-3.5">
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-red-650 dark:text-red-400 uppercase tracking-wider">
                          Cancel subscription license
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Wipe monthly Starter/Pro renewals. Active series will revert to Free tier immediately, limiting invoice dispatch counters to 5 entries.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setIsCancelSubscriptionOpen(true)}
                        className="h-9 font-bold text-xs border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/30 cursor-pointer"
                      >
                        Cancel Plan Subscription
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB: DATA & EXPORT ── */}
              {activeTab === 'data' && (
                <div className="max-w-2xl space-y-6">
                  {/* Section 1: Data Portability Export */}
                  <div className="space-y-3">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-850 dark:text-slate-100">
                        Data Portability & Import
                      </h2>
                      <p className="text-[11px] text-slate-455">
                        Download transaction archives or batch import client catalogs and item price lists.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <a href="/api/settings/export?type=invoices_json" download>
                        <Button
                          variant="outline"
                          className="w-full h-10 text-xs font-bold border-slate-250 dark:border-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          <Download className="w-4 h-4 mr-2 text-indigo-500" />
                          <span>Export Invoices (JSON)</span>
                        </Button>
                      </a>

                      <a href="/api/settings/export?type=invoices_csv" download>
                        <Button
                          variant="outline"
                          className="w-full h-10 text-xs font-bold border-slate-250 dark:border-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          <Download className="w-4 h-4 mr-2 text-emerald-500" />
                          <span>Export Invoices (Excel)</span>
                        </Button>
                      </a>

                      <a href="/api/settings/export?type=clients_csv" download>
                        <Button
                          variant="outline"
                          className="w-full h-10 text-xs font-bold border-slate-250 dark:border-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          <Download className="w-4 h-4 mr-2 text-blue-500" />
                          <span>Export Clients (CSV)</span>
                        </Button>
                      </a>
                    </div>
                  </div>

                  {/* Section 2: CSV Importers */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-850">
                    {/* Client Import */}
                    <div className="space-y-3">
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-black text-slate-850 dark:text-slate-250 uppercase tracking-wider">
                          Batch Import Clients CSV
                        </h4>
                        <p className="text-[10px] text-slate-500">
                          Upload clients data spreadsheet. Must contain: `Name`.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="border border-dashed border-slate-300 dark:border-slate-800 rounded-lg p-4 bg-slate-50/50 dark:bg-slate-950/20 text-center flex flex-col items-center justify-center min-h-[110px]">
                          {clientsImportFile ? (
                            <div className="space-y-2">
                              <p className="text-xs font-mono font-bold text-emerald-600 truncate max-w-[200px]">
                                {clientsImportFile.name}
                              </p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setClientsImportFile(null)}
                                className="h-7 text-[10px] font-bold text-red-500 border-red-200 hover:bg-red-50 cursor-pointer"
                              >
                                Clear File
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                              <label className="text-[10px] text-slate-600 dark:text-slate-450 font-bold underline cursor-pointer">
                                Choose Client CSV
                                <input
                                  type="file"
                                  accept=".csv"
                                  onChange={(e) => setClientsImportFile(e.target.files?.[0] || null)}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          )}
                        </div>

                        {clientsImportFile && (
                          <Button
                            onClick={handleImportClients}
                            disabled={isClientsImporting}
                            className="w-full h-8 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
                          >
                            {isClientsImporting ? 'Importing...' : 'Upload & Process Clients'}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Catalog Items Import */}
                    <div className="space-y-3">
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-black text-slate-850 dark:text-slate-250 uppercase tracking-wider">
                          Batch Import Catalog Items CSV
                        </h4>
                        <p className="text-[10px] text-slate-500">
                          Upload item catalog catalog list. Must contain: `Name`, `Rate`.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="border border-dashed border-slate-300 dark:border-slate-800 rounded-lg p-4 bg-slate-50/50 dark:bg-slate-950/20 text-center flex flex-col items-center justify-center min-h-[110px]">
                          {itemsImportFile ? (
                            <div className="space-y-2">
                              <p className="text-xs font-mono font-bold text-emerald-600 truncate max-w-[200px]">
                                {itemsImportFile.name}
                              </p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setItemsImportFile(null)}
                                className="h-7 text-[10px] font-bold text-red-500 border-red-200 hover:bg-red-50 cursor-pointer"
                              >
                                Clear File
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                              <label className="text-[10px] text-slate-600 dark:text-slate-450 font-bold underline cursor-pointer">
                                Choose Catalog CSV
                                <input
                                  type="file"
                                  accept=".csv"
                                  onChange={(e) => setItemsImportFile(e.target.files?.[0] || null)}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          )}
                        </div>

                        {itemsImportFile && (
                          <Button
                            onClick={handleImportItems}
                            disabled={isItemsImporting}
                            className="w-full h-8 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
                          >
                            {isItemsImporting ? 'Importing...' : 'Upload & Process Catalog'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="p-5 border border-red-200 dark:border-red-950/30 rounded-xl bg-red-50/5 dark:bg-red-950/5 space-y-4">
                    <div>
                      <h3 className="text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-widest flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Extreme Danger Zone</span>
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Irreversible administrative actions. Double check before executing.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-1.5">
                      <Button
                        type="button"
                        onClick={() => {
                          setDangerAction('purge');
                          setDangerConfirmText('');
                        }}
                        className="bg-red-100 hover:bg-red-200 text-red-800 dark:bg-red-950/20 dark:text-red-400 font-bold text-xs h-9 cursor-pointer"
                      >
                        Wipe Transactions & Clients
                      </Button>

                      <Button
                        type="button"
                        onClick={() => {
                          setDangerAction('deleteAccount');
                          setDangerConfirmText('');
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-9 cursor-pointer"
                      >
                        Delete My Account Profile
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── DIALOG: ADD BUSINESS ── */}
      <Dialog open={isAddBizOpen} onOpenChange={setIsAddBizOpen}>
        <DialogContent className="sm:max-w-[550px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-y-auto max-h-[85vh] text-left">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-50 tracking-tight text-left">
              Create Business Profile
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 text-left">
              Configure details, colors, and series presets for a new supplier profile.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            <BusinessForm onSubmit={handleAddBusiness} onCancel={() => setIsAddBizOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: EDIT BUSINESS ── */}
      <Dialog open={!!editingBiz} onOpenChange={(open) => !open && setEditingBiz(null)}>
        <DialogContent className="sm:max-w-[550px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-y-auto max-h-[85vh] text-left">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-50 tracking-tight text-left">
              Edit Business Profile
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 text-left">
              Update company address, contact information, and banking defaults.
            </DialogDescription>
          </DialogHeader>
          {editingBiz && (
            <div className="pt-2">
              <BusinessForm
                initialData={editingBiz}
                onSubmit={handleEditBusinessSubmit}
                onCancel={() => setEditingBiz(null)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: CONFIRM DELETE BUSINESS ── */}
      <Dialog open={!!deletingBizId} onOpenChange={(open) => !open && setDeletingBizId(null)}>
        <DialogContent className="sm:max-w-[400px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl text-left">
          <DialogHeader>
            <DialogTitle className="text-sm font-extrabold text-slate-905 dark:text-slate-50 tracking-tight text-left">
              Delete Business Profile?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 text-left">
              Wiping this profile erases associated templates and banking settings. Invoices attached to this series will become un-editable.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" size="sm" onClick={() => setDeletingBizId(null)} className="h-8 text-xs font-bold">
              Cancel
            </Button>
            <Button
              disabled={isDeletingBizLoading}
              onClick={handleDeleteBusiness}
              className="bg-red-650 hover:bg-red-700 text-white font-bold text-xs h-8 cursor-pointer"
            >
              {isDeletingBizLoading ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: CANCEL SUBSCRIPTION ── */}
      <Dialog open={isCancelSubscriptionOpen} onOpenChange={setIsCancelSubscriptionOpen}>
        <DialogContent className="sm:max-w-[400px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl text-left">
          <DialogHeader>
            <DialogTitle className="text-sm font-extrabold text-slate-905 dark:text-slate-50 tracking-tight text-left">
              Cancel Subscription?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 text-left">
              Are you sure you want to cancel renewals? You will immediately revert to the Free plan limits (5 invoices maximum per month).
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" size="sm" onClick={() => setIsCancelSubscriptionOpen(false)} className="h-8 text-xs font-bold">
              Stay Subscribed
            </Button>
            <Button
              disabled={isCancellingSubscription}
              onClick={handleCancelSubscription}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-8 cursor-pointer"
            >
              {isCancellingSubscription ? 'Processing...' : 'Cancel Subscription'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: DANGER CONFIRM ── */}
      <Dialog open={!!dangerAction} onOpenChange={(open) => !open && setDangerAction(null)}>
        <DialogContent className="sm:max-w-[400px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl text-left">
          <DialogHeader>
            <DialogTitle className="text-sm font-extrabold text-red-600 dark:text-red-400 tracking-tight text-left flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>Confirm Permanent Erasure</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 text-left">
              {dangerAction === 'purge'
                ? 'This deletes all client records, transactions, catalog items, and invoices. This action CANNOT be undone.'
                : 'This permanently deletes your account profile, billing credentials, and all transaction sheets from Virbic.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wide">
                Type &quot;DELETE&quot; to authorize
              </label>
              <Input
                value={dangerConfirmText}
                onChange={(e) => setDangerConfirmText(e.target.value)}
                className="h-10 text-sm font-mono border-red-200 focus:border-red-500"
                placeholder="DELETE"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setDangerAction(null)} className="h-8 text-xs font-bold">
                Cancel
              </Button>
              <Button
                disabled={isDangerLoading || dangerConfirmText !== 'DELETE'}
                onClick={handleDangerAction}
                className="bg-red-650 hover:bg-red-700 text-white font-bold text-xs h-8 cursor-pointer"
              >
                {isDangerLoading ? 'Processing...' : 'Authorize Delete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
