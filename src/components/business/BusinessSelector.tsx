'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Building2, ChevronDown, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { useGetBusinesses } from '@/hooks/useBusiness';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function BusinessSelector() {
  const { businesses, loading, refetch } = useGetBusinesses();
  const [activeBusinessId, setActiveBusinessId] = useLocalStorage<string | null>(
    'active_business_id',
    null
  );

  // Auto-select default business if activeBusinessId is not set or invalid
  useEffect(() => {
    if (businesses.length > 0) {
      const exists = businesses.some((b) => b.id === activeBusinessId);
      if (!activeBusinessId || !exists) {
        const defaultBusiness = businesses.find((b) => b.isDefault);
        if (defaultBusiness) {
          setActiveBusinessId(defaultBusiness.id);
        } else {
          setActiveBusinessId(businesses[0].id);
        }
      }
    }
  }, [businesses, activeBusinessId, setActiveBusinessId]);

  // Listen for business creation/update events to refetch the list
  useEffect(() => {
    const handleRefetch = () => {
      refetch();
    };
    window.addEventListener('business-changed', handleRefetch);
    return () => window.removeEventListener('business-changed', handleRefetch);
  }, [refetch]);

  const activeBusiness = businesses.find((b) => b.id === activeBusinessId);

  if (loading && businesses.length === 0) {
    return (
      <div className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center bg-slate-50 dark:bg-slate-900 animate-pulse w-32" />
    );
  }

  // If there are no businesses yet, prompt to create one
  if (businesses.length === 0) {
    return (
      <Link
        href="/onboarding"
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          "flex items-center gap-2 border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-semibold"
        )}
      >
        <Plus className="w-4 h-4" />
        <span>Create Profile</span>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          "flex items-center gap-2 border-slate-200/80 dark:border-slate-850 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 select-none cursor-pointer"
        )}
      >
        {activeBusiness?.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeBusiness.logo}
            alt="Business Logo"
            className="w-4.5 h-4.5 object-contain rounded-md"
          />
        ) : (
          <Building2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
        )}
        <span className="max-w-[120px] truncate font-semibold">
          {activeBusiness?.name || 'Select Business'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-[240px]">
        <DropdownMenuLabel className="text-xs text-slate-400 uppercase tracking-wider font-bold">
          Select Business
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="max-h-60 overflow-y-auto">
          {businesses.map((biz) => {
            const isSelected = biz.id === activeBusinessId;
            return (
              <DropdownMenuItem
                key={biz.id}
                onClick={() => {
                  setActiveBusinessId(biz.id);
                  // Dispatch custom event to notify other components of active business change
                  window.dispatchEvent(new CustomEvent('active-business-changed', { detail: biz.id }));
                }}
                className={cn(
                  "flex items-center justify-between cursor-pointer py-2 px-2.5 rounded-md my-0.5",
                  isSelected
                    ? "bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-semibold"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-350"
                )}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  {biz.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={biz.logo}
                      alt={biz.name}
                      className="w-5 h-5 object-contain rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex-shrink-0"
                    />
                  ) : (
                    <Building2 className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  )}
                  <div className="flex flex-col text-left overflow-hidden">
                    <span className="text-sm truncate">{biz.name}</span>
                    {biz.gstin && (
                      <span className="text-[10px] text-slate-400 truncate font-mono">
                        GST: {biz.gstin}
                      </span>
                    )}
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 ml-2" />}
              </DropdownMenuItem>
            );
          })}
        </div>
        
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer p-0">
          <Link
            href="/onboarding"
            className="flex items-center gap-2 w-full h-full px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Business</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
