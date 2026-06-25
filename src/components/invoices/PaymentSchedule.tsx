import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/helpers';

interface Milestone {
  description: string;
  percentage: number;
  dueDate: string;
}

interface PaymentScheduleProps {
  grandTotal: number;
  currency: string;
  issueDate: Date;
  dueDate: Date;
  notes: string;
  onChangeNotes: (val: string) => void;
}

export default function PaymentSchedule({
  grandTotal,
  currency,
  issueDate,
  dueDate,
  notes,
  onChangeNotes,
}: PaymentScheduleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [requireAdvance, setRequireAdvance] = useState(false);
  const [termsType, setTermsType] = useState<string>('full'); // full, 50_50, 25_75, custom
  const [milestones, setMilestones] = useState<Milestone[]>([
    { description: 'Advance Payment', percentage: 50, dueDate: issueDate.toISOString().split('T')[0] },
    { description: 'Final Settlement', percentage: 50, dueDate: dueDate.toISOString().split('T')[0] },
  ]);

  // Generate schedule text based on settings
  const generateScheduleText = (type: string, reqAdv: boolean, customMilestones: Milestone[]) => {
    const formattedTotal = formatCurrency(grandTotal, currency);
    
    if (type === 'full') {
      if (reqAdv) {
        const advAmt = formatCurrency(grandTotal * 0.5, currency);
        const balAmt = formatCurrency(grandTotal * 0.5, currency);
        return `Payment Terms:\n- 50% Advance (${advAmt}) due immediately on ${formatDate(issueDate)}.\n- 50% Balance (${balAmt}) due on ${formatDate(dueDate)}.`;
      }
      return ''; // No schedule notes, default terms
    }

    if (type === '50_50') {
      const advAmt = formatCurrency(grandTotal * 0.5, currency);
      const balAmt = formatCurrency(grandTotal * 0.5, currency);
      return `Payment Terms:\n- 50% Advance (${advAmt}) due on ${formatDate(issueDate)}.\n- 50% Balance (${balAmt}) due on ${formatDate(dueDate)}.`;
    }

    if (type === '25_75') {
      const advAmt = formatCurrency(grandTotal * 0.25, currency);
      const balAmt = formatCurrency(grandTotal * 0.75, currency);
      return `Payment Terms:\n- 25% Advance (${advAmt}) due on ${formatDate(issueDate)}.\n- 75% Balance (${balAmt}) due on ${formatDate(dueDate)}.`;
    }

    if (type === 'custom') {
      const lines = ['Payment Terms (Milestone Schedule):'];
      let totalPercentage = 0;
      
      customMilestones.forEach((m) => {
        const amt = formatCurrency(grandTotal * (m.percentage / 100), currency);
        const dateStr = m.dueDate ? formatDate(new Date(m.dueDate)) : 'delivery';
        lines.push(`- ${m.percentage}% ${m.description || 'Milestone'} (${amt}) due on ${dateStr}`);
        totalPercentage += m.percentage;
      });

      return lines.join('\n');
    }

    return '';
  };

  // Sync checkbox with preset dropdown
  const handleCheckboxChange = (checked: boolean) => {
    setRequireAdvance(checked);
    if (checked && termsType === 'full') {
      setTermsType('50_50');
    } else if (!checked && termsType === '50_50') {
      setTermsType('full');
    }
  };

  const handleTermsTypeChange = (value: string) => {
    setTermsType(value);
    if (value === '50_50' || value === '25_75' || value === 'custom') {
      setRequireAdvance(true);
    } else {
      setRequireAdvance(false);
    }
  };

  const addMilestone = () => {
    const totalCurrentPct = milestones.reduce((sum, m) => sum + m.percentage, 0);
    const remainingPct = Math.max(0, 100 - totalCurrentPct);
    setMilestones([
      ...milestones,
      {
        description: `Milestone ${milestones.length + 1}`,
        percentage: remainingPct,
        dueDate: dueDate.toISOString().split('T')[0],
      },
    ]);
  };

  const removeMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const updateMilestone = (index: number, field: keyof Milestone, value: any) => {
    const updated = milestones.map((m, i) => {
      if (i !== index) return m;
      return {
        ...m,
        [field]: field === 'percentage' ? parseFloat(value) || 0 : value,
      };
    });
    setMilestones(updated);
  };

  // Trigger update to invoice notes when settings change
  useEffect(() => {
    const newText = generateScheduleText(termsType, requireAdvance, milestones);
    
    // Update notes if it's currently empty, matches a previous terms generation, or is the default note
    const defaultNotes = ['Thank you for your business!', 'GST not applicable for foreign currency invoices', ''];
    const isPreviousTerms = notes.includes('Payment Terms:') || notes.includes('Payment Terms (Milestone Schedule):');
    
    if (defaultNotes.includes(notes.trim()) || isPreviousTerms) {
      if (newText) {
        onChangeNotes(newText);
      } else {
        // Reset to default if full payment selected
        onChangeNotes('Thank you for your business!');
      }
    }
  }, [termsType, requireAdvance, milestones, grandTotal, currency, issueDate, dueDate]);

  const totalPercentage = milestones.reduce((sum, m) => sum + m.percentage, 0);
  const isPercentageValid = totalPercentage === 100;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-xl shadow-sm overflow-hidden transition-all">
      {/* Collapsible Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left focus:outline-none cursor-pointer hover:bg-slate-50/20 dark:hover:bg-slate-950/20"
      >
        <div className="space-y-0.5">
          <span className="text-xs font-black text-slate-800 dark:text-slate-250 uppercase tracking-wider block">
            4. Payment Schedule (Optional)
          </span>
          <p className="text-[10px] text-slate-455">
            Configure advance deposits or milestone payment instructions to display in invoice notes.
          </p>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {/* Expanded Controls */}
      {isOpen && (
        <div className="p-5 border-t border-slate-100 dark:border-slate-850 space-y-5 animate-fade-in text-left">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Quick Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="require-advance"
                checked={requireAdvance}
                onCheckedChange={handleCheckboxChange}
                className="accent-emerald-500 cursor-pointer"
              />
              <label
                htmlFor="require-advance"
                className="text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer select-none"
              >
                Require advance payment deposit
              </label>
            </div>

            {/* Payment Terms Select */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-450">Payment Terms:</span>
              <Select value={termsType} onValueChange={(val) => handleTermsTypeChange(val || 'full')}>
                <SelectTrigger className="w-[200px] text-xs font-semibold border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 h-8">
                  <SelectValue placeholder="Select terms..." />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border dark:border-slate-800">
                  <SelectItem value="full" className="text-xs font-semibold cursor-pointer">Full payment on delivery</SelectItem>
                  <SelectItem value="50_50" className="text-xs font-semibold cursor-pointer">50% advance / 50% delivery</SelectItem>
                  <SelectItem value="25_75" className="text-xs font-semibold cursor-pointer">25% advance / 75% delivery</SelectItem>
                  <SelectItem value="custom" className="text-xs font-semibold cursor-pointer">Custom milestones...</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom Milestone editor */}
          {termsType === 'custom' && (
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-850 bg-slate-50/30 dark:bg-slate-950/10 p-4 rounded-xl">
              <div className="flex justify-between items-center">
                <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <span>Milestone Configuration</span>
                  <span title="Split the invoice into multiple payment installments.">
                    <HelpCircle className="w-3 h-3 text-slate-400" />
                  </span>
                </h5>
                <button
                  type="button"
                  onClick={addMilestone}
                  className="text-[10px] font-bold text-emerald-600 dark:text-emerald-450 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Milestone</span>
                </button>
              </div>

              {milestones.length > 0 ? (
                <div className="space-y-2.5">
                  {milestones.map((m, idx) => (
                    <div key={idx} className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                      <div className="flex-1 w-full">
                        <Input
                          type="text"
                          placeholder="e.g. Deposit / Project Delivery / Beta Launch"
                          value={m.description}
                          onChange={(e) => updateMilestone(idx, 'description', e.target.value)}
                          className="h-8 text-xs border-slate-300 dark:border-slate-800 dark:bg-slate-950"
                        />
                      </div>
                      <div className="w-24 flex items-center gap-1.5">
                        <Input
                          type="number"
                          placeholder="%"
                          min="1"
                          max="100"
                          value={m.percentage}
                          onChange={(e) => updateMilestone(idx, 'percentage', e.target.value)}
                          className="h-8 text-xs font-mono text-right border-slate-300 dark:border-slate-800 dark:bg-slate-950"
                        />
                        <span className="text-xs font-bold text-slate-400">%</span>
                      </div>
                      <div className="w-full md:w-36">
                        <input
                          type="date"
                          value={m.dueDate}
                          onChange={(e) => updateMilestone(idx, 'dueDate', e.target.value)}
                          className="w-full h-8 text-xs px-2.5 border border-slate-300 dark:border-slate-800 dark:bg-slate-955 rounded-lg font-mono focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMilestone(idx)}
                        disabled={milestones.length <= 1}
                        className="p-1.5 text-slate-400 hover:text-red-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-slate-450 italic">No milestones defined. Click add above.</p>
              )}

              {/* Total percentage validation alert */}
              <div className="flex justify-between items-center pt-2 text-[10px] font-bold">
                <span className={isPercentageValid ? "text-emerald-600 dark:text-emerald-450" : "text-red-500"}>
                  Total Split: {totalPercentage}% {isPercentageValid ? '✓' : '(Must total 100%)'}
                </span>
                <span className="text-slate-450">
                  Total Value: {formatCurrency(grandTotal, currency)}
                </span>
              </div>
            </div>
          )}

          {/* Quick info alert on PDF display */}
          <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl text-[10px] text-amber-700 dark:text-amber-400 leading-normal">
            <strong>Note:</strong> Payment schedule instructions are automatically appended to the <strong>Invoice Notes</strong> section. They will be printed on the invoice PDF so your client sees the milestone schedule.
          </div>
        </div>
      )}
    </div>
  );
}
