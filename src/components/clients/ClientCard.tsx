'use client';

import { motion } from 'framer-motion';
import { MoreVertical, Edit2, Trash2, FileText, Eye, Mail, Phone, MapPin } from 'lucide-react';
import { ClientWithDetails } from '@/hooks/useClients';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ClientCardProps {
  client: ClientWithDetails;
  onView: (client: ClientWithDetails) => void;
  onEdit: (client: ClientWithDetails) => void;
  onDelete: (client: ClientWithDetails) => void;
}

// Helper to extract initials from name
function getInitials(name: string) {
  if (!name) return 'C';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function ClientCard({ client, onView, onEdit, onDelete }: ClientCardProps) {
  const initials = getInitials(client.name);
  const invoiceCount = client._count?.invoices || 0;

  // Stagger entry animation on mount
  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: 'easeOut' as const },
    },
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -2, boxShadow: 'var(--shadow-md)' }}
      className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-5 shadow-sm transition-all duration-200 flex flex-col justify-between"
    >
      <div className="space-y-4">
        {/* Card Top: Avatar, Name & GSTIN */}
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Avatar Circle */}
            <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm uppercase">
              {initials}
            </div>
            
            <div className="flex flex-col text-left overflow-hidden">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate" title={client.name}>
                {client.name}
              </h3>
              {client.gstin ? (
                <span className="inline-flex w-fit text-[9px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 px-1.5 py-0.5 rounded-md border border-emerald-100/50 dark:border-emerald-900/30 font-mono mt-0.5">
                  GST: {client.gstin}
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 mt-0.5 italic">No GSTIN</span>
              )}
            </div>
          </div>

          {/* Action 3-dots Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px]">
              <DropdownMenuItem onClick={() => onView(client)} className="flex items-center gap-2 cursor-pointer font-medium">
                <Eye className="w-4 h-4 text-slate-450" />
                <span>View Details</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(client)} className="flex items-center gap-2 cursor-pointer font-medium">
                <Edit2 className="w-4 h-4 text-slate-450" />
                <span>Edit Client</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(client)}
                className="flex items-center gap-2 cursor-pointer font-medium text-red-650 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/20"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Client</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Card Middle: Contact Info */}
        <div className="space-y-2 py-2 text-xs border-t border-b border-slate-100/60 dark:border-slate-800/40 text-slate-600 dark:text-slate-400">
          {client.email ? (
            <div className="flex items-center gap-2 overflow-hidden">
              <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="truncate" title={client.email}>{client.email}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-400 italic">
              <Mail className="w-3.5 h-3.5 text-slate-350 flex-shrink-0" />
              <span>No email provided</span>
            </div>
          )}

          {client.phone ? (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span>{client.phone}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-400 italic">
              <Phone className="w-3.5 h-3.5 text-slate-350 flex-shrink-0" />
              <span>No phone provided</span>
            </div>
          )}

          {client.billingCity ? (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span>
                {client.billingCity}
                {client.billingState ? `, ${client.billingState}` : ''}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-400 italic">
              <MapPin className="w-3.5 h-3.5 text-slate-350 flex-shrink-0" />
              <span>No location set</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Bottom: Invoices Stats & Action button */}
      <div className="flex items-center justify-between mt-4 pt-1">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border",
            invoiceCount > 0
              ? "text-emerald-700 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
              : "text-slate-500 bg-slate-50 border-slate-150 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800/40"
          )}
        >
          <FileText className="w-3 h-3" />
          <span>
            {invoiceCount} {invoiceCount === 1 ? 'invoice' : 'invoices'}
          </span>
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onView(client)}
          className="h-8 text-xs font-semibold px-3.5 border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer"
        >
          View
        </Button>
      </div>
    </motion.div>
  );
}
