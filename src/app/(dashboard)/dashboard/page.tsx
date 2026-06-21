import React from 'react';
import Link from 'next/link';
import {
  FileText,
  Users,
  BarChart3,
  AlertTriangle,
  Plus,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import StatCard from '@/components/shared/StatCard';
import DashboardCharts from '@/components/charts/DashboardCharts';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/helpers';
import { convertCurrency } from '@/lib/currency';
import CurrencyAmount from '@/components/shared/CurrencyAmount';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { BusinessHubItem } from '@/components/dashboard/BusinessHub';

export default async function DashboardPage(props: {
  searchParams: Promise<{ businesses?: string }>;
}) {
  const { error, dbUser } = await getAuthUser();
  if (error || !dbUser) redirect('/sign-in');
  const user = dbUser;

  // Check if onboarding is completed (has at least one business profile)
  const businesses = await prisma.business.findMany({
    where: { userId: user.id },
  });

  if (businesses.length === 0) {
    redirect('/onboarding');
  }

  // 1. Fetch ALL invoices of the user first (to compute individual business stats and filter in-memory)
  const allInvoices = await prisma.invoice.findMany({
    where: {
      userId: user.id,
    },
    include: {
      client: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // ── EMPTY STATE FOR NEW USERS ──
  // Show welcome onboarding screen ONLY if the user has literally 0 invoices across ALL their businesses
  if (allInvoices.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center space-y-6 max-w-md mx-auto text-left">
        {/* Onboarding Welcome Illustration */}
        <div className="relative w-48 h-48 bg-sky-50 dark:bg-sky-950/20 rounded-full flex items-center justify-center border border-sky-100 dark:border-sky-900/50 shadow-inner">
          <div className="absolute top-6 left-6 w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-900 flex items-center justify-center animate-bounce">
            <Plus className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <img src="/virbic-logo.svg" alt="Virbic Logo" className="w-24 h-24 object-contain filter drop-shadow-md" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
            Welcome to Virbic!
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Create your first professional GST-ready tax invoice in under 60 seconds and start collecting payments instantly.
          </p>
        </div>

        <Link href="/invoices/new">
          <Button className="w-full h-11 font-bold text-sm bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer shadow-md shadow-emerald-500/10">
            <Plus className="w-4 h-4 mr-2" />
            <span>Create Your First Invoice</span>
          </Button>
        </Link>
      </div>
    );
  }

  // Read active business profile ID from cookie or fallback to default
  const cookieStore = await cookies();
  let activeBusinessId = cookieStore.get('active_business_id')?.value;

  // Auto-resolve activeBusinessId if not set or invalid
  if (!activeBusinessId) {
    const defaultBusiness = businesses.find((b) => b.isDefault) || businesses[0];
    activeBusinessId = defaultBusiness ? defaultBusiness.id : undefined;
  }

  // Determine selected business IDs for main stats calculations
  let selectedBusinessIds: string[] = [];
  if (activeBusinessId === 'all') {
    selectedBusinessIds = businesses.map((b) => b.id);
  } else if (activeBusinessId) {
    const hasBusiness = businesses.some((b) => b.id === activeBusinessId);
    if (hasBusiness) {
      selectedBusinessIds = [activeBusinessId];
    } else {
      // Invalid business ID context: fallback to default/first
      const defaultBusiness = businesses.find((b) => b.isDefault) || businesses[0];
      activeBusinessId = defaultBusiness ? defaultBusiness.id : undefined;
      if (activeBusinessId) {
        selectedBusinessIds = [activeBusinessId];
      }
    }
  }

  // Filter invoices matching selected businesses for the main dashboard calculations
  const invoices = allInvoices.filter((inv) => selectedBusinessIds.includes(inv.businessId));
  const totalInvoices = invoices.length;

  // 2. COMPUTE STATS FOR MAIN VIEW
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

  // Unpaid statuses: SENT, PARTIAL, OVERDUE
  const unpaidInvoices = invoices.filter(
    (inv) => inv.status === 'SENT' || inv.status === 'PARTIAL' || inv.status === 'OVERDUE'
  );
  
  // Outstanding Amount
  const outstandingAmount = unpaidInvoices.reduce(
    (sum, inv) => {
      const unpaidValue = Number(inv.grandTotal) - Number(inv.amountPaid);
      const convertedVal = convertCurrency(unpaidValue, inv.currency, 'INR');
      return sum + convertedVal;
    },
    0
  );

  // Overdue Invoices Count (status is OVERDUE, or SENT/PARTIAL past due date)
  const overdueInvoices = invoices.filter(
    (inv) =>
      inv.status === 'OVERDUE' ||
      ((inv.status === 'SENT' || inv.status === 'PARTIAL') && new Date(inv.dueDate) < today)
  );
  const overdueCount = overdueInvoices.length;

  // This Month's Paid Revenue
  const thisMonthPaidRevenue = invoices
    .filter(
      (inv) =>
        (inv.status === 'PAID' || inv.status === 'PARTIAL') &&
        new Date(inv.paidAt || inv.updatedAt) >= startOfMonth
    )
    .reduce((sum, inv) => sum + convertCurrency(Number(inv.amountPaid), inv.currency, 'INR'), 0);

  // Last Month's Paid Revenue (for trend percentage comparison)
  const lastMonthPaidRevenue = invoices
    .filter(
      (inv) =>
        (inv.status === 'PAID' || inv.status === 'PARTIAL') &&
        new Date(inv.paidAt || inv.updatedAt) >= startOfLastMonth &&
        new Date(inv.paidAt || inv.updatedAt) <= endOfLastMonth
    )
    .reduce((sum, inv) => sum + convertCurrency(Number(inv.amountPaid), inv.currency, 'INR'), 0);

  let revenueTrend: 'up' | 'down' = 'up';
  let revenueChangePercent = 0;
  if (lastMonthPaidRevenue > 0) {
    revenueChangePercent = ((thisMonthPaidRevenue - lastMonthPaidRevenue) / lastMonthPaidRevenue) * 100;
    if (revenueChangePercent < 0) {
      revenueTrend = 'down';
      revenueChangePercent = Math.abs(revenueChangePercent);
    }
  } else if (thisMonthPaidRevenue > 0) {
    revenueChangePercent = 100;
  }

  // Invoices Sent This Month (created/sent this month)
  const invoicesSentThisMonth = invoices.filter(
    (inv) => inv.status !== 'DRAFT' && new Date(inv.issueDate) >= startOfMonth
  ).length;

  // 3. COMPUTE CHART DATA
  // Get monthly revenue for the last 6 months
  const monthlyRevenueData = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(today.getMonth() - i);
    const m = d.getMonth();
    const y = d.getFullYear();
    const mStart = new Date(y, m, 1);
    const mEnd = new Date(y, m + 1, 0, 23, 59, 59, 999);

    const mRevenue = invoices
      .filter(
        (inv) =>
          (inv.status === 'PAID' || inv.status === 'PARTIAL') &&
          new Date(inv.paidAt || inv.updatedAt) >= mStart &&
          new Date(inv.paidAt || inv.updatedAt) <= mEnd
      )
      .reduce((sum, inv) => sum + Number(inv.amountPaid), 0);

    monthlyRevenueData.push({
      month: `${monthNames[m]} ${String(y).slice(-2)}`,
      revenue: mRevenue,
    });
  }

  // Pie chart breakdown: Paid, Pending, Overdue, Draft
  const paidCount = invoices.filter((inv) => inv.status === 'PAID').length;
  const draftCount = invoices.filter((inv) => inv.status === 'DRAFT').length;
  const overduePieCount = overdueCount; // Overdue count computed earlier
  // Pending count includes SENT/PARTIAL not past due date
  const pendingCount = invoices.filter(
    (inv) =>
      (inv.status === 'SENT' || inv.status === 'PARTIAL') && new Date(inv.dueDate) >= today
  ).length;

  const statusData = [
    { name: 'Paid', value: paidCount, color: '#10b981' }, // emerald
    { name: 'Pending', value: pendingCount, color: '#f59e0b' }, // amber
    { name: 'Overdue', value: overduePieCount, color: '#ef4444' }, // red
    { name: 'Draft', value: draftCount, color: '#64748b' }, // slate
  ];

  // Compute stats for each business profile for the Business Hub widget
  const businessesWithStats: BusinessHubItem[] = businesses.map((biz) => {
    const bizInvoices = allInvoices.filter((inv) => inv.businessId === biz.id);
    
    // Compute Outstanding Amount for this business
    const outstanding = bizInvoices
      .filter((inv) => inv.status === 'SENT' || inv.status === 'PARTIAL' || inv.status === 'OVERDUE')
      .reduce((sum, inv) => {
        const unpaidValue = Number(inv.grandTotal) - Number(inv.amountPaid);
        return sum + convertCurrency(unpaidValue, inv.currency, 'INR');
      }, 0);
      
    // Compute Month-to-Date paid revenue for this business
    const revenue = bizInvoices
      .filter((inv) =>
        (inv.status === 'PAID' || inv.status === 'PARTIAL') &&
        new Date(inv.paidAt || inv.updatedAt) >= startOfMonth
      )
      .reduce((sum, inv) => sum + convertCurrency(Number(inv.amountPaid), inv.currency, 'INR'), 0);
      
    return {
      id: biz.id,
      name: biz.name,
      logo: biz.logo,
      currency: biz.currency,
      isDefault: biz.isDefault,
      isActiveProfile: biz.id === activeBusinessId,
      outstandingAmount: outstanding,
      monthlyRevenue: revenue,
    };
  });

  // 4. RECENT INVOICES (Last 5)
  const recentInvoices = invoices.slice(0, 5);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 text-left">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-slate-200/60 dark:border-slate-800/80">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs text-slate-500">Welcome back! Here is a summary of your financial metrics.</p>
        </div>
        
        {/* Quick Shortcut create CTA */}
        <Link href="/invoices/new" className="self-start sm:self-auto">
          <Button className="h-9 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer shadow-md shadow-emerald-500/10">
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Create Invoice</span>
          </Button>
        </Link>
      </div>


      {/* ── Overdue Reminders Alert Card ── */}
      {overdueCount > 0 && (
        <Card className="bg-red-50/50 dark:bg-red-950/10 border border-red-200/80 dark:border-red-900/30 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-950 text-red-650 dark:text-red-400">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-900 dark:text-red-400">
                You have {overdueCount} overdue {overdueCount === 1 ? 'invoice' : 'invoices'}
              </p>
              <p className="text-xs text-red-700/80 dark:text-red-450 mt-0.5">
                Ensure to follow up with clients to collect pending outstanding amounts.
              </p>
            </div>
          </div>
          
          <Link href="/invoices?status=OVERDUE">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-bold border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/20 cursor-pointer"
            >
              <span>View Overdue Invoices</span>
            </Button>
          </Link>
        </Card>
      )}

      {/* ── Stats Grid Row (4 Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Outstanding Amount */}
        <StatCard
          title="Outstanding Amount"
          value={outstandingAmount}
          formatOptions={{ style: 'currency', currency: 'INR' }}
          icon={<FileText className="w-5 h-5" />}
        />

        {/* Overdue Invoices */}
        <StatCard
          title="Overdue Invoices"
          value={overdueCount}
          icon={<AlertCircle className="w-5 h-5 text-red-500" />}
        />

        {/* This Month's Revenue */}
        <StatCard
          title="This Month's Revenue"
          value={thisMonthPaidRevenue}
          change={revenueChangePercent}
          trend={revenueTrend}
          formatOptions={{ style: 'currency', currency: 'INR' }}
          icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}
        />

        {/* Invoices Sent */}
        <StatCard
          title="Invoices Sent (Month)"
          value={invoicesSentThisMonth}
          icon={<BarChart3 className="w-5 h-5 text-blue-500" />}
        />
      </div>

      {/* ── Chart Section ── */}
      <DashboardCharts
        revenueData={monthlyRevenueData}
        statusData={statusData}
        totalInvoices={totalInvoices}
      />

      {/* ── Recent Activity & Quick Actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left: Recent Invoices Table (span 2) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100">
              Recent Invoices
            </h3>
            <Link
              href="/invoices"
              className="text-xs font-bold text-emerald-600 dark:text-emerald-455 hover:underline flex items-center gap-0.5"
            >
              <span>View All Invoices</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-200/60 dark:border-slate-800/60 text-xs font-bold text-slate-500 uppercase">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {recentInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                      No invoices found for the selected business entities.
                    </td>
                  </tr>
                ) : (
                  recentInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b border-slate-200/40 dark:border-slate-800/40 hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-850 dark:text-slate-150">
                        <Link href={`/invoices/${inv.id}`} className="hover:text-emerald-500 hover:underline">
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-350">
                        {inv.client.name}
                      </td>
                      <td className="py-3 px-4 text-slate-450">
                        {formatDate(inv.issueDate)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-850 dark:text-slate-150">
                        <CurrencyAmount amount={Number(inv.grandTotal)} currency={inv.currency} />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={inv.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Sidebar: Quick Actions */}
        <div className="space-y-6">

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-855 dark:text-slate-100">
              Quick Actions
            </h3>
            <Card className="p-5 border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 rounded-xl shadow-sm space-y-3">
              <Link href="/invoices/new" className="block w-full">
                <Button className="w-full h-10 font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer justify-start px-4">
                  <Plus className="w-4 h-4 mr-2 shrink-0" />
                  <span>Create New Invoice</span>
                </Button>
              </Link>
              
              <Link href="/clients" className="block w-full">
                <Button variant="outline" className="w-full h-10 font-bold text-xs border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-250 cursor-pointer justify-start px-4">
                  <Users className="w-4 h-4 mr-2 shrink-0 text-indigo-500" />
                  <span>Manage Customers</span>
                </Button>
              </Link>

              <Link href="/reports" className="block w-full">
                <Button variant="outline" className="w-full h-10 font-bold text-xs border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-250 cursor-pointer justify-start px-4">
                  <BarChart3 className="w-4 h-4 mr-2 shrink-0 text-blue-500" />
                  <span>View Tax Reports</span>
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
