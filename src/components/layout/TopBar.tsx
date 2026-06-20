'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Plus, Menu, LogOut, User as UserIcon } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useClerk, useUser } from '@clerk/nextjs';
import BusinessSelector from '@/components/business/BusinessSelector';
import Image from 'next/image';

interface TopBarProps {
  onToggleSidebar: () => void;
}

export default function TopBar({ onToggleSidebar }: TopBarProps) {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user, isLoaded } = useUser();

  // Create friendly breadcrumb labels
  const getBreadcrumbs = () => {
    const paths = pathname.split('/').filter((p) => p);
    if (paths.length === 0) return [{ label: 'Home', href: '/' }];

    return paths.map((path, idx) => {
      const href = '/' + paths.slice(0, idx + 1).join('/');
      let label = path.charAt(0).toUpperCase() + path.slice(1);

      // Handle specific mappings
      if (path === 'new') label = 'Create';
      if (path === 'edit') label = 'Edit';
      
      // If it looks like a database CUID (25 chars standard format)
      if (path.length >= 20) {
        label = 'Details';
      }

      return { label, href };
    });
  };

  const breadcrumbs = getBreadcrumbs();

  const displayName = user?.firstName || user?.username || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'User';
  const avatarUrl = user?.imageUrl;

  return (
    <header className="sticky top-0 right-0 left-0 z-30 flex items-center justify-between h-16 px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 transition-colors">
      {/* Left Area: Hamburger (Mobile) + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="md:hidden text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
        >
          <Menu className="w-5 h-5" />
        </Button>

        <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-sm">
          {breadcrumbs.map((crumb, idx) => (
            <div key={crumb.href} className="flex items-center gap-1.5">
              {idx > 0 && <span className="text-slate-300 dark:text-slate-700">/</span>}
              <Link
                href={crumb.href}
                className={
                  idx === breadcrumbs.length - 1
                    ? 'font-semibold text-slate-800 dark:text-slate-200 pointer-events-none'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors'
                }
              >
                {crumb.label}
              </Link>
            </div>
          ))}
        </nav>
      </div>

      {/* Right Area: Actions + Notifications + Business Switcher + User */}
      <div className="flex items-center gap-4">
        {/* Business Switcher Dropdown */}
        <div className="hidden xs:block">
          <BusinessSelector />
        </div>

        {/* Notifications Icon */}
        <Button
          variant="ghost"
          size="icon"
          className="relative text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
        </Button>

        {/* Create Invoice button */}
        <Link
          href="/invoices/new"
          className={cn(
            buttonVariants({ variant: 'default', size: 'default' }),
            "bg-primary hover:bg-emerald-600 text-white shadow-sm font-semibold rounded-lg text-xs xs:text-sm px-3.5 py-2 transition-all duration-200"
          )}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden xs:inline">New Invoice</span>
        </Link>

        {/* User Avatar + Dropdown */}
        {isLoaded && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer outline-none">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  width={28}
                  height={28}
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-emerald-500/30"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-white" />
                </div>
              )}
              <span className="hidden md:block text-xs font-semibold text-slate-700 dark:text-slate-300 max-w-[120px] truncate">
                {displayName}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg">
              <DropdownMenuLabel className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {user?.emailAddresses?.[0]?.emailAddress || 'My Account'}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
              <DropdownMenuItem
                onClick={() => signOut({ redirectUrl: '/sign-in' })}
                className="text-xs font-semibold cursor-pointer text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/30 flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
