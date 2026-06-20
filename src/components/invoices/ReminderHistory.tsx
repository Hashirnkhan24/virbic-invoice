import React, { useState } from 'react';
import { History, Eye, Mail, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDate } from '@/lib/helpers';
import { Card } from '@/components/ui/card';

interface ReminderLog {
  id: string;
  sentAt: string | Date;
  subject: string;
  body: string;
  recipient: string;
}

interface ReminderHistoryProps {
  reminders: ReminderLog[];
}

export default function ReminderHistory({ reminders }: ReminderHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!reminders || reminders.length === 0) {
    return (
      <Card className="p-4 border border-slate-200/60 dark:border-slate-800/85 bg-white dark:bg-slate-900 rounded-xl text-left">
        <p className="text-xs text-slate-450 italic">No payment reminders have been sent yet.</p>
      </Card>
    );
  }

  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <Card className="p-5 border border-slate-200/60 dark:border-slate-800/85 bg-white dark:bg-slate-900 rounded-xl shadow-xs text-left space-y-4">
      <h4 className="text-xs font-black text-slate-850 dark:text-slate-250 uppercase tracking-wider pb-1.5 border-b border-slate-100 dark:border-slate-850">
        Overdue Reminders History ({reminders.length})
      </h4>

      <div className="relative pl-4 border-l border-slate-200 dark:border-slate-800 space-y-4">
        {reminders.map((log) => {
          const isExpanded = expandedId === log.id;
          return (
            <div key={log.id} className="relative space-y-1.5">
              {/* Bullet node */}
              <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-white dark:border-slate-900 shrink-0" />

              <div className="flex justify-between items-start gap-3">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  <p className="font-semibold text-slate-450">{formatDate(log.sentAt)}</p>
                  <p className="text-slate-800 dark:text-slate-100 mt-0.5 truncate max-w-[170px]">{log.subject}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleExpand(log.id)}
                  className="p-1 text-slate-450 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <p className="text-[10px] text-slate-450 flex items-center gap-1">
                <Mail className="w-3 h-3 text-indigo-400" />
                <span>To: {log.recipient}</span>
              </p>

              {isExpanded && (
                <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-[10px] text-slate-600 dark:text-slate-400 font-mono whitespace-pre-wrap leading-relaxed max-h-[150px] overflow-y-auto">
                  {log.body}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
