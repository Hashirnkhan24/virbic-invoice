'use client';

import React from 'react';
import Link from 'next/link';
import {
  Mail,
  Phone,
  MapPin,
  FileText,
  Plus,
  Edit2,
  Trash2,
  Copy,
  CheckCircle2,
  Building,
  ArrowRight,
  ClipboardCopy,
} from 'lucide-react';
import { ClientWithDetails } from '@/hooks/useClients';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/helpers';
import { toast } from 'sonner';

interface ClientDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientWithDetails | null;
  onEdit: (client: ClientWithDetails) => void;
  onDelete: (client: ClientWithDetails) => void;
}

// Helper to extract initials
function getInitials(name: string) {
  if (!name) return 'C';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function ClientDetail({
  open,
  onOpenChange,
  client,
  onEdit,
  onDelete,
}: ClientDetailProps) {
  if (!client) return null;

  const initials = getInitials(client.name);
  const invoices = client.invoices || [];

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-0 shadow-xl transition-all duration-300">
        
        {/* Header with Background Pattern */}
        <div className="relative pt-8 pb-6 px-6 bg-gradient-to-br from-slate-50 to-slate-100/60 dark:from-slate-950/80 dark:to-slate-900/50 border-b border-slate-150 dark:border-slate-850">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar Circle */}
              <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-extrabold text-xl shadow-md uppercase flex-shrink-0 tracking-wide border-2 border-white dark:border-slate-900">
                {initials}
              </div>
              
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 tracking-tight leading-tight">
                  {client.name}
                </h2>
                {client.gstin ? (
                  <div className="flex items-center gap-1">
                    <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-100/50 dark:border-emerald-900/30 font-mono">
                      GST: {client.gstin}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-5 h-5 text-slate-400 hover:text-slate-650 dark:hover:text-slate-250 cursor-pointer"
                      onClick={() => copyToClipboard(client.gstin || '', 'GSTIN')}
                      title="Copy GSTIN"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-slate-450 italic">No GSTIN registered</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 px-6 py-6">
          <div className="space-y-6">
            
            {/* Contact Details */}
            <div className="space-y-3.5">
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Contact Details
              </h3>
              
              <div className="space-y-2.5">
                {/* Email */}
                <div className="flex items-center justify-between group p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-950/20 hover:border-slate-200 dark:hover:border-slate-800 transition-all duration-200">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    {client.email ? (
                      <a
                        href={`mailto:${client.email}`}
                        className="text-xs font-medium text-slate-700 dark:text-slate-350 hover:text-emerald-600 dark:hover:text-emerald-400 truncate"
                        title={client.email}
                      >
                        {client.email}
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400 italic">No email address</span>
                    )}
                  </div>
                  {client.email && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-850 cursor-pointer transition-all duration-150"
                      onClick={() => copyToClipboard(client.email || '', 'Email')}
                      title="Copy Email"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                {/* Phone */}
                <div className="flex items-center justify-between group p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-950/20 hover:border-slate-200 dark:hover:border-slate-800 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    {client.phone ? (
                      <a
                        href={`tel:${client.phone}`}
                        className="text-xs font-medium text-slate-700 dark:text-slate-350 hover:text-emerald-600 dark:hover:text-emerald-400"
                      >
                        {client.phone}
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400 italic">No phone number</span>
                    )}
                  </div>
                  {client.phone && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-850 cursor-pointer transition-all duration-150"
                      onClick={() => copyToClipboard(client.phone || '', 'Phone')}
                      title="Copy Phone"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Addresses (Billing and Shipping) */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Address Profiles
              </h3>

              <div className="grid grid-cols-1 gap-4">
                {/* Billing Address Card */}
                <div className="group relative p-3.5 rounded-xl border border-slate-150 dark:border-slate-800/60 bg-white dark:bg-slate-900/60 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                        Billing Address
                      </span>
                      {client.billingAddress && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer transition-all"
                          onClick={() =>
                            copyToClipboard(
                              `${client.billingAddress}\n${client.billingCity || ''}, ${client.billingState || ''} - ${client.billingPincode || ''}`,
                              'Billing Address'
                            )
                          }
                          title="Copy Full Address"
                        >
                          <ClipboardCopy className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                    {client.billingAddress ? (
                      <div className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-medium">
                        <p className="whitespace-pre-line">{client.billingAddress}</p>
                        <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                          {client.billingCity}
                          {client.billingState ? `, ${client.billingState}` : ''}
                          {client.billingPincode ? ` - ${client.billingPincode}` : ''}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">No billing address set</span>
                    )}
                  </div>
                </div>

                {/* Shipping Address Card */}
                <div className="group relative p-3.5 rounded-xl border border-slate-150 dark:border-slate-800/60 bg-white dark:bg-slate-900/60 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-indigo-500" />
                        Shipping Address
                      </span>
                      {client.shippingAddress && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer transition-all"
                          onClick={() =>
                            copyToClipboard(
                              `${client.shippingAddress}\n${client.shippingCity || ''}, ${client.shippingState || ''} - ${client.shippingPincode || ''}`,
                              'Shipping Address'
                            )
                          }
                          title="Copy Full Address"
                        >
                          <ClipboardCopy className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                    {client.shippingAddress ? (
                      <div className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-medium">
                        <p className="whitespace-pre-line">{client.shippingAddress}</p>
                        <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                          {client.shippingCity}
                          {client.shippingState ? `, ${client.shippingState}` : ''}
                          {client.shippingPincode ? ` - ${client.shippingPincode}` : ''}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">No shipping address set</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            {client.notes && (
              <div className="space-y-2.5">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Internal Notes
                </h3>
                <div className="p-3.5 rounded-xl border border-amber-200/50 dark:border-amber-900/30 bg-amber-50/15 dark:bg-amber-950/10 text-xs text-slate-650 dark:text-slate-300 leading-relaxed italic font-medium whitespace-pre-line">
                  {client.notes}
                </div>
              </div>
            )}

            {/* Recent Invoices */}
            <div className="space-y-3.5">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Recent Invoices
                </h3>
                <span className="text-[10px] font-bold text-slate-400">
                  Total: {client._count?.invoices || 0}
                </span>
              </div>

              {invoices.length > 0 ? (
                <div className="space-y-2">
                  {invoices.map((inv) => (
                    <Link
                      key={inv.id}
                      href={`/invoices/${inv.id}`}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-850 bg-slate-50/40 dark:bg-slate-900/40 hover:border-slate-200 dark:hover:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/80 transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <span className="text-xs font-bold text-slate-850 dark:text-slate-100 block">
                            {inv.invoiceNumber}
                          </span>
                          <span className="text-[10px] text-slate-450 dark:text-slate-500 font-medium">
                            {formatDate(inv.issueDate)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3.5">
                        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-250 font-mono">
                          {formatCurrency(inv.grandTotal)}
                        </span>
                        <StatusBadge status={inv.status} className="h-5 text-[10px] font-bold px-2 py-0" />
                        <ArrowRight className="w-3.5 h-3.5 text-slate-350 hover:text-slate-500" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-450 space-y-2 bg-slate-50/15 dark:bg-slate-950/5">
                  <FileText className="w-8 h-8 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-500">No invoices generated yet</p>
                </div>
              )}
            </div>

          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-150 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/20 flex gap-2.5">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-10 border-slate-200 hover:bg-slate-50 text-slate-700 font-bold dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-850 cursor-pointer flex items-center justify-center gap-1.5 text-xs"
            onClick={() => onEdit(client)}
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-10 h-10 p-0 border-slate-200 hover:bg-red-50 hover:text-red-650 hover:border-red-200 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-red-950/25 dark:hover:text-red-400 dark:hover:border-red-900/30 cursor-pointer flex items-center justify-center"
            onClick={() => onDelete(client)}
            title="Delete Client"
          >
            <Trash2 className="w-4 h-4" />
          </Button>

          <Link
            href={`/invoices/new?clientId=${client.id}`}
            className="flex-[2] h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer text-xs rounded-lg inline-flex items-center justify-center gap-1.5 shadow-sm transition-all duration-150 outline-none"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invoice</span>
          </Link>
        </div>

      </SheetContent>
    </Sheet>
  );
}
