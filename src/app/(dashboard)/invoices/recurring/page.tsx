'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Play,
  Pause,
  Trash2,
  Sparkles,
  Calendar,
  Loader2,
  AlertCircle,
  Clock,
  ArrowRight,
  User,
  ArrowLeft,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatDate } from '@/lib/helpers';
import StatusBadge from '@/components/shared/StatusBadge';

interface RecurringTemplate {
  id: string;
  templateName: string;
  recurringFrequency: string;
  recurringStartDate: string;
  recurringEndDate: string | null;
  nextDueDate: string | null;
  recurringStatus: 'ACTIVE' | 'PAUSED';
  createdAt: string;
  client: {
    name: string;
  };
}

export default function RecurringInvoicesPage() {
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Editing template local states
  const [editingTemplate, setEditingTemplate] = useState<RecurringTemplate | null>(null);
  const [editName, setEditName] = useState('');
  const [editFreq, setEditFreq] = useState('MONTHLY');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editNoEnd, setEditNoEnd] = useState(true);
  const [isEditingSaving, setIsEditingSaving] = useState(false);

  // Manual generation loader state
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/invoices/recurring');
      if (!res.ok) throw new Error('Failed to load templates');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Could not load recurring templates.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const action = currentStatus === 'ACTIVE' ? 'pause' : 'resume';
    // Optimistic UI update
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, recurringStatus: action === 'pause' ? 'PAUSED' : 'ACTIVE' } : t
      )
    );

    try {
      const res = await fetch('/api/invoices/recurring', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (!res.ok) throw new Error('Failed to update template status');
      toast.success(action === 'pause' ? 'Billing schedule paused' : 'Billing schedule resumed');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to change status.');
      fetchTemplates(); // Rollback
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recurring template? No further invoices will be generated.')) {
      return;
    }

    try {
      const res = await fetch(`/api/invoices/recurring?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete template');
      toast.success('Template deleted.');
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to delete template.');
    }
  };

  const handleGenerateNow = async (id: string) => {
    setGeneratingId(id);
    try {
      const res = await fetch('/api/invoices/recurring/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate');

      toast.success(`Generated Invoice ${data.invoice.invoiceNumber}!`);
      fetchTemplates(); // Refresh to update nextDueDate
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Generation failed.');
    } finally {
      setGeneratingId(null);
    }
  };

  const handleOpenEdit = (t: RecurringTemplate) => {
    setEditingTemplate(t);
    setEditName(t.templateName);
    setEditFreq(t.recurringFrequency);
    setEditStart(t.recurringStartDate ? t.recurringStartDate.split('T')[0] : '');
    setEditEnd(t.recurringEndDate ? t.recurringEndDate.split('T')[0] : '');
    setEditNoEnd(!t.recurringEndDate);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;
    if (!editName.trim()) {
      toast.error('Please enter a Template Name.');
      return;
    }

    setIsEditingSaving(true);
    try {
      const res = await fetch('/api/invoices/recurring', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTemplate.id,
          templateName: editName.trim(),
          recurringFrequency: editFreq,
          recurringStartDate: editStart,
          recurringEndDate: editNoEnd ? null : editEnd,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save changes');

      toast.success('Template schedule updated!');
      setTemplates((prev) =>
        prev.map((t) => (t.id === editingTemplate.id ? data.template : t))
      );
      setEditingTemplate(null);
      fetchTemplates(); // Full reload to refresh nested relations
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to save edits.');
    } finally {
      setIsEditingSaving(false);
    }
  };

  const getTemplateStatus = (t: RecurringTemplate) => {
    if (t.recurringStatus === 'PAUSED') return 'PAUSED';
    if (t.recurringEndDate && new Date(t.recurringEndDate) < new Date()) return 'EXPIRED';
    return 'ACTIVE';
  };

  const getStatusColor = (status: string) => {
    if (status === 'ACTIVE') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400';
    if (status === 'PAUSED') return 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400';
    return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 p-4 text-left">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-slate-200/60 dark:border-slate-800/85">
        <div className="space-y-1">
          <Link
            href="/invoices"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-350 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Invoices</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
            Recurring Invoices
          </h1>
          <p className="text-xs text-slate-500">
            Set up automatic blueprints to periodically issue and dispatch tax invoices to clients.
          </p>
        </div>

        <Link href="/invoices/new?recurring=true">
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold h-9 cursor-pointer shadow-md shadow-emerald-500/10">
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Create Recurring Template</span>
          </Button>
        </Link>
      </div>

      {/* Templates List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-100 dark:bg-slate-900 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="border border-slate-200 dark:border-slate-850 rounded-2xl p-12 text-center max-w-lg mx-auto space-y-6 mt-12 bg-white dark:bg-slate-900">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center mx-auto border border-emerald-100 dark:border-emerald-900/50 shadow-inner">
            <Clock className="w-8 h-8 text-emerald-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
              No Recurring Templates
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Automate billing cycles for retainers, service contracts, and monthly fees. Blueprints will clone and increment invoice numbering automatically.
            </p>
          </div>
          <Link href="/invoices/new?recurring=true">
            <Button className="h-9 font-bold text-xs bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer">
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Configure Your First Template</span>
            </Button>
          </Link>
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 font-extrabold text-slate-805 dark:text-slate-200">
                <th className="p-3.5">Template Name</th>
                <th className="p-3.5">Client</th>
                <th className="p-3.5">Frequency</th>
                <th className="p-3.5">Next Invoice Date</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-600 dark:text-slate-350">
              {templates.map((t) => {
                const status = getTemplateStatus(t);
                return (
                  <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                    <td className="p-3.5 font-bold text-slate-850 dark:text-slate-100">
                      {t.templateName}
                    </td>
                    <td className="p-3.5 flex items-center gap-1.5 pt-4">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{t.client?.name || 'Unknown'}</span>
                    </td>
                    <td className="p-3.5">
                      <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider">
                        {t.recurringFrequency}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-500">
                      {t.nextDueDate ? formatDate(new Date(t.nextDueDate)) : 'Finished'}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${getStatusColor(status)}`}>
                        {status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        {/* Run manually */}
                        {status === 'ACTIVE' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleGenerateNow(t.id)}
                            disabled={generatingId === t.id}
                            className="h-8 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 cursor-pointer"
                            title="Generate invoice draft now"
                          >
                            {generatingId === t.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Play className="w-3.5 h-3.5" />
                            )}
                            <span className="ml-1">Generate</span>
                          </Button>
                        )}

                        {/* Pause / Resume */}
                        {status !== 'EXPIRED' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleStatus(t.id, t.recurringStatus)}
                            className={`h-8 text-[10px] font-bold cursor-pointer ${
                              t.recurringStatus === 'ACTIVE'
                                ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20'
                                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                            }`}
                          >
                            {t.recurringStatus === 'ACTIVE' ? (
                              <>
                                <Pause className="w-3.5 h-3.5 mr-1" />
                                <span>Pause</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 mr-1" />
                                <span>Resume</span>
                              </>
                            )}
                          </Button>
                        )}

                        {/* Edit */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(t)}
                          className="h-8 text-[10px] font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Settings className="w-3.5 h-3.5 mr-1" />
                          <span>Schedule</span>
                        </Button>

                        {/* Delete */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteTemplate(t.id)}
                          className="h-8 text-[10px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── DIALOG: EDIT SCHEDULE ── */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="sm:max-w-[450px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl text-left">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-50 tracking-tight text-left">
              Update Billing Schedule
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 text-left">
              Modify the templates billing name, run dates, or frequency periods.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4 pt-2 text-left">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wide">
                Template Name
              </label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="h-10 text-xs border-slate-300 dark:border-slate-800 dark:bg-slate-950 font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wide">
                Billing Frequency
              </label>
              <select
                value={editFreq}
                onChange={(e) => setEditFreq(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold"
              >
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wide">
                  Schedule Start Date
                </label>
                <Input
                  type="date"
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                  className="h-9 text-xs border-slate-300 dark:border-slate-800 dark:bg-slate-950 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">
                    End Date
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      id="edit-no-end-date"
                      checked={editNoEnd}
                      onChange={(e) => setEditNoEnd(e.target.checked)}
                      className="w-3 h-3 rounded"
                    />
                    <label htmlFor="edit-no-end-date" className="text-[10px] font-semibold text-slate-450 cursor-pointer">
                      No end
                    </label>
                  </div>
                </div>
                {!editNoEnd && (
                  <Input
                    type="date"
                    value={editEnd}
                    onChange={(e) => setEditEnd(e.target.value)}
                    className="h-9 text-xs border-slate-300 dark:border-slate-800 dark:bg-slate-950 font-semibold"
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingTemplate(null)}
                className="h-9 font-bold text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isEditingSaving}
                className="h-9 font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer"
              >
                {isEditingSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Update Schedule</span>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
