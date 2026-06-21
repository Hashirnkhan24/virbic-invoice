'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Filter,
  BarChart3,
  Percent,
  FileText,
  AlertCircle,
  TrendingUp,
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
import { toast } from 'sonner';

// Import subcomponents
import ReportsSummaryTab from './ReportsSummaryTab';
import ReportsGSTTab from './ReportsGSTTab';
import ReportsCollectionTab from './ReportsCollectionTab';
import ReportsAgingTab from './ReportsAgingTab';

interface Business {
  id: string;
  name: string;
  currency: string;
  isDefault: boolean;
}

interface ReportsClientProps {
  businesses: Business[];
}

function getPresetDateRange(preset: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  let start = new Date();
  let end = new Date();

  switch (preset) {
    case 'this_month':
      start = new Date(year, month, 1);
      end = new Date(year, month + 1, 0, 23, 59, 59, 999);
      break;
    case 'last_month':
      start = new Date(year, month - 1, 1);
      end = new Date(year, month, 0, 23, 59, 59, 999);
      break;
    case 'this_quarter': {
      let qStartMonth = 3;
      let qYear = year;
      if (month >= 3 && month <= 5) {
        qStartMonth = 3; // Q1: Apr-Jun
      } else if (month >= 6 && month <= 8) {
        qStartMonth = 6; // Q2: Jul-Sep
      } else if (month >= 9 && month <= 11) {
        qStartMonth = 9; // Q3: Oct-Dec
      } else {
        qStartMonth = 0; // Q4: Jan-Mar
        qYear = year;
      }
      start = new Date(qYear, qStartMonth, 1);
      end = new Date(qYear, qStartMonth + 3, 0, 23, 59, 59, 999);
      break;
    }
    case 'this_fy': {
      let fyStartYear = year;
      if (month < 3) fyStartYear = year - 1;
      start = new Date(fyStartYear, 3, 1);
      end = new Date(fyStartYear + 1, 2, 31, 23, 59, 59, 999);
      break;
    }
    case 'last_fy': {
      let fyStartYear = year - 1;
      if (month < 3) fyStartYear = year - 2;
      start = new Date(fyStartYear, 3, 1);
      end = new Date(fyStartYear + 1, 2, 31, 23, 59, 59, 999);
      break;
    }
    default:
      break;
  }
  return { start, end };
}

