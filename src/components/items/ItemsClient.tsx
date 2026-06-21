'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Package,
  FileSpreadsheet,
  Download,
  BookOpen,
  X,
  Sparkles,
  Info,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { formatCurrency } from '@/lib/helpers';
import { toast } from 'sonner';
import ItemForm from './ItemForm';

interface Business {
  id: string;
  name: string;
  currency: string;
}

interface Item {
  id: string;
  name: string;
  description: string | null;
  hsnCode: string | null;
  rate: number;
  gstRate: number;
  unit: string;
  isService: boolean;
  businessId: string | null;
}

interface ItemsClientProps {
  businesses: Business[];
}

export default function ItemsClient({ businesses }: ItemsClientProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'goods' | 'services'>('all');

  // Banner dismissible state
  const [showBanner, setShowBanner] = useState(true);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [duplicateSource, setDuplicateSource] = useState<Item | null>(null);

  // Delete dialog states
  const [deleteItem, setDeleteItem] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Sidebar reference guide state
  const [showGuide, setShowGuide] = useState(false);

  // Check localStorage for banner preference
  useEffect(() => {
    const bannerPref = localStorage.getItem('virbic_hide_items_banner');
    if (bannerPref === 'true') {
      setShowBanner(false);
    }
  }, []);

  const dismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem('virbic_hide_items_banner', 'true');
  };

  // Fetch items
  const fetchItems = async () => {
    setLoading(true);
    try {
      const activeBizId = localStorage.getItem('active_business_id')?.replace(/^"|"$/g, '');
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (activeBizId) params.append('businessId', activeBizId);

      const url = `/api/items?${params.toString()}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to fetch items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [search]);

  // Filter items client-side based on type (Goods/Services)
  const filteredItems = items.filter((item) => {
    if (typeFilter === 'goods') return !item.isService;
    if (typeFilter === 'services') return item.isService;
    return true;
  });

  // Export items to CSV
  const handleExportCSV = () => {
    if (filteredItems.length === 0) {
      toast.error('No items available to export.');
      return;
    }

    const headers = ['Name', 'Description', 'Type', 'Rate', 'Unit', 'GST Rate (%)', 'HSN/SAC Code'];
    const rows = filteredItems.map((item) => [
      `"${item.name.replace(/"/g, '""')}"`,
      `"${(item.description || '').replace(/"/g, '""')}"`,
      item.isService ? 'Service' : 'Product',
      item.rate,
      item.unit,
      item.gstRate,
      `"${item.hsnCode || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `virbic_catalog_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Catalog exported successfully.');
  };

  // Delete item handler
  const handleDeleteConfirm = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/items/${deleteItem.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Product/service deleted successfully.');
        setItems(items.filter((i) => i.id !== deleteItem.id));
        setDeleteItem(null);
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Failed to delete item');
      }
    } catch (e) {
      console.error(e);
      toast.error('An error occurred during deletion.');
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateNewClick = () => {
    setEditingItem(null);
    setDuplicateSource(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (item: Item) => {
    setEditingItem(item);
    setDuplicateSource(null);
    setIsFormOpen(true);
  };

  const handleDuplicateClick = (item: Item) => {
    setEditingItem(null);
    setDuplicateSource(item);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 text-left flex flex-col lg:flex-row gap-6 items-start">
      {/* ── Main Catalog Column (flex-1) ── */}
      <div className="flex-1 w-full space-y-6">
        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-slate-200/60 dark:border-slate-800/80">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
              Products & Services Catalog
            </h1>
            <p className="text-xs text-slate-500">
              Configure items once, calculate taxes correctly, and create invoices in 60 seconds.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGuide(!showGuide)}
              className="h-9 text-xs font-bold border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-950 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 mr-1.5" />
              <span>{showGuide ? 'Hide Tax Guide' : 'Show Tax Guide'}</span>
            </Button>

            <Button
              size="sm"
              onClick={handleCreateNewClick}
              className="h-9 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer shadow-md shadow-emerald-500/10"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Add Item</span>
            </Button>
          </div>
        </div>

        {/* ── Dismissible UX Educational Banner ── */}
        {showBanner && (
          <Card className="p-4 border border-sky-100 bg-sky-50/40 dark:border-sky-950/40 dark:bg-sky-950/10 rounded-xl relative flex items-start gap-3.5 shadow-sm">
            <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="space-y-1 pr-8">
              <h4 className="text-xs font-extrabold text-slate-850 dark:text-slate-100 uppercase tracking-wider">
                Why maintain a catalog?
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
                Instead of typing line item descriptions and computing CGST/SGST/IGST tax rates manually for each invoice, add them to your catalog here. When billing, simply select the item to auto-fill the rates, units, and GSTR-compliant HSN/SAC codes instantly. This eliminates math errors and saves minutes per invoice.
              </p>
            </div>
            <button
              onClick={dismissBanner}
              className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </Card>
        )}

        {/* ── Filters & Tools Row ── */}
        <Card className="p-3 border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 rounded-xl shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center w-full">
            <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto flex-1">
              {/* Search Bar */}
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name or HSN code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs font-semibold bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 rounded-lg w-full"
                />
              </div>

              {/* Type selector tab filter */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg w-full sm:w-auto">
                <button
                  onClick={() => setTypeFilter('all')}
                  className={`flex-1 sm:flex-none px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                    typeFilter === 'all'
                      ? 'bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
                  }`}
                >
                  All Items
                </button>
                <button
                  onClick={() => setTypeFilter('services')}
                  className={`flex-1 sm:flex-none px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                    typeFilter === 'services'
                      ? 'bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
                  }`}
                >
                  Services
                </button>
                <button
                  onClick={() => setTypeFilter('goods')}
                  className={`flex-1 sm:flex-none px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                    typeFilter === 'goods'
                      ? 'bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
                  }`}
                >
                  Products
                </button>
              </div>
            </div>

            {/* CSV Actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="h-9 text-xs font-bold border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-950 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                <span>Export CSV</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* ── Table Grid Card ── */}
        <Card className="border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-950/10">
                <TableRow className="border-slate-200 dark:border-slate-800 text-[10px] font-extrabold text-slate-800 dark:text-slate-200">
                  <TableHead className="w-[30%]">Item Name & Desc</TableHead>
                  <TableHead className="w-20 text-center">Type</TableHead>
                  <TableHead className="w-24 text-center">HSN/SAC</TableHead>
                  <TableHead className="text-right w-28">Default Rate</TableHead>
                  <TableHead className="w-20 text-center">Unit</TableHead>
                  <TableHead className="text-right w-24">GST Rate</TableHead>
                  <TableHead className="w-32 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-[11px] font-semibold text-slate-650 dark:text-slate-350 divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  [1, 2, 3].map((i) => (
                    <TableRow key={i} className="animate-pulse border-slate-100 dark:border-slate-850">
                      <TableCell><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-48" /></TableCell>
                      <TableCell><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-12 mx-auto" /></TableCell>
                      <TableCell><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-16 mx-auto" /></TableCell>
                      <TableCell><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-20 ml-auto" /></TableCell>
                      <TableCell><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-8 mx-auto" /></TableCell>
                      <TableCell><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-12 ml-auto" /></TableCell>
                      <TableCell><div className="h-8 bg-slate-100 dark:bg-slate-800 rounded w-24 mx-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-450 italic">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Package className="w-8 h-8 text-slate-300 dark:text-slate-700 animate-bounce" />
                        <p>No items found in your catalog.</p>
                        <p className="text-[10px] text-slate-400 not-italic">Click &quot;Add Item&quot; to configure your first product or service.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id} className="border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-850 dark:text-slate-100 text-xs">{item.name}</p>
                          {item.description && (
                            <p className="text-[10px] text-slate-400 font-normal truncate max-w-sm">{item.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          item.isService
                            ? 'bg-violet-50 text-violet-750 dark:bg-violet-950/30 dark:text-violet-400 border border-violet-200/30 dark:border-violet-900/30'
                            : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/30 dark:border-emerald-900/30'
                        }`}>
                          {item.isService ? 'Service' : 'Product'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold tracking-tight text-slate-800 dark:text-slate-200">
                        {item.hsnCode || <span className="text-slate-300 dark:text-slate-700">-</span>}
                      </TableCell>
                      <TableCell className="text-right font-black text-slate-850 dark:text-slate-100">
                        {formatCurrency(item.rate, 'INR')}
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-500">{item.unit}</TableCell>
                      <TableCell className="text-right font-bold text-slate-800 dark:text-slate-150">
                        {item.gstRate}%
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(item)}
                            className="w-7 h-7 hover:bg-slate-50 dark:hover:bg-slate-950 cursor-pointer text-slate-500 hover:text-emerald-500 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
                            title="Edit Item"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDuplicateClick(item)}
                            className="w-7 h-7 hover:bg-slate-50 dark:hover:bg-slate-950 cursor-pointer text-slate-500 hover:text-sky-500 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
                            title="Duplicate Item"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteItem(item)}
                            className="w-7 h-7 hover:bg-slate-50 dark:hover:bg-slate-950 cursor-pointer text-slate-400 hover:text-red-500 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
                            title="Delete Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* ── Sidebar compliance Reference Guide (Right Column) ── */}
      {showGuide && (
        <Card className="w-full lg:w-72 p-5 border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 rounded-xl shadow-sm space-y-4 shrink-0 transition-all animate-in slide-in-from-right-4 duration-300">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-100">
              <BookOpen className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-black uppercase tracking-wider">GST Reference Guide</h3>
            </div>
            <button
              onClick={() => setShowGuide(false)}
              className="p-0.5 rounded-lg text-slate-400 hover:text-slate-650 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-semibold">
            {/* Jargon Busters */}
            <div className="space-y-1 bg-slate-50 dark:bg-slate-950/20 p-2.5 rounded-lg">
              <h4 className="text-[10px] font-black uppercase text-slate-850 dark:text-slate-200 flex items-center gap-1">
                <Info className="w-3 h-3 text-sky-500" />
                <span>What is HSN vs. SAC?</span>
              </h4>
              <p className="text-[10px] font-semibold text-slate-500 mt-1 leading-normal">
                <strong>HSN</strong> (Harmonized System Nomenclature) is a 6-to-8 digit code used for physical **Goods**. 
                <br />
                <strong>SAC</strong> (Service Accounting Code) is a 6-digit code used for **Services**.
              </p>
            </div>

            {/* SAC Codes directory */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Common Freelancer SAC Codes</h4>
              
              <div className="space-y-1.5">
                {/* SAC 1 */}
                <div className="border border-slate-100 dark:border-slate-800/80 p-2 rounded-lg space-y-0.5 bg-white dark:bg-slate-950/10">
                  <div className="flex justify-between font-bold text-slate-800 dark:text-slate-100 text-[11px]">
                    <span>IT / Software Dev</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 rounded">998314</span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-semibold leading-normal">Software consulting, coding, design, and systems analysis.</p>
                </div>
                {/* SAC 2 */}
                <div className="border border-slate-100 dark:border-slate-800/80 p-2 rounded-lg space-y-0.5 bg-white dark:bg-slate-950/10">
                  <div className="flex justify-between font-bold text-slate-800 dark:text-slate-100 text-[11px]">
                    <span>Management Consulting</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 rounded">998311</span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-semibold leading-normal">Business advising, consulting, strategy coaching.</p>
                </div>
                {/* SAC 3 */}
                <div className="border border-slate-100 dark:border-slate-800/80 p-2 rounded-lg space-y-0.5 bg-white dark:bg-slate-950/10">
                  <div className="flex justify-between font-bold text-slate-800 dark:text-slate-100 text-[11px]">
                    <span>Creative & Design</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 rounded">998313</span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-semibold leading-normal">Web design, UI/UX, graphic design, illustration work.</p>
                </div>
                {/* SAC 4 */}
                <div className="border border-slate-100 dark:border-slate-800/80 p-2 rounded-lg space-y-0.5 bg-white dark:bg-slate-950/10">
                  <div className="flex justify-between font-bold text-slate-800 dark:text-slate-100 text-[11px]">
                    <span>Advertising & Marketing</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 rounded">998381</span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-semibold leading-normal">SEO, social media marketing, advertising campaigns.</p>
                </div>
              </div>
            </div>

            {/* GST Slab Guide */}
            <div className="space-y-1 border-t border-slate-100 dark:border-slate-800 pt-3">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Standard GST Rates</h4>
              <ul className="space-y-1 text-[10px] list-disc list-inside text-slate-500">
                <li><strong className="text-slate-800 dark:text-slate-200">18% GST:</strong> Standard rate for most technical & professional services in India.</li>
                <li><strong className="text-slate-800 dark:text-slate-200">0% (Zero-rated):</strong> Applied to international export sales if you file a LUT (Letter of Undertaking) with the GST portal.</li>
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* ── Form Modal Drawer ── */}
      <ItemForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        initialData={editingItem}
        duplicateSource={duplicateSource}
        businesses={businesses}
        onSuccess={fetchItems}
      />

      {/* ── Delete Confirmation dialog ── */}
      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
        title="Delete Catalog Item"
        description={`Are you sure you want to permanently delete "${deleteItem?.name}" from your catalog? This action will not delete historical invoices using this product.`}
        onConfirm={handleDeleteConfirm}
        isLoading={deleting}
      />
    </div>
  );
}
