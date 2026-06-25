import React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { getCollectionDashboardMetrics } from '@/lib/db/collection-analytics';
import { getViewAnalytics } from '@/lib/view-intelligence';
import DashboardClient from '@/components/dashboard/DashboardClient';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

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

  // 1. Fetch ALL invoices of the user first (to determine welcome state and active business context)
  const allInvoices = await prisma.invoice.findMany({
    where: {
      userId: user.id,
    },
    take: 1, // Just checking if there are any invoices at all
  });

  // ── EMPTY WELCOME STATE FOR NEW USERS ──
  // Show welcome onboarding screen if the user has 0 invoices
  if (allInvoices.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center space-y-6 max-w-md mx-auto">
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

        <Link href="/invoices/new" className="w-full">
          <Button className="w-full h-11 font-bold text-sm bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer shadow-md">
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

  // Fallback check: if cookie business ID is not 'all' and not in user's business list, fallback to first
  if (activeBusinessId !== 'all') {
    const hasBusiness = businesses.some((b) => b.id === activeBusinessId);
    if (!hasBusiness) {
      const defaultBusiness = businesses.find((b) => b.isDefault) || businesses[0];
      activeBusinessId = defaultBusiness ? defaultBusiness.id : undefined;
    }
  }

  // 2. FETCH DASHBOARD METRICS FROM DB (SERVER-SIDE SSR)
  const dashboardData = await getCollectionDashboardMetrics(user.id, activeBusinessId);
  const viewAnalytics = await getViewAnalytics(user.id, activeBusinessId);
  
  const combinedMetrics = {
    ...dashboardData,
    viewAnalytics,
  };

  // Serialize Decimal objects or nested dates before sending to Client Component
  const serializedData = JSON.parse(JSON.stringify(combinedMetrics));

  // Serialize business profiles for selection list
  const serializedBusinesses = businesses.map(b => ({
    id: b.id,
    name: b.name,
    logo: b.logo,
    currency: b.currency,
    isDefault: b.isDefault
  }));

  return (
    <DashboardClient
      initialData={serializedData}
      businessId={activeBusinessId || 'all'}
      businessesList={serializedBusinesses}
    />
  );
}
