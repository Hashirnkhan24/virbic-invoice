'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Check, FileSpreadsheet, Package, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency } from '@/lib/helpers';
import { toast } from 'sonner';

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  hsnCode: string | null;
  rate: number;
  gstRate: number;
  unit: string;
}

interface ItemCatalogSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: CatalogItem) => void;
  businessId?: string | null;
}

export default function ItemCatalogSelector({
  open,
  onOpenChange,
  onSelect,
  businessId,
}: ItemCatalogSelectorProps) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // New item form state
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    hsnCode: '',
    rate: '',
    gstRate: '18',
    unit: 'PCS',
  });
  const [savingItem, setSavingItem] = useState(false);

  // Fetch catalog items
  const fetchItems = async (searchQuery = '') => {
    setLoading(true);
    try {
      const url = searchQuery
        ? `/api/items?search=${encodeURIComponent(searchQuery)}`
        : '/api/items';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (e) {
      console.error('Failed to fetch catalog items', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchItems(search);
      setIsCreatingNew(false);
    }
  }, [open, search]);

  const handleSelectItem = (item: CatalogItem) => {
    onSelect(item);
    onOpenChange(false);
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name.trim()) {
      toast.error('Item name is required');
      return;
    }
    
    setSavingItem(true);
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newItem,
          rate: parseFloat(newItem.rate) || 0,
          gstRate: parseFloat(newItem.gstRate) || 18,
          businessId: businessId || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success('Product added to catalog successfully!');
        
        // Auto-select the newly created item
        handleSelectItem(data.item);
        
        // Reset form
        setNewItem({
          name: '',
          description: '',
          hsnCode: '',
          rate: '',
          gstRate: '18',
          unit: 'PCS',
        });
        setIsCreatingNew(false);
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Failed to create catalog item');
      }
    } catch (e) {
      console.error(e);
      toast.error('An error occurred while saving the item');
    } finally {
      setSavingItem(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 overflow-hidden">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-50">
            {isCreatingNew ? 'Create Catalog Product' : 'Product & Item Catalog'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {isCreatingNew
              ? 'Add a reusable item to your inventory catalog for fast auto-fills.'
              : 'Search and import items from your catalog directly into your active invoice.'}
          </DialogDescription>
        </DialogHeader>

        {isCreatingNew ? (
          /* CREATE NEW ITEM FORM */
          <form onSubmit={handleCreateItem} className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Product/Service Name <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Premium Web Development"
                  value={newItem.name}
                  onChange={(e) => setNewItem((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full text-sm border-slate-350 dark:border-slate-800 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Description
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Design, Coding, and Deployment phases"
                  value={newItem.description}
                  onChange={(e) => setNewItem((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full text-sm border-slate-350 dark:border-slate-800 dark:bg-slate-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    HSN/SAC Code
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. 998313"
                    value={newItem.hsnCode}
                    onChange={(e) => setNewItem((prev) => ({ ...prev, hsnCode: e.target.value }))}
                    className="w-full text-sm font-mono border-slate-350 dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Base Rate (Price)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 15000"
                    value={newItem.rate}
                    onChange={(e) => setNewItem((prev) => ({ ...prev, rate: e.target.value }))}
                    className="w-full text-sm font-mono border-slate-350 dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Default GST Rate (%)
                  </label>
                  <select
                    value={newItem.gstRate}
                    onChange={(e) => setNewItem((prev) => ({ ...prev, gstRate: e.target.value }))}
                    className="w-full h-8 text-sm px-3 py-1 bg-white border border-slate-350 dark:border-slate-800 dark:bg-slate-950 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="0">0% (Exempt)</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Billing Unit
                  </label>
                  <select
                    value={newItem.unit}
                    onChange={(e) => setNewItem((prev) => ({ ...prev, unit: e.target.value }))}
                    className="w-full h-8 text-sm px-3 py-1 bg-white border border-slate-350 dark:border-slate-800 dark:bg-slate-950 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="PCS">PCS (Pieces)</option>
                    <option value="HRS">HRS (Hours)</option>
                    <option value="DAYS">DAYS (Days)</option>
                    <option value="NOS">NOS (Numbers)</option>
                    <option value="BOX">BOX (Boxes)</option>
                    <option value="SET">SET (Sets)</option>
                    <option value="OTH">OTH (Others)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreatingNew(false)}
                className="text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer"
              >
                Back to List
              </Button>
              <Button
                type="submit"
                disabled={savingItem}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 cursor-pointer"
              >
                {savingItem ? 'Saving...' : 'Add & Select Product'}
              </Button>
            </div>
          </form>
        ) : (
          /* LIST AND SEARCH ITEMS */
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search catalog items..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border-slate-300 dark:border-slate-800 dark:bg-slate-950 rounded-lg focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <Button
                onClick={() => setIsCreatingNew(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-8 text-xs gap-1 cursor-pointer flex-shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Item</span>
              </Button>
            </div>

            <ScrollArea className="flex-1 max-h-[40vh] border border-slate-100 dark:border-slate-850 rounded-xl overflow-hidden shadow-inner">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-450 space-y-2 animate-pulse">
                  <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mb-1" />
                  <span className="text-xs">Loading catalog registry...</span>
                </div>
              ) : items.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-850 bg-white dark:bg-slate-900">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectItem(item)}
                      className="w-full text-left p-3.5 hover:bg-slate-50 dark:hover:bg-slate-850/50 flex items-center justify-between transition-colors duration-150 cursor-pointer"
                    >
                      <div className="space-y-1 pr-4 overflow-hidden">
                        <h4 className="text-sm font-bold text-slate-850 dark:text-slate-100 truncate">
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                          {item.hsnCode && (
                            <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                              HSN: {item.hsnCode}
                            </span>
                          )}
                          <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                            GST: {item.gstRate}%
                          </span>
                          <span>Unit: {item.unit}</span>
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-slate-450 truncate">{item.description}</p>
                        )}
                      </div>
                      
                      <div className="flex-shrink-0 text-right">
                        <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 font-mono">
                          {formatCurrency(item.rate)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2 bg-slate-50/20">
                  <Package className="w-10 h-10 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-500">
                    {search ? 'No matching products found' : 'Your product catalog is empty'}
                  </p>
                  {!search && (
                    <Button
                      variant="link"
                      onClick={() => setIsCreatingNew(true)}
                      className="text-xs font-bold text-emerald-600 dark:text-emerald-450 cursor-pointer"
                    >
                      Add your first catalog item
                    </Button>
                  )}
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
