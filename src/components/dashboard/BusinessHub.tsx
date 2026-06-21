'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Check, RefreshCw, Layers } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { formatCurrency } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface BusinessHubItem {
  id: string;
  name: string;
  logo: string | null;
  currency: string;
  isDefault: boolean;
  isActiveProfile: boolean;
  outstandingAmount: number;
  monthlyRevenue: number;
}

interface BusinessHubProps {
  businesses: BusinessHubItem[];
  activeBusinessId: string;
}

export default function BusinessHub({ businesses, activeBusinessId }: BusinessHubProps) {
  const [, setActiveBusinessId] = useLocalStorage<string | null>('active_business_id', null);

  const handleSetActive = (id: string, name: string) => {
    try {
      setActiveBusinessId(id);
      // eslint-disable-next-line react-hooks/immutability
      window.document.cookie = `active_business_id=${id}; path=/; max-age=31536000; SameSite=Lax`;
      
      // Dispatch custom event just in case
      window.dispatchEvent(new CustomEvent('active-business-changed', { detail: id }));
      
      toast.success(`Switched active profile to ${name}`);
      window.location.reload();
    } catch (e) {
      console.error(e);
      toast.error('Failed to change active profile');
    }
  };

  // Compute aggregate stats for "All Businesses"
  const totalOutstanding = businesses.reduce((sum, b) => sum + b.outstandingAmount, 0);
  const totalRevenue = businesses.reduce((sum, b) => sum + b.monthlyRevenue, 0);

  // Define the profiles list including the virtual "All Businesses" one
  const items = [
    {
      id: 'all',
      name: 'All Businesses',
      logo: null,
      isAll: true,
      isActive: activeBusinessId === 'all',
      outstandingAmount: totalOutstanding,
      monthlyRevenue: totalRevenue,
      currency: 'INR',
    },
    ...businesses.map((b) => ({
      id: b.id,
      name: b.name,
      logo: b.logo,
      isAll: false,
      isActive: b.id === activeBusinessId,
      outstandingAmount: b.outstandingAmount,
      monthlyRevenue: b.monthlyRevenue,
      currency: b.currency,
    })),
  ];

  return (
    <div className="space-y-2 text-left">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-455 dark:text-slate-500">
          Switch Workspace Context
        </h3>
        <p className="text-[10px] text-slate-400">Click a card to switch your active business profile.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((item) => {
          return (
            <div
              key={item.id}
              onClick={() => {
                if (!item.isActive) {
                  handleSetActive(item.id, item.name);
                }
              }}
              className={cn(
                "group relative p-3 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between h-[86px] select-none",
                item.isActive
                  ? "border-emerald-500/80 bg-emerald-50/10 dark:bg-emerald-950/5 shadow-xs shadow-emerald-500/5"
                  : "border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 hover:border-slate-350 hover:shadow-xs"
              )}
            >
              {/* Header: Logo & Title */}
              <div className="flex items-start justify-between gap-2 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  {item.isAll ? (
                    <div className="w-5 h-5 rounded bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center flex-shrink-0 border border-emerald-200/20">
                      <Layers className="w-3 h-3 text-emerald-600 dark:text-emerald-450" />
                    </div>
                  ) : item.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.logo}
                      alt={item.name}
                      className="w-5 h-5 object-contain rounded bg-slate-50 dark:bg-slate-950 flex-shrink-0 border border-slate-100 dark:border-slate-800"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 border border-slate-200/30">
                      <Building2 className="w-3 h-3 text-slate-500 dark:text-slate-450" />
                    </div>
                  )}
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-150 truncate leading-tight group-hover:text-emerald-550 dark:group-hover:text-emerald-450 transition-colors">
                    {item.name}
                  </span>
                </div>

                {item.isActive ? (
                  <span className="flex-shrink-0 w-3.5 h-3.5 rounded-full bg-emerald-500 dark:bg-emerald-600 flex items-center justify-center text-white">
                    <Check className="w-2 h-2 stroke-[3]" />
                  </span>
                ) : (
                  <RefreshCw className="w-3 h-3 text-slate-300 dark:text-slate-650 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                )}
              </div>

              {/* Stats: Outstanding & MTD Revenue */}
              <div className="grid grid-cols-2 gap-1 border-t border-slate-100/50 dark:border-slate-800/40 pt-1.5 mt-1.5 text-[9px] font-medium text-slate-400 dark:text-slate-550">
                <div className="min-w-0">
                  <span className="block text-[8px] text-slate-400/80 dark:text-slate-600 uppercase tracking-tight">Outstanding</span>
                  <span className={cn(
                    "font-bold truncate block leading-normal",
                    item.outstandingAmount > 0 
                      ? "text-red-500 dark:text-red-400/90 font-extrabold" 
                      : "text-slate-550 dark:text-slate-350"
                  )}>
                    {formatCurrency(item.outstandingAmount, item.currency)}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="block text-[8px] text-slate-400/80 dark:text-slate-600 uppercase tracking-tight">MTD Revenue</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200 truncate block leading-normal">
                    {formatCurrency(item.monthlyRevenue, item.currency)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