export default function ReportsClient({ businesses }: ReportsClientProps) {
  const [businessId, setBusinessId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('active_business_id')?.replace(/^"|"$/g, '') || 'all';
    }
    return 'all';
  });
  const [datePreset, setDatePreset] = useState<string>('this_fy');
  
  // Custom Dates (bound when preset === 'custom')
  const defaultDates = getPresetDateRange('this_fy');
  const [startDateStr, setStartDateStr] = useState<string>(
    defaultDates.start.toISOString().split('T')[0]
  );
  const [endDateStr, setEndDateStr] = useState<string>(
    defaultDates.end.toISOString().split('T')[0]
  );

  const [activeTab, setActiveTab] = useState<string>('summary');
  
  // API data state
  const [summaryData, setSummaryData] = useState<any>(null);
  const [gstData, setGstData] = useState<any>(null);
  const [collectionData, setCollectionData] = useState<any>(null);
  const [agingData, setAgingData] = useState<any>(null);

  const [loading, setLoading] = useState<boolean>(true);

  // Sync dates whenever preset changes
  useEffect(() => {
    if (datePreset !== 'custom') {
      const { start, end } = getPresetDateRange(datePreset);
      setStartDateStr(start.toISOString().split('T')[0]);
      setEndDateStr(end.toISOString().split('T')[0]);
    }
  }, [datePreset]);

  // Fetch report data
  const fetchReportData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: new Date(startDateStr).toISOString(),
        endDate: new Date(`${endDateStr}T23:59:59.999Z`).toISOString(),
        businessId,
      });

      // Based on active tab, fetch specific data (or fetch all for seamless toggles)
      if (activeTab === 'summary') {
        const res = await fetch(`/api/reports/summary?${params}`);
        if (!res.ok) throw new Error('Failed to fetch summary');
        const data = await res.json();
        setSummaryData(data);
      } else if (activeTab === 'gst') {
        const res = await fetch(`/api/reports/gst?${params}`);
        if (!res.ok) throw new Error('Failed to fetch GST report');
        const data = await res.json();
        setGstData(data);
      } else if (activeTab === 'collections') {
        const res = await fetch(`/api/reports/collection?${params}`);
        if (!res.ok) throw new Error('Failed to fetch collection report');
        const data = await res.json();
        setCollectionData(data);
      } else if (activeTab === 'aging') {
        // Aging endpoint does not use date filters, just businessId
        const agingParams = new URLSearchParams({ businessId });
        const res = await fetch(`/api/reports/aging?${agingParams}`);
        if (!res.ok) throw new Error('Failed to fetch aging report');
        const data = await res.json();
        setAgingData(data);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`Error loading report: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch on filter changes
  useEffect(() => {
    fetchReportData();
  }, [activeTab, businessId, startDateStr, endDateStr]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 text-left">
      {/* ── Header Row ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/60 dark:border-slate-800/80">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
            Reports & Tax Analytics
          </h1>
          <p className="text-xs text-slate-500">
            Track business revenue metrics, GST obligations, collection aging, and tax summaries.
          </p>
        </div>
      </div>

      {/* ── Filters Card ── */}
      <Card className="p-4 border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 rounded-xl shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* Business Profile Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              <span>Business Entity</span>
            </label>
            <Select value={businessId} onValueChange={(val) => setBusinessId(val || 'all')}>
              <SelectTrigger className="h-9 text-xs font-bold bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 rounded-lg">
                <SelectValue placeholder="All Businesses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs font-bold">All Businesses</SelectItem>
                {businesses.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-xs font-semibold">
                    {b.name} ({b.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Presets Selector */}
          {activeTab !== 'aging' ? (
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Date Range Preset</span>
              </label>
              <Select value={datePreset} onValueChange={(val) => setDatePreset(val || 'this_fy')}>
                <SelectTrigger className="h-9 text-xs font-bold bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 rounded-lg">
                  <SelectValue placeholder="Select Range" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="this_month" className="text-xs font-semibold">This Month</SelectItem>
                  <SelectItem value="last_month" className="text-xs font-semibold">Last Month</SelectItem>
                  <SelectItem value="this_quarter" className="text-xs font-semibold">This Quarter</SelectItem>
                  <SelectItem value="this_fy" className="text-xs font-semibold">This Financial Year</SelectItem>
                  <SelectItem value="last_fy" className="text-xs font-semibold">Last Financial Year</SelectItem>
                  <SelectItem value="custom" className="text-xs font-semibold">Custom range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="hidden lg:block bg-slate-50/50 dark:bg-slate-950/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg h-9 p-2 text-center text-[10px] font-bold text-slate-400">
              Aging charts calculate current outstanding dues
            </div>
          )}

          {/* Custom Start Date Picker */}
          {activeTab !== 'aging' && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Start Date
              </label>
              <Input
                type="date"
                disabled={datePreset !== 'custom'}
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
                className="h-9 text-xs font-bold bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>
          )}

          {/* Custom End Date Picker */}
          {activeTab !== 'aging' && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                End Date
              </label>
              <Input
                type="date"
                disabled={datePreset !== 'custom'}
                value={endDateStr}
                onChange={(e) => setEndDateStr(e.target.value)}
                className="h-9 text-xs font-bold bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>
          )}
        </div>
      </Card>

      {/* ── Tabs Navigation ── */}
      <div className="flex flex-col space-y-4">
        {/* Navigation Buttons Row */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 w-full overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'summary'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Financial Summary</span>
          </button>
          <button
            onClick={() => setActiveTab('gst')}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'gst'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>GSTR-1 Tax Summary</span>
          </button>
          <button
            onClick={() => setActiveTab('collections')}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'collections'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Collections Efficiency</span>
          </button>
          <button
            onClick={() => setActiveTab('aging')}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'aging'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Aging Report (A/R)</span>
          </button>
        </div>

        {/* ── Content Render ── */}
        <div className="pt-2">
          {loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl animate-pulse h-28" />
                ))}
              </div>
              <Card className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl animate-pulse h-80 w-full" />
            </div>
          ) : (
            <>
              {activeTab === 'summary' && <ReportsSummaryTab data={summaryData} />}
              {activeTab === 'gst' && <ReportsGSTTab data={gstData} />}
              {activeTab === 'collections' && <ReportsCollectionTab data={collectionData} />}
              {activeTab === 'aging' && <ReportsAgingTab data={agingData} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
