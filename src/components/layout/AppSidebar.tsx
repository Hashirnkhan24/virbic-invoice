'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  BarChart3,
  Settings,
  LogOut,
  X,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  invoicesCount?: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function AppSidebar({
  isOpen,
  onClose,
  invoicesCount = 0,
  isCollapsed,
  onToggleCollapse,
}: AppSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Invoices',
      href: '/invoices',
      icon: FileText,
      badge: invoicesCount > 0 ? invoicesCount : undefined,
    },
    {
      label: 'Clients',
      href: '/clients',
      icon: Users,
    },
    {
      label: 'Items & Catalog',
      href: '/items',
      icon: Package,
    },
    {
      label: 'Reports & Tax',
      href: '/reports',
      icon: BarChart3,
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: Settings,
    },
  ];

  // Motion animation variables
  const sidebarVariants = {
    open: { x: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 30 } },
    closed: { x: '-100%', transition: { type: 'spring' as const, stiffness: 300, damping: 30 } },
  };

  const itemContainerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const navItemVariants = {
    initial: { opacity: 0, x: -10 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Main Sidebar */}
      <motion.aside
        variants={sidebarVariants}
        animate={isOpen ? 'open' : 'closed'}
        initial="closed"
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200/60 dark:border-slate-800/60 shadow-sm md:translate-x-0 transition-all duration-300 ease-in-out",
          isCollapsed ? "md:w-[70px] w-[260px]" : "w-[260px]"
        )}
      >
        {/* Header Branding */}
        <div
          className={cn(
            "flex items-center h-16 border-b border-slate-200/60 dark:border-slate-800/60 transition-all duration-300",
            isCollapsed ? "md:justify-center md:px-0 justify-between px-6" : "justify-between px-6"
          )}
        >
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <img src="/virbic-logo.svg" alt="Virbic Logo" className="w-9 h-9 object-contain shrink-0" />
            {(!isCollapsed || (isCollapsed && typeof window !== 'undefined' && window.innerWidth < 768)) && (
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-sky-500 dark:from-blue-400 dark:to-sky-400 bg-clip-text text-transparent">
                Virbic
              </span>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="md:hidden text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation Items */}
        <nav className={cn("flex-1 py-6 overflow-y-auto transition-all duration-300", isCollapsed ? "md:px-2 px-4" : "px-4")}>
          <motion.ul
            variants={itemContainerVariants}
            initial="initial"
            animate="animate"
            className="space-y-1.5"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));

              return (
                <motion.li key={item.label} variants={navItemVariants}>
                  <Link
                    href={item.href}
                    title={isCollapsed ? item.label : undefined}
                    onClick={() => {
                      if (window.innerWidth < 768) onClose();
                    }}
                    className={cn(
                      "flex items-center rounded-lg text-sm transition-all duration-200 group border border-transparent relative",
                      isCollapsed
                        ? "md:justify-center md:px-0 md:w-10 md:h-10 md:mx-auto justify-between px-3.5 py-2.5"
                        : "justify-between px-3.5 py-2.5",
                      isActive
                        ? "bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400 font-semibold border-r-2 border-r-sky-500 dark:border-r-sky-400"
                        : "text-slate-650 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    )}
                  >
                    <div className={cn("flex items-center", isCollapsed ? "md:gap-0 gap-3" : "gap-3")}>
                      <Icon
                        className={cn(
                          "w-4.5 h-4.5 transition-colors shrink-0",
                          isActive
                            ? "text-sky-500 dark:text-sky-400"
                            : "text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-400"
                        )}
                      />
                      {(!isCollapsed || (isCollapsed && typeof window !== 'undefined' && window.innerWidth < 768)) && (
                        <span>{item.label}</span>
                      )}
                    </div>
                    {item.badge !== undefined && (
                      isCollapsed ? (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-sky-500 border border-white dark:border-slate-900 md:block hidden" />
                      ) : (
                        <span className="flex items-center justify-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400 border border-sky-200/50 dark:border-sky-800/30">
                          {item.badge}
                        </span>
                      )
                    )}
                  </Link>
                </motion.li>
              );
            })}
          </motion.ul>
        </nav>

        {/* Collapse Toggle Bar (Desktop Only) */}
        <div
          className={cn(
            "hidden md:flex border-t border-slate-200/40 dark:border-slate-800/40 py-2 transition-all duration-300",
            isCollapsed ? "justify-center px-0" : "justify-end px-4"
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-8 w-8 text-slate-450 hover:text-slate-850 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-lg cursor-pointer"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {/* Footer Profile Block */}
        <div
          className={cn(
            "border-t border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 transition-all duration-300",
            isCollapsed ? "md:p-2 md:flex md:justify-center p-4" : "p-4"
          )}
        >
          <div
            className={cn(
              "flex items-center gap-3",
              isCollapsed ? "md:justify-center md:w-auto w-full justify-between" : "justify-between w-full"
            )}
          >
            <div className={cn("flex items-center gap-2.5", isCollapsed ? "md:overflow-visible overflow-hidden" : "overflow-hidden")}>
              <Avatar className="w-9 h-9 border border-slate-200 dark:border-slate-800 shrink-0">
                <AvatarImage src="" />
                <AvatarFallback className="bg-emerald-500 text-white font-bold text-xs uppercase">
                  JD
                </AvatarFallback>
              </Avatar>
              {(!isCollapsed || (isCollapsed && typeof window !== 'undefined' && window.innerWidth < 768)) && (
                <div className="flex flex-col text-left overflow-hidden">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                    John Doe
                  </span>
                  <span className="text-[11px] text-slate-400 truncate">
                    john@example.com
                  </span>
                </div>
              )}
            </div>
            {(!isCollapsed || (isCollapsed && typeof window !== 'undefined' && window.innerWidth < 768)) && (
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </motion.aside>
    </>
  );
}
