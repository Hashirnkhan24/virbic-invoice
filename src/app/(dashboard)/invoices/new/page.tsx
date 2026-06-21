'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Users,
  Building,
  Plus,
  Trash2,
  Eye,
  Save,
  Send,
  Check,
  Search,
  PlusCircle,
  FileSpreadsheet,
  AlertCircle,
  Clock,
  Sparkles,
  HelpCircle,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useInvoiceForm,
  LineItemState,
} from '@/hooks/useInvoiceForm';
import { Switch } from '@/components/ui/switch';
import { useGetClients, useCreateClient } from '@/hooks/useClients';
import ItemCatalogSelector from '@/components/items/ItemCatalogSelector';
import ClientForm from '@/components/clients/ClientForm';
import InvoicePreview from '@/components/invoice-templates/InvoicePreview';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { INDIAN_STATES } from '@/lib/constants';
import { formatCurrency } from '@/lib/helpers';
import { currencies } from '@/lib/currency';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function NewInvoicePage() {
  const router = useRouter();

  // Load custom state hook
  const {
    formState,
    activeBusiness,
    isInterState,
    totals,
    isValid,
    isSaving,
    lastSaved,
    actions,
  } = useInvoiceForm();

  // Load client list for selector
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const { clients, refetch: refetchClients } = useGetClients('');
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // Client quick creation mutation
  const { create: createClient, loading: clientSaving } = useCreateClient();

  // Dialog states
  const [isQuickClientOpen, setIsQuickClientOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [showPreviewMobile, setShowPreviewMobile] = useState(false);

  // Product Autocomplete States
  const [activeItemSearchIndex, setActiveItemSearchIndex] = useState<number | null>(null);
  const [autocompleteItems, setAutocompleteItems] = useState<any[]>([]);
  const [loadingAutocomplete, setLoadingAutocomplete] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Overall saving states (submitting)
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recurring States
  const [isRecurring, setIsRecurring] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [recurringFrequency, setRecurringFrequency] = useState<'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('MONTHLY');
  const [recurringStartDate, setRecurringStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [recurringEndDate, setRecurringEndDate] = useState('');
  const [noEndDate, setNoEndDate] = useState(true);
  const [generateFirstNow, setGenerateFirstNow] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('recurring') === 'true') {
        setIsRecurring(true);
      }
    }
  }, []);

  // 1. Listen for clicks outside selectors to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setShowClientDropdown(false);
      }
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setActiveItemSearchIndex(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 2. Client dropdown filtering
  const filteredClients = useMemo(() => {
    return clients.filter((c) =>
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      (c.gstin && c.gstin.toLowerCase().includes(clientSearch.toLowerCase()))
    );
  }, [clients, clientSearch]);

  const selectedClientObj = useMemo(() => {
    return clients.find((c) => c.id === formState.clientId) || null;
  }, [clients, formState.clientId]);

  // 3. Search catalog items for autocomplete
  const triggerAutocompleteSearch = async (index: number, query: string) => {
    if (!query.trim()) {
      setAutocompleteItems([]);
      return;
    }
    setLoadingAutocomplete(true);
    try {
      const res = await fetch(`/api/items?search=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setAutocompleteItems(data.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAutocomplete(false);
    }
  };

  const handleAutocompleteSelect = (index: number, catalogItem: any) => {
    actions.updateLineItem(index, {
      itemId: catalogItem.id,
      description: catalogItem.name,
      hsnCode: catalogItem.hsnCode || '',
      rate: catalogItem.rate,
      gstRate: catalogItem.gstRate,
      unit: catalogItem.unit,
    });
    setActiveItemSearchIndex(null);
    setAutocompleteItems([]);
  };

  // 4. Quick add client inline submission
  const handleQuickClientSubmit = async (data: any) => {
    try {
      const res = await createClient(data);
      toast.success('Customer added successfully!');
      
      // Refresh registry
      await refetchClients();
      
      // Auto select the new client
      const newClient = res.client;
      actions.setClient(newClient.id, newClient.gstin, newClient.billingState);
      
      setIsQuickClientOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to create quick client');
    }
  };

  // 5. Select from catalog callback
  const handleCatalogSelect = (item: any) => {
    // If the last item is empty, overwrite it. Else add new row.
    const lastItem = formState.lineItems[formState.lineItems.length - 1];
    const isEmpty =
      formState.lineItems.length === 1 &&
      lastItem.description.trim() === '' &&
      lastItem.rate === 0;

    if (isEmpty) {
      actions.updateLineItem(0, {
        itemId: item.id,
        description: item.name,
        hsnCode: item.hsnCode || '',
        rate: item.rate,
        gstRate: item.gstRate,
        unit: item.unit,
      });
    } else {
      actions.addLineItem({
        itemId: item.id,
        description: item.name,
        hsnCode: item.hsnCode || '',
        rate: item.rate,
        gstRate: item.gstRate,
        unit: item.unit,
      });
    }
  };

  // 6. Submit invoice
  const handleSaveInvoice = async (invoiceStatus: 'DRAFT' | 'SENT') => {
    if (!isValid) {
      toast.error('Please fill in all required fields (Client, Invoice Number, and Line Items).');
      return;
    }
    
    if (isRecurring) {
      if (!templateName.trim()) {
        toast.error('Please enter a Template Name.');
        return;
      }
      setIsSubmitting(true);
      try {
        const res = await fetch('/api/invoices/recurring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateName: templateName.trim(),
            clientId: formState.clientId,
            businessId: activeBusiness?.id,
            recurringFrequency,
            recurringStartDate,
            recurringEndDate: noEndDate ? null : recurringEndDate,
            generateFirstNow,
            template: formState.template,
            currency: formState.currency,
            placeOfSupply: formState.placeOfSupply,
            isInterState,
            reverseCharge: formState.reverseCharge,
            notes: formState.notes,
            terms: formState.terms,
            lineItems: formState.lineItems.map(item => ({
              description: item.description,
              hsnCode: item.hsnCode,
              quantity: item.quantity,
              unit: item.unit,
              rate: item.rate,
              discount: item.discount,
              discountType: item.discountType,
              gstRate: item.gstRate,
            })),
            subTotal: totals.subTotal,
            discountTotal: totals.discountTotal,
            taxableAmount: totals.taxableAmount,
            cgstTotal: totals.cgstTotal,
            sgstTotal: totals.sgstTotal,
            igstTotal: totals.igstTotal,
            cessTotal: totals.cessTotal,
            roundOff: totals.roundOff,
            grandTotal: totals.grandTotal,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          toast.success('Recurring Invoice template saved successfully!');
          actions.resetDraft();
          router.push('/invoices/recurring');
        } else {
          toast.error(data.error || 'Failed to save template');
        }
      } catch (err: any) {
        toast.error(err.message || 'An error occurred.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formState,
          status: invoiceStatus,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(
          invoiceStatus === 'DRAFT'
            ? 'Invoice saved as Draft!'
            : 'Invoice created and finalized!'
        );
        
        // Clear local storage draft
        actions.resetDraft();

        // Redirect to invoices list
        router.push('/invoices');
      } else {
        toast.error(data.error || 'Failed to create invoice');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'An error occurred during save.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Date shortcut helpers
  const handleDueDateShortcut = (days: number) => {
    const newDueDate = new Date(formState.issueDate);
    newDueDate.setDate(newDueDate.getDate() + days);
    actions.updateField('dueDate', newDueDate);
  };

  // Add custom field
  const handleAddCustomField = () => {
    actions.updateField('customFields', [...formState.customFields, { key: '', value: '' }]);
  };

  // Remove custom field
  const handleRemoveCustomField = (index: number) => {
    actions.updateField(
      'customFields',
      formState.customFields.filter((_, i) => i !== index)
    );
  };

  // Update custom field
  const handleUpdateCustomField = (index: number, keyOrValue: 'key' | 'value', val: string) => {
    const updated = formState.customFields.map((field, i) => {
      if (i !== index) return field;
      return {
        ...field,
        [keyOrValue]: val,
      };
    });
    actions.updateField('customFields', updated);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="text-left">
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
              <span>New Invoice</span>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md uppercase font-mono">
                GST Ready
              </span>
            </h1>
            <p className="text-xs text-slate-500">Draft a professional tax invoice in minutes.</p>
          </div>
        </div>

        {/* Auto-save status indicators */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-450">
          <Clock className="w-3.5 h-3.5" />
          {isSaving ? (
            <span>Saving draft...</span>
          ) : lastSaved ? (
            <span>Auto-saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          ) : (
            <span>Draft state loaded</span>
          )}
        </div>
      </div>

      {/* Main Grid: Left editor (55%) vs. Right preview (45%) */}
      <div className="grid grid-cols-1 lg:grid-cols-20 gap-6 items-start">
        
        {/* LEFT FORM COLUMN (55% or 11/20 span) */}
        <div className="lg:col-span-11 space-y-6">
          
          {/* Card 1: Layout & Style Settings */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <span className="text-xs font-black text-slate-800 dark:text-slate-250 uppercase tracking-wider">
                1. Invoice Templates & Styles
              </span>
              
              {/* Currency Dropdown Selector */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs font-semibold text-slate-450">Currency:</span>
                <select
                  value={formState.currency}
                  onChange={(e) => actions.setCurrency(e.target.value)}
                  className="h-8 text-xs font-bold px-2 py-1 bg-white border border-slate-350 dark:border-slate-800 dark:bg-slate-950 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                >
                  <option value="INR">🇮🇳 INR (₹)</option>
                  <option value="USD">🇺🇸 USD ($)</option>
                  <option value="EUR">🇪🇺 EUR (€)</option>
                  <option value="GBP">🇬🇧 GBP (£)</option>
                </select>
              </div>
            </div>

            {/* Scrollable Templates swatches */}
            <div className="flex gap-3.5 overflow-x-auto pb-2 scrollbar-thin">
              {[
                { id: 'modern', name: 'Modern', color: 'from-emerald-500 to-teal-500' },
                { id: 'minimal', name: 'Minimal', color: 'from-slate-600 to-slate-900' },
                { id: 'professional', name: 'Corporate', color: 'from-blue-600 to-indigo-950' },
                { id: 'creative', name: 'Creative', color: 'from-violet-500 to-pink-500' },
                { id: 'dark', name: 'Dark Mode', color: 'from-slate-950 to-slate-800' },
              ].map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => actions.setTemplate(tpl.id)}
                  className={cn(
                    "flex-shrink-0 flex items-center gap-2.5 px-4 py-2 border rounded-xl shadow-xs transition-all cursor-pointer font-bold text-xs select-none",
                    formState.template === tpl.id
                      ? "border-sky-500 bg-sky-50/20 dark:bg-sky-950/20"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-850"
                  )}
                >
                  <div className={cn("w-3 h-3 rounded-full bg-gradient-to-r", tpl.color)} />
                  <span>{tpl.name}</span>
                  {formState.template === tpl.id && <Check className="w-3.5 h-3.5 text-sky-500 ml-1" />}
                </button>
              ))}
            </div>
          </div>

          {/* Card 2: Registry Selection (Bill To & From) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-5 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* BILL FROM (Auto filled business) */}
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100 dark:border-slate-850">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-250 uppercase tracking-wider">
                    Bill From (Business)
                  </span>
                  <Link
                    href="/settings"
                    className="text-[10px] font-bold text-emerald-600 dark:text-emerald-450 hover:underline"
                  >
                    Edit in Settings
                  </Link>
                </div>

                {activeBusiness ? (
                  <div className="text-left space-y-1 p-3 rounded-xl border border-slate-150 dark:border-slate-850 bg-slate-50/40 dark:bg-slate-950/20">
                    <p className="text-xs font-bold text-slate-850 dark:text-slate-100">{activeBusiness.name}</p>
                    {activeBusiness.gstin && (
                      <p className="text-[10px] font-mono text-slate-450 font-semibold">GSTIN: {activeBusiness.gstin}</p>
                    )}
                    <p className="text-[10px] text-slate-450 leading-relaxed truncate" title={activeBusiness.address || ''}>
                      {activeBusiness.address || 'No Address Profile Set'}
                    </p>
                  </div>
                ) : (
                  <div className="text-left p-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-450 text-xs">
                    No active business profile. Please onboarding one in Settings.
                  </div>
                )}
              </div>

              {/* BILL TO (Select client) */}
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100 dark:border-slate-850">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-250 uppercase tracking-wider">
                    Bill To (Customer) <span className="text-red-500">*</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsQuickClientOpen(true)}
                    className="text-[10px] font-bold text-emerald-600 dark:text-emerald-450 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>Quick Add Client</span>
                  </button>
                </div>

                <div className="relative" ref={clientDropdownRef}>
                  <div className="relative">
                    <Users className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Search existing customer..."
                      value={showClientDropdown ? clientSearch : selectedClientObj?.name || ''}
                      onChange={(e) => {
                        setClientSearch(e.target.value);
                        setShowClientDropdown(true);
                      }}
                      onFocus={() => {
                        setClientSearch('');
                        setShowClientDropdown(true);
                      }}
                      className="pl-10 pr-4 py-2 border-slate-350 dark:border-slate-800 dark:bg-slate-950 text-sm focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>

                  {showClientDropdown && (
                    <div className="absolute left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 rounded-xl shadow-lg">
                      {filteredClients.length > 0 ? (
                        filteredClients.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              actions.setClient(c.id, c.gstin, c.billingState);
                              setShowClientDropdown(false);
                            }}
                            className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-855 text-slate-850 dark:text-slate-100 flex items-center justify-between border-b border-slate-100/50 last:border-0 cursor-pointer"
                          >
                            <div className="space-y-0.5 overflow-hidden pr-3">
                              <p className="font-bold truncate">{c.name}</p>
                              {c.gstin && <p className="text-[9px] font-mono text-slate-400">GST: {c.gstin}</p>}
                            </div>
                            {formState.clientId === c.id && <Check className="w-3.5 h-3.5 text-sky-500" />}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-4 text-xs text-slate-450 italic text-center">
                          No matching clients found. Click &quot;Quick Add Client&quot; above.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedClientObj && (
                  <div className="text-left space-y-1 p-3 rounded-xl border border-slate-150 dark:border-slate-850 bg-slate-50/40 dark:bg-slate-950/20 animate-fade-in text-[10px] leading-relaxed">
                    <p className="font-bold text-slate-850 dark:text-slate-100">{selectedClientObj.name}</p>
                    {selectedClientObj.gstin && (
                      <p className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">GSTIN: {selectedClientObj.gstin}</p>
                    )}
                    <p className="text-slate-450 leading-relaxed truncate" title={selectedClientObj.billingAddress || ''}>
                      {selectedClientObj.billingAddress || 'No Address registered'}
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Card 3: Invoice Metadata details */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-5 shadow-sm space-y-5">
            <span className="text-xs font-black text-slate-800 dark:text-slate-250 uppercase tracking-wider block pb-1 border-b border-slate-100 dark:border-slate-850">
              2. Invoice Details & Place of Supply
            </span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Invoice Number */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Invoice Number</label>
                <Input
                  type="text"
                  value={formState.invoiceNumber}
                  onChange={(e) => actions.updateField('invoiceNumber', e.target.value)}
                  className="h-9 text-sm border-slate-350 dark:border-slate-800 dark:bg-slate-950 font-mono uppercase focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              {/* Issue Date */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Issue Date</label>
                <input
                  type="date"
                  value={formState.issueDate.toISOString().split('T')[0]}
                  onChange={(e) => {
                    const d = new Date(e.target.value || Date.now());
                    actions.updateField('issueDate', d);
                  }}
                  className="w-full h-9 text-sm px-3 border border-slate-350 dark:border-slate-800 dark:bg-slate-950 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 font-mono"
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Due Date</label>
                <input
                  type="date"
                  value={formState.dueDate.toISOString().split('T')[0]}
                  onChange={(e) => {
                    const d = new Date(e.target.value || Date.now());
                    actions.updateField('dueDate', d);
                  }}
                  className="w-full h-9 text-sm px-3 border border-slate-350 dark:border-slate-800 dark:bg-slate-950 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 font-mono"
                />
              </div>

              {/* Place of Supply */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Place of Supply</label>
                <select
                  value={formState.placeOfSupply}
                  onChange={(e) => actions.setPlaceOfSupply(e.target.value)}
                  className="w-full h-9 text-sm px-3 bg-white border border-slate-350 dark:border-slate-800 dark:bg-slate-950 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                >
                  <option value="">Select Supply State...</option>
                  {INDIAN_STATES.map((state) => (
                    <option key={state.code} value={state.name}>
                      {state.name} ({state.code})
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {/* Due date shortcuts */}
            <div className="flex flex-wrap items-center gap-2 text-xs select-none">
              <span className="font-semibold text-slate-450">Due shortcuts:</span>
              {[
                { label: '+7 Days', value: 7 },
                { label: '+15 Days', value: 15 },
                { label: '+30 Days', value: 30 },
              ].map((shortcut) => (
                <button
                  key={shortcut.label}
                  type="button"
                  onClick={() => handleDueDateShortcut(shortcut.value)}
                  className="h-6 px-2.5 border border-slate-200 dark:border-slate-800 rounded-md hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-800 text-slate-550 font-bold transition-all cursor-pointer text-[10px]"
                >
                  {shortcut.label}
                </button>
              ))}
            </div>
          </div>

          {/* Card 4: LINE ITEMS TABLE (The Interactive Core) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-850">
              <span className="text-xs font-black text-slate-800 dark:text-slate-250 uppercase tracking-wider">
                3. Invoice Line Items
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCatalogOpen(true)}
                className="h-7 text-[10px] font-bold px-2.5 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                <span>Add from Catalog</span>
              </Button>
            </div>

            {/* Line Items Grid layout */}
            <div className="overflow-x-auto pb-4 -mx-5 px-5 scrollbar-thin">
              <div className="space-y-4 pr-3 min-w-[880px]">
                <AnimatePresence initial={false}>
                  {formState.lineItems.map((item, idx) => {
                    const qty = item.quantity;
                    const rate = item.rate;
                    const itemDiscount = item.discount;
                    
                    const rowAmount = qty * rate;
                    const discountValue = item.discountType === 'PERCENTAGE' ? rowAmount * (itemDiscount / 100) : itemDiscount;
                    const itemAmount = Math.max(0, rowAmount - discountValue);

                    return (
                      <motion.div
                        key={idx}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="group relative grid grid-cols-12 md:grid-cols-[minmax(180px,3.5fr)_minmax(80px,1.2fr)_minmax(70px,1fr)_minmax(90px,1.3fr)_minmax(105px,1.8fr)_minmax(105px,1.8fr)_minmax(90px,1.3fr)] gap-3 p-4 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-855 rounded-xl items-start"
                      >
                        {/* Description (Searchable) */}
                        <div className="col-span-12 md:col-auto space-y-1 relative" ref={idx === activeItemSearchIndex ? autocompleteRef : null}>
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">
                            Item Description
                          </label>
                          <Input
                            type="text"
                            placeholder="e.g. Consulting work / Product Name"
                            value={item.description}
                            onChange={(e) => {
                              actions.updateLineItem(idx, { description: e.target.value });
                              setActiveItemSearchIndex(idx);
                              triggerAutocompleteSearch(idx, e.target.value);
                            }}
                            className="h-8 text-xs border-slate-300 dark:border-slate-855 dark:bg-slate-950 font-medium"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                actions.addLineItem();
                              }
                            }}
                          />

                          {/* Autocomplete Dropdown list */}
                          {idx === activeItemSearchIndex && autocompleteItems.length > 0 && (
                            <div className="absolute left-0 right-0 z-20 mt-1 max-h-36 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-805 rounded-lg shadow-lg">
                              {autocompleteItems.map((cItem) => (
                                <button
                                  key={cItem.id}
                                  type="button"
                                  onClick={() => handleAutocompleteSelect(idx, cItem)}
                                  className="w-full text-left px-3 py-2 text-[11px] hover:bg-slate-50 dark:hover:bg-slate-855 text-slate-850 dark:text-slate-150 border-b border-slate-100 last:border-0 cursor-pointer flex justify-between items-center"
                                >
                                  <span className="font-bold truncate">{cItem.name}</span>
                                  <span className="font-mono text-slate-500 font-bold ml-2">
                                    {formatCurrency(cItem.rate, formState.currency)}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* HSN Code */}
                        <div className="col-span-4 md:col-auto space-y-1">
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">
                            HSN
                          </label>
                          <Input
                            type="text"
                            placeholder="9983"
                            value={item.hsnCode || ''}
                            onChange={(e) => actions.updateLineItem(idx, { hsnCode: e.target.value })}
                            className="h-8 text-xs border-slate-300 dark:border-slate-855 dark:bg-slate-950 font-mono text-center"
                          />
                        </div>

                        {/* Quantity */}
                        <div className="col-span-4 md:col-auto space-y-1">
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest text-right">
                            Qty
                          </label>
                          <Input
                            type="number"
                            value={item.quantity}
                            min="0.01"
                            step="any"
                            onChange={(e) => actions.updateLineItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-xs border-slate-300 dark:border-slate-855 dark:bg-slate-950 font-mono text-right"
                          />
                        </div>

                        {/* Unit */}
                        <div className="col-span-4 md:col-auto space-y-1">
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">
                            Unit
                          </label>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className="w-full h-8 text-xs px-2 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-855 rounded-lg focus:outline-none flex items-center justify-between gap-1 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 select-none text-slate-800 dark:text-slate-200"
                            >
                              <span className="truncate">{item.unit}</span>
                              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center" className="min-w-0 w-24">
                              {['PCS', 'HRS', 'DAYS', 'NOS', 'BOX', 'SET'].map((unit) => (
                                <DropdownMenuItem
                                  key={unit}
                                  onClick={() => actions.updateLineItem(idx, { unit })}
                                  className="text-xs px-2 py-1.5 cursor-pointer font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                >
                                  {unit}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Rate */}
                        <div className="col-span-4 md:col-auto space-y-1">
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest text-right">
                            Rate
                          </label>
                          <Input
                            type="number"
                            value={item.rate}
                            min="0"
                            step="any"
                            onChange={(e) => actions.updateLineItem(idx, { rate: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-xs border-slate-300 dark:border-slate-855 dark:bg-slate-950 font-mono text-right font-bold"
                          />
                        </div>

                        {/* Discount Inline (Rate & % Toggler) */}
                        <div className="col-span-4 md:col-auto space-y-1">
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest text-right">
                            Disc
                          </label>
                          <div className="relative flex items-center">
                            <Input
                              type="number"
                              value={item.discount}
                              onChange={(e) => actions.updateLineItem(idx, { discount: parseFloat(e.target.value) || 0 })}
                              className="h-8 text-xs border-slate-300 dark:border-slate-855 dark:bg-slate-950 font-mono text-right pr-6"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                actions.updateLineItem(idx, {
                                  discountType: item.discountType === 'PERCENTAGE' ? 'AMOUNT' : 'PERCENTAGE',
                                })
                              }
                              className="absolute right-1 text-[9px] font-black text-slate-400 hover:text-slate-800 p-1 cursor-pointer bg-slate-100 dark:bg-slate-850 rounded"
                            >
                              {item.discountType === 'PERCENTAGE' ? '%' : (currencies.find(c => c.code === formState.currency)?.symbol || '₹')}
                            </button>
                          </div>
                        </div>

                        {/* GST Rate & Amount */}
                        <div className="col-span-12 md:col-auto space-y-1">
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest text-right">
                            {formState.currency === 'INR' ? 'GST %' : 'Tax %'}
                          </label>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className="w-full h-8 text-xs px-2 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-855 rounded-lg focus:outline-none flex items-center justify-between gap-1 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 select-none font-mono text-slate-800 dark:text-slate-200"
                            >
                              <span className="w-full text-right">{item.gstRate}%</span>
                              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-0 w-24">
                              {[0, 5, 12, 18, 28].map((rate) => (
                                <DropdownMenuItem
                                  key={rate}
                                  onClick={() => actions.updateLineItem(idx, { gstRate: rate })}
                                  className="text-xs px-2 py-1.5 cursor-pointer font-mono text-right hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                >
                                  {rate}%
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Row Delete Button (Hover) */}
                        <button
                          type="button"
                          onClick={() => actions.removeLineItem(idx)}
                          disabled={formState.lineItems.length === 1 && idx === 0}
                          className="absolute -right-2 top-3 p-1.5 rounded-full border border-slate-200 bg-white hover:bg-red-50 hover:text-red-650 hover:border-red-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-red-950/20 text-slate-400 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-150 cursor-pointer shadow-xs disabled:pointer-events-none disabled:opacity-0"
                          title="Remove Line Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>

            {/* Row additions */}
            <div className="pt-2 flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => actions.addLineItem()}
                className="h-8 text-xs font-bold border-slate-200 text-slate-650 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-850 cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-500" />
                <span>Add Item Row</span>
              </Button>
            </div>
          </div>

          {/* Card 5: Form Summaries & Offsets */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-5 shadow-sm space-y-6">
            <span className="text-xs font-black text-slate-800 dark:text-slate-250 uppercase tracking-wider block pb-1 border-b border-slate-100 dark:border-slate-850">
              4. Overall Discounts & Cess
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Overall Discount Input */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Overall Discount</label>
                <div className="relative flex items-center">
                  <Input
                    type="number"
                    value={formState.overallDiscount}
                    onChange={(e) => actions.updateField('overallDiscount', parseFloat(e.target.value) || 0)}
                    className="h-8 text-sm font-mono border-slate-350 dark:border-slate-800 dark:bg-slate-950 text-right pr-12 focus:ring-2 focus:ring-sky-500/20"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      actions.updateField(
                        'overallDiscountType',
                        formState.overallDiscountType === 'PERCENTAGE' ? 'AMOUNT' : 'PERCENTAGE'
                      )
                    }
                    className="absolute right-1 text-[9px] font-black text-slate-400 hover:text-slate-800 p-1 cursor-pointer bg-slate-100 dark:bg-slate-850 rounded"
                  >
                    {formState.overallDiscountType === 'PERCENTAGE' ? '%' : (currencies.find(c => c.code === formState.currency)?.symbol || '₹')}
                  </button>
                </div>
              </div>

              {/* Cess Rate */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Cess Tax Rate (%)</label>
                <Input
                  type="number"
                  value={formState.cessRate}
                  onChange={(e) => actions.updateField('cessRate', parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm font-mono border-slate-350 dark:border-slate-800 dark:bg-slate-950 text-right focus:ring-2 focus:ring-sky-500/20"
                  placeholder="e.g. 1"
                />
              </div>

              {/* Reverse Charge Toggler */}
              <div className="space-y-2 text-left">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Reverse Charge</label>
                <div className="flex items-center gap-2.5 py-1.5">
                  <input
                    type="checkbox"
                    id="reverseCharge"
                    checked={formState.reverseCharge}
                    onChange={(e) => actions.updateField('reverseCharge', e.target.checked)}
                    className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="reverseCharge" className="text-xs font-semibold text-slate-650 select-none cursor-pointer">
                    Enable Reverse Charge (RCM)
                  </label>
                </div>
              </div>

            </div>

            {/* Grid for Bank Info summaries */}
            <div className="bg-slate-50/50 dark:bg-slate-950/20 p-4 border border-slate-150 dark:border-slate-850 rounded-xl space-y-3.5 text-xs text-left">
              <div className="flex justify-between items-center text-slate-500 font-semibold">
                <span>Total Items Subtotal:</span>
                <span className="font-mono text-slate-850 font-bold">
                  {formatCurrency(totals.subTotal, formState.currency)}
                </span>
              </div>
              
              {totals.discountTotal > 0 && (
                <div className="flex justify-between items-center text-red-500 font-semibold">
                  <span>Applied Discounts:</span>
                  <span className="font-mono font-bold">
                    -{formatCurrency(totals.discountTotal, formState.currency)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center text-slate-600 font-bold border-b border-slate-200/80 pb-2">
                <span>Taxable Amount (Pre-Tax):</span>
                <span className="font-mono text-slate-900">
                  {formatCurrency(totals.taxableAmount, formState.currency)}
                </span>
              </div>

              {/* Tax & Round Off breakdowns */}
              {formState.currency === 'INR' ? (
                <>
                  {totals.igstTotal > 0 ? (
                    <div className="flex justify-between items-center text-slate-500 font-mono text-[11px]">
                      <span>Interstate IGST:</span>
                      <span>{formatCurrency(totals.igstTotal, formState.currency)}</span>
                    </div>
                  ) : (
                    <>
                      {totals.cgstTotal > 0 && (
                        <div className="flex justify-between items-center text-slate-500 font-mono text-[11px]">
                          <span>Intrastate CGST:</span>
                          <span>{formatCurrency(totals.cgstTotal, formState.currency)}</span>
                        </div>
                      )}
                      {totals.sgstTotal > 0 && (
                        <div className="flex justify-between items-center text-slate-500 font-mono text-[11px]">
                          <span>Intrastate SGST:</span>
                          <span>{formatCurrency(totals.sgstTotal, formState.currency)}</span>
                        </div>
                      )}
                    </>
                  )}

                  {totals.cessTotal > 0 && (
                    <div className="flex justify-between items-center text-slate-500 font-mono text-[11px]">
                      <span>Cess Charge:</span>
                      <span>{formatCurrency(totals.cessTotal, formState.currency)}</span>
                    </div>
                  )}

                  {totals.roundOff !== 0 && (
                    <div className="flex justify-between items-center text-slate-450 font-mono text-[11px]">
                      <span>Rupee Round Off:</span>
                      <span>{totals.roundOff > 0 ? '+' : ''}{formatCurrency(totals.roundOff, formState.currency)}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {(totals.cgstTotal + totals.sgstTotal + totals.igstTotal + totals.cessTotal) > 0 && (
                    <div className="flex justify-between items-center text-slate-500 font-mono text-[11px]">
                      <span>Tax:</span>
                      <span>
                        {formatCurrency(
                          totals.cgstTotal + totals.sgstTotal + totals.igstTotal + totals.cessTotal,
                          formState.currency
                        )}
                      </span>
                    </div>
                  )}

                  {totals.roundOff !== 0 && (
                    <div className="flex justify-between items-center text-slate-450 font-mono text-[11px]">
                      <span>Round Off:</span>
                      <span>{totals.roundOff > 0 ? '+' : ''}{formatCurrency(totals.roundOff, formState.currency)}</span>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-between items-center text-slate-950 dark:text-white font-black text-sm bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-3 rounded-lg leading-none">
                <span className="text-emerald-800 dark:text-emerald-400 uppercase tracking-widest text-[10px]">Grand Total</span>
                <span className="font-mono text-lg text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totals.grandTotal, formState.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Card 6: Notes, Terms, and Custom Fields */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-5 shadow-sm space-y-6">
            <span className="text-xs font-black text-slate-800 dark:text-slate-250 uppercase tracking-wider block pb-1 border-b border-slate-100 dark:border-slate-850">
              5. Notes, Terms & Custom Fields
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Invoice Notes</label>
                <textarea
                  value={formState.notes}
                  onChange={(e) => actions.updateField('notes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-350 dark:border-slate-800 dark:bg-slate-950 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Terms & Conditions</label>
                <textarea
                  value={formState.terms}
                  onChange={(e) => actions.updateField('terms', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-350 dark:border-slate-800 dark:bg-slate-950 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Custom fields list */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Custom Fields</span>
                <button
                  type="button"
                  onClick={handleAddCustomField}
                  className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Field</span>
                </button>
              </div>

              {formState.customFields.length > 0 ? (
                <div className="space-y-2">
                  {formState.customFields.map((field, idx) => (
                    <div key={idx} className="flex gap-3 items-center">
                      <Input
                        type="text"
                        placeholder="Label (e.g. PO Number)"
                        value={field.key}
                        onChange={(e) => handleUpdateCustomField(idx, 'key', e.target.value)}
                        className="h-8 text-xs border-slate-300 dark:border-slate-850 dark:bg-slate-950 flex-1"
                      />
                      <Input
                        type="text"
                        placeholder="Value (e.g. PO-762)"
                        value={field.value}
                        onChange={(e) => handleUpdateCustomField(idx, 'value', e.target.value)}
                        className="h-8 text-xs border-slate-300 dark:border-slate-855 dark:bg-slate-950 flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomField(idx)}
                        className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-slate-450 italic text-left">No custom metadata tags added.</p>
              )}
            </div>
          </div>

          {/* Card 7: Recurring Settings */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-850">
              <span className="text-xs font-black text-slate-800 dark:text-slate-250 uppercase tracking-wider">
                6. Recurring Invoice Settings
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Make Recurring</span>
                <Switch
                  checked={isRecurring}
                  onCheckedChange={setIsRecurring}
                />
              </div>
            </div>

            {isRecurring && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 pt-1 overflow-hidden"
              >
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Template Name</label>
                  <Input
                    placeholder="e.g. Monthly Retainer Acme Corp"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="h-10 text-xs border-slate-350 dark:border-slate-850 dark:bg-slate-950 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Billing Frequency</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'] as const).map((freq) => (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => setRecurringFrequency(freq)}
                        className={`p-3 rounded-lg border text-xs font-bold transition-all text-center cursor-pointer ${
                          recurringFrequency === freq
                            ? 'border-sky-500 bg-sky-500/5 text-sky-700 dark:text-sky-400 font-extrabold ring-1 ring-sky-500'
                            : 'border-slate-200 dark:border-slate-850 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900/30'
                        }`}
                      >
                        {freq}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Schedule Start Date</label>
                    <Input
                      type="date"
                      value={recurringStartDate}
                      onChange={(e) => setRecurringStartDate(e.target.value)}
                      className="h-10 text-xs border-slate-350 dark:border-slate-850 dark:bg-slate-950 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Schedule End Date</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          id="no-end-date"
                          checked={noEndDate}
                          onChange={(e) => setNoEndDate(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-805"
                        />
                        <label htmlFor="no-end-date" className="text-[10px] font-semibold text-slate-450 cursor-pointer">
                          No end date
                        </label>
                      </div>
                    </div>
                    {!noEndDate && (
                      <Input
                        type="date"
                        value={recurringEndDate}
                        onChange={(e) => setRecurringEndDate(e.target.value)}
                        className="h-10 text-xs border-slate-350 dark:border-slate-850 dark:bg-slate-950 font-semibold"
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="gen-first-now"
                    checked={generateFirstNow}
                    onChange={(e) => setGenerateFirstNow(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 border-slate-300 dark:border-slate-800"
                  />
                  <label htmlFor="gen-first-now" className="text-xs font-bold text-slate-650 dark:text-slate-305 cursor-pointer text-left">
                    Generate the first invoice draft immediately on template save
                  </label>
                </div>
              </motion.div>
            )}
          </div>

          {/* Stick Action Footer */}
          <div className="sticky bottom-0 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-md p-4 border border-slate-200/80 dark:border-slate-800/80 rounded-xl flex gap-3 z-10 shadow-lg justify-between select-none">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting || !isValid}
                onClick={() => handleSaveInvoice('DRAFT')}
                className="h-10 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-850 cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Save className="w-4 h-4 text-slate-500" />
                <span>Save Draft</span>
              </Button>

              <Button
                type="button"
                disabled={isSubmitting || !isValid}
                onClick={() => handleSaveInvoice('SENT')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-5 gap-1.5 shadow-sm rounded-lg cursor-pointer text-xs flex items-center"
              >
                <Send className="w-4 h-4" />
                <span>Create & Send</span>
              </Button>
            </div>

            {/* Mobile Preview Toggle Button */}
            <Button
              type="button"
              onClick={() => setShowPreviewMobile(true)}
              className="lg:hidden h-10 w-10 p-0 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-650 cursor-pointer flex items-center justify-center bg-white dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-850"
              title="View Preview"
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>

        </div>

        {/* RIGHT PREVIEW COLUMN (45% or 9/20 span) */}
        <div className="hidden lg:block lg:col-span-9 lg:sticky lg:top-[80px]">
          <InvoicePreview
            invoice={formState}
            totals={totals}
            business={activeBusiness}
            client={selectedClientObj}
            template={formState.template}
            className="h-[calc(100vh-120px)]"
          />
        </div>

      </div>

      {/* QUICK CLIENT DIALOG */}
      <ClientForm
        open={isQuickClientOpen}
        onOpenChange={setIsQuickClientOpen}
        onSubmit={handleQuickClientSubmit}
        isLoading={clientSaving}
      />

      {/* ITEM CATALOG DIALOG */}
      <ItemCatalogSelector
        open={isCatalogOpen}
        onOpenChange={setIsCatalogOpen}
        onSelect={handleCatalogSelect}
        businessId={activeBusiness?.id}
      />

      {/* MOBILE PREVIEW SLIDE UP SHEET / DIALOG */}
      <Dialog open={showPreviewMobile} onOpenChange={setShowPreviewMobile}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-start">
          <DialogHeader className="mb-2 select-none text-left">
            <DialogTitle className="text-sm font-bold text-slate-900 dark:text-slate-50">
              Live Document Preview
            </DialogTitle>
          </DialogHeader>

          <InvoicePreview
            invoice={formState}
            totals={totals}
            business={activeBusiness}
            client={selectedClientObj}
            template={formState.template}
            className="h-full min-h-[450px]"
          />
        </DialogContent>
      </Dialog>

    </div>
  );
}
