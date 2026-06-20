'use client';

import { usePathname } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // If we are on the onboarding route, render full-screen without sidebar/topbar
  if (pathname === '/onboarding') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
        {children}
      </div>
    );
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
