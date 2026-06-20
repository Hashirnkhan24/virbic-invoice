'use client';

import { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { FileSpreadsheet, Menu, X } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface LandingLayoutProps {
  children: ReactNode;
}

export default function LandingLayout({ children }: LandingLayoutProps) {
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-950 transition-colors duration-200">
      {/* Sticky Header Nav */}
      <header
        className={cn(
          "sticky top-0 z-40 w-full h-16 transition-all duration-300",
          scrolled
            ? "bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 shadow-sm"
            : "bg-transparent text-slate-800 dark:text-slate-100"
        )}
      >
        <div className="max-w-[1280px] mx-auto h-full px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/virbic-logo.svg" alt="Virbic Logo" className="w-8 h-8 object-contain" />
            <span className="text-lg font-bold tracking-tight text-blue-600 dark:text-blue-400">
              Virbic
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
            <Link href="#features" className="hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
              Features
            </Link>
            <Link href="#templates" className="hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
              Templates
            </Link>
            <Link href="#pricing" className="hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
              Pricing
            </Link>
            <Link href="#how-it-works" className="hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
              How it Works
            </Link>
          </nav>

          {/* Call to Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                "text-slate-600 hover:text-emerald-600 hover:bg-emerald-50/50 dark:text-slate-400 dark:hover:text-emerald-400 dark:hover:bg-emerald-950/20"
              )}
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({ variant: 'default', size: 'sm' }),
                "bg-primary hover:bg-emerald-600 text-white shadow-sm font-semibold rounded-lg px-4 py-2 transition-all duration-200 shadow-glow"
              )}
            >
              Get Started Free
            </Link>
          </div>

          {/* Hamburger (Mobile) */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black md:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 bottom-0 right-0 z-50 w-64 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-6 md:hidden shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <span className="text-lg font-bold text-slate-900 dark:text-slate-50">
                  Navigation
                </span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex flex-col gap-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                <Link
                  href="#features"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors py-1 border-b border-slate-50 dark:border-slate-800/40"
                >
                  Features
                </Link>
                <Link
                  href="#templates"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors py-1 border-b border-slate-50 dark:border-slate-800/40"
                >
                  Templates
                </Link>
                <Link
                  href="#pricing"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors py-1 border-b border-slate-50 dark:border-slate-800/40"
                >
                  Pricing
                </Link>
                <Link
                  href="#how-it-works"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors py-1 border-b border-slate-50 dark:border-slate-800/40"
                >
                  How it Works
                </Link>
              </nav>

              <div className="mt-auto flex flex-col gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                <Link
                  href="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'default' }),
                    "w-full text-center"
                  )}
                >
                  Sign In
                </Link>
                <Link
                  href="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    buttonVariants({ variant: 'default', size: 'default' }),
                    "w-full bg-primary text-white text-center shadow-glow font-semibold"
                  )}
                >
                  Get Started Free
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Page Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* 4-Column Footer */}
      <footer className="border-t border-slate-200/60 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/30 py-16 transition-colors">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Brand Column */}
            <div className="col-span-2 md:col-span-1 space-y-4">
              <div className="flex items-center gap-2.5">
                <img src="/virbic-logo.svg" alt="Virbic Logo" className="w-7 h-7 object-contain" />
                <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                  Virbic
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Beautiful, Dead-Simple GST Invoice Generator for Indian Freelancers & Small Businesses.
              </p>
              <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                    <path d="M9 18c-4.51 2-5-2-7-2" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Product Column */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Product
              </h4>
              <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                <li><Link href="#features" className="hover:text-emerald-500 transition-colors">Features</Link></li>
                <li><Link href="#templates" className="hover:text-emerald-500 transition-colors">Templates</Link></li>
                <li><Link href="#pricing" className="hover:text-emerald-500 transition-colors">Pricing</Link></li>
                <li><Link href="/dashboard" className="hover:text-emerald-500 transition-colors">Live Dashboard</Link></li>
              </ul>
            </div>

            {/* Resources Column */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Resources
              </h4>
              <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                <li><a href="#" className="hover:text-emerald-500 transition-colors">GST Compliance Guide</a></li>
                <li><a href="#" className="hover:text-emerald-500 transition-colors">Tax Calculator India</a></li>
                <li><a href="#" className="hover:text-emerald-500 transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-emerald-500 transition-colors">API Docs</a></li>
              </ul>
            </div>

            {/* Company Column */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Company
              </h4>
              <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                <li><a href="#" className="hover:text-emerald-500 transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-emerald-500 transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-emerald-500 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-emerald-500 transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-200/50 dark:border-slate-800/50 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center sm:text-left">
              &copy; {new Date().getFullYear()} Virbic. Developed by <a href="https://amplivate.in" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold underline text-slate-500 hover:text-sky-500 transition-colors"><img src="/amplivate-logo.svg" alt="Amplivate Logo" className="w-3.5 h-3.5 object-contain" /> Amplivate</a>.
            </p>
            <div className="flex gap-4 text-[11px] text-slate-400 dark:text-slate-500">
              <a href="#" className="hover:underline">Security</a>
              <a href="#" className="hover:underline">System Status</a>
              <a href="#" className="hover:underline">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
