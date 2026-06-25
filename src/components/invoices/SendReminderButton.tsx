'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Loader2,
  MessageSquare,
  Sparkles,
  Edit2,
  Send,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/helpers';
import { DEFAULT_REMINDER_TEMPLATES } from '@/lib/reminder-defaults';

interface SendReminderButtonProps {
  invoice: any;
  reminderTemplates: any[];
  onReminderSent?: (updatedInvoice: any) => void;
}

const STAGE_LABELS = [
  { stage: 1, label: "Polite (Stage 1)", dot: "bg-emerald-500", text: "text-emerald-500" },
  { stage: 2, label: "Standard (Stage 2)", dot: "bg-amber-500", text: "text-amber-500" },
  { stage: 3, label: "Firm (Stage 3)", dot: "bg-orange-500", text: "text-orange-500" },
  { stage: 4, label: "Final (Stage 4)", dot: "bg-red-500", text: "text-red-500" }
];

export default function SendReminderButton({
  invoice,
  reminderTemplates = [],
  onReminderSent
}: SendReminderButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Suggested stage based on reminderCount (capped at 4)
  const suggestedStage = Math.min(4, Math.max(1, invoice.reminderCount + 1));
  const [stage, setStage] = useState<number>(suggestedStage);

  // Custom vs Template toggles
  const [isEditing, setIsEditing] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [sendWhatsapp, setSendWhatsapp] = useState(true);

  // Retrieve active template for selected stage
  const activeTemplate = reminderTemplates.find((t) => t.stage === stage) ||
    DEFAULT_REMINDER_TEMPLATES.find((t) => t.stage === stage);

  // Compile helper function
  const compileText = (templateText: string) => {
    if (!templateText) return "";
    const grandTotal = Number(invoice.grandTotal);
    const amountPaid = Number(invoice.amountPaid || 0);
    const outstanding = grandTotal - amountPaid;
    const appUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
    const paymentLink = invoice.publicShareId 
      ? `${appUrl}/i/${invoice.publicShareId}` 
      : `${appUrl}/dashboard/invoices/${invoice.id}`;

    const vars: Record<string, string> = {
      clientName: invoice.client.name || 'Client',
      invoiceNumber: String(invoice.invoiceNumber),
      dueDate: formatDate(invoice.dueDate),
      issueDate: formatDate(invoice.issueDate),
      grandTotal: formatCurrency(grandTotal, invoice.currency),
      amountPaid: amountPaid > 0 ? formatCurrency(amountPaid, invoice.currency) : "",
      outstandingAmount: formatCurrency(outstanding, invoice.currency),
      paymentLink: paymentLink,
      businessName: invoice.business.name || 'Our Business',
    };

    let result = templateText;

    // Compile conditional blocks: {{#if amountPaid}}...{{/if}}
    const conditionalRegex = /\{\{#if\s+([a-zA-Z0-9_]+)\s*\}\}([\s\S]*?)\{\{\/if\}\}/g;
    result = result.replace(conditionalRegex, (match, key, content) => {
      const value = vars[key];
      if (value && value !== "") {
        return content;
      }
      return "";
    });

    // Compile variables: {{variable}}
    const variableRegex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
    result = result.replace(variableRegex, (match, key) => {
      return vars[key] !== undefined ? vars[key] : "";
    });

    return result.trim();
  };

  // Compile active template subject & body whenever stage or activeTemplate changes
  useEffect(() => {
    if (activeTemplate) {
      setSubject(compileText(activeTemplate.subject));
      setBody(compileText(activeTemplate.body));
      setSendEmail(activeTemplate.sendEmail ?? true);
      setSendWhatsapp(activeTemplate.generateWaMsg ?? true);
    }
  }, [stage, activeTemplate, invoice]);

  // Submit manual remind
  const handleSendReminder = async () => {
    if (!sendEmail && !sendWhatsapp) {
      toast.error('Please select at least one dispatch channel (Email or WhatsApp).');
      return;
    }

    if (sendEmail && !invoice.client.email) {
      toast.error('Client email is missing. Unable to send email reminder.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/remind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          body: body.trim(),
          sendEmail,
          sendWhatsapp,
          stage,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reminder');

      toast.success(
        sendEmail 
          ? 'Reminder email sent and logged successfully!' 
          : 'Reminder logged successfully!'
      );

      // Trigger WhatsApp tab if selected and link is generated
      if (sendWhatsapp && data.whatsappUrl) {
        window.open(data.whatsappUrl, '_blank');
        toast.info('Opening WhatsApp message in a new tab...');
      }

      if (onReminderSent && data.invoice) {
        onReminderSent(data.invoice);
      }

      setIsOpen(false);
      setIsEditing(false);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to dispatch payment reminder.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => {
          setStage(suggestedStage);
          setIsOpen(true);
        }}
        className="w-full h-9 font-bold text-xs bg-slate-900 hover:bg-slate-850 text-white cursor-pointer shadow-sm shadow-slate-950/10"
      >
        <Mail className="w-3.5 h-3.5 mr-2 text-emerald-400" />
        <span>Send Payment Reminder</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 dark:text-slate-50 tracking-tight text-left">
              Dispatch Payment Reminder
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 text-left">
              Escalate overdue invoice reminder manually. Pre-select stage, customize channel, and review compiled text.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-left">
            {/* Stage Selector */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wide">
                Escalation Stage Tone
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {STAGE_LABELS.map((item) => (
                  <button
                    key={item.stage}
                    type="button"
                    onClick={() => setStage(item.stage)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      stage === item.stage
                        ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 font-bold'
                        : 'border-slate-200 dark:border-slate-850 hover:bg-slate-50/50 hover:border-slate-350'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                      <span className={stage === item.stage ? item.text : "text-slate-600 dark:text-slate-400"}>
                        Stage {item.stage}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              {suggestedStage !== stage && (
                <p className="text-[9px] text-slate-400 font-semibold flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3 text-amber-500" />
                  <span>Suggested next stage for this invoice: Stage {suggestedStage}.</span>
                </p>
              )}
            </div>

            {/* Channels Checklist */}
            <div className="space-y-2 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wide">
                Notification Channels
              </label>
              <div className="flex justify-between items-center">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:bg-slate-900"
                  />
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Email Reminder</span>
                  </span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sendWhatsapp}
                    onChange={(e) => setSendWhatsapp(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:bg-slate-900"
                  />
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span>WhatsApp Web</span>
                  </span>
                </label>
              </div>
            </div>

            {/* Subject Field */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wide">
                  Subject Line
                </label>
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>{isEditing ? 'Lock Template' : 'Edit Text'}</span>
                </button>
              </div>
              <Input
                required
                disabled={!isEditing}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="h-9 text-xs border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Message Body Field */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wide">
                Message Body Preview
              </label>
              <Textarea
                required
                disabled={!isEditing}
                rows={7}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="text-xs border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 leading-relaxed font-medium text-slate-800 dark:text-slate-300"
              />
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-850">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsOpen(false);
                  setIsEditing(false);
                }}
                className="h-9 font-bold text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSendReminder}
                disabled={isLoading}
                className="h-9 font-bold text-xs bg-slate-900 hover:bg-slate-850 text-white cursor-pointer shadow-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 mr-2 text-emerald-450" />
                    <span>Send Reminder</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
