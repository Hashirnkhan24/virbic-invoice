'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Zap,
  Calculator,
  Palette,
  QrCode,
  Repeat,
  FileText,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Menu,
  X,
  FileSpreadsheet,
  Building,
  CreditCard,
  User,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@clerk/nextjs';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import TemplateRenderer, { TEMPLATE_META } from '@/components/invoice-templates/TemplateRenderer';
import { TemplateName, DEFAULT_SETTINGS } from '@/components/invoice-templates/types';
import { Button } from '@/components/ui/button';

// Grayscale marquee items
const MARQUEE_ITEMS = [
  "Freelancers",
  "Design Studios",
  "Software Agencies",
  "Tax Consultants",
  "Copywriters",
  "SaaS Startups",
  "E-Commerce Sellers",
];

// Testimonials data
const TESTIMONIALS = [
  {
    quote: "Virbic made GST calculations fully hands-off. I input my items, it determines CGST and SGST correctly, and my client pays instantly via the UPI QR. Absolutely brilliant product.",
    author: "Priya S.",
    role: "Freelance Brand Designer",
    avatarLetter: "P",
  },
  {
    quote: "No more clunky accounting sheets. Virbic is fast, clean, and lets me generate GSTR-1 summaries in one click. It has saved me hours of administrative headache.",
    author: "Rohan M.",
    role: "SaaS Developer & Consultant",
    avatarLetter: "R",
  },
  {
    quote: "I own a small marketing agency. Having multiple business profiles and generating clean invoice PDFs with our brand color makes us look extremely professional.",
    author: "Aditi K.",
    role: "Agency Founder",
    avatarLetter: "A",
  },
];

// Templates data
const TEMPLATE_PREVIEWS = [
  {
    id: 'modern' as TemplateName,
    name: 'Modern',
    desc: 'Clean layouts with emerald accents',
    border: 'border-t-4 border-emerald-500',
    bg: 'bg-emerald-500/10 dark:bg-emerald-950/20',
    color: 'text-emerald-500',
  },
  {
    id: 'minimal' as TemplateName,
    name: 'Minimal',
    desc: 'Ultra-clean design with lots of whitespace',
    border: 'border-l-4 border-slate-400',
    bg: 'bg-slate-50 dark:bg-slate-800/40',
    color: 'text-slate-400',
  },
  {
    id: 'professional' as TemplateName,
    name: 'Professional',
    desc: 'Navy header bars and structured blocks',
    border: 'border-t-8 border-indigo-600',
    bg: 'bg-indigo-500/10 dark:bg-indigo-950/20',
    color: 'text-indigo-600',
  },
  {
    id: 'creative' as TemplateName,
    name: 'Creative',
    desc: 'Gradient accents and modern styles',
    border: 'border-t-4 border-violet-500',
    bg: 'bg-gradient-to-tr from-emerald-500/10 to-violet-500/10',
    color: 'text-violet-500',
  },
  {
    id: 'dark' as TemplateName,
    name: 'Dark Mode',
    desc: 'Dark layouts styled for digital tech brands',
    border: 'border border-slate-800',
    bg: 'bg-slate-900',
    color: 'text-white/80',
    darkText: true,
  },
];

// Mock Invoice data for template preview
const mockInvoice = {
  invoiceNumber: 'INV/2026/042',
  issueDate: '2026-06-20T12:00:00.000Z',
  dueDate: '2026-07-20T12:00:00.000Z',
  currency: 'INR',
  placeOfSupply: '27',
  reverseCharge: false,
  isInterState: false,
  subTotal: 10000,
  discountTotal: 1000,
  taxableAmount: 9000,
  cgstTotal: 810,
  sgstTotal: 810,
  igstTotal: 0,
  cessTotal: 0,
  roundOff: 0,
  grandTotal: 10620,
  notes: 'Thank you for your business!',
  terms: 'Please settle this payment within the due date.',
  business: {
    name: 'Virbic Studio Ltd',
    gstin: '27AAAAA1111A1Z1',
    address: '404 Innovation Hub, Bandra Kurla Complex',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400051',
  },
  client: {
    name: 'Acme Corporation',
    gstin: '27BBBBB2222B2Z2',
    email: 'finance@acme.com',
    phone: '9988776655',
    billingAddress: '789 Enterprise Lane',
    billingCity: 'Pune',
    billingState: '27',
    billingPincode: '411001',
  },
  lineItems: [
    {
      description: 'Software Integration & Consultations',
      hsnCode: '9983',
      quantity: 1,
      unit: 'HRS',
      rate: 10000,
      discount: 10,
      discountType: 'PERCENTAGE' as const,
      gstRate: 18,
    },
  ],
};

const mockTotals = {
  subTotal: mockInvoice.subTotal,
  discountTotal: mockInvoice.discountTotal,
  taxableAmount: mockInvoice.taxableAmount,
  cgstTotal: mockInvoice.cgstTotal,
  sgstTotal: mockInvoice.sgstTotal,
  igstTotal: mockInvoice.igstTotal,
  cessTotal: mockInvoice.cessTotal,
  roundOff: mockInvoice.roundOff,
  grandTotal: mockInvoice.grandTotal,
};

export default function LandingPage() {
  const { isSignedIn } = useAuth();
  const getStartedUrl = isSignedIn ? '/dashboard' : '/onboarding';

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateName | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateName>('modern');

  // Monitor scroll for header background transform
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const handlePrevTestimonial = () => {
    setActiveTestimonial((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  };

  const handleNextTestimonial = () => {
    setActiveTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
  };

  return (
    <div className="relative min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-x-hidden selection:bg-emerald-500/20 selection:text-emerald-700">
      
      {/* 1. STICKY NAVIGATION BAR */}
      <motion.header
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-16 flex items-center justify-between px-6 md:px-12",
          scrolled
            ? "bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shadow-sm border-b border-slate-200/40 dark:border-slate-800/40"
            : "bg-transparent text-slate-900 dark:text-slate-100"
        )}
      >
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 z-55">
          <img src="/virbic-logo.svg" alt="Virbic Logo" className="w-9 h-9 object-contain" />
          <span className="text-xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-sky-500 dark:from-blue-400 dark:to-sky-400 bg-clip-text text-transparent">
            Virbic
          </span>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold">
          <a
            href="#features"
            className="hover:text-sky-500 transition-colors text-slate-600 dark:text-slate-350 dark:hover:text-sky-400"
          >
            Features
          </a>
          <a
            href="#templates"
            className="hover:text-sky-500 transition-colors text-slate-600 dark:text-slate-350 dark:hover:text-sky-400"
          >
            Templates
          </a>
          <a
            href="#pricing"
            className="hover:text-sky-500 transition-colors text-slate-600 dark:text-slate-350 dark:hover:text-sky-400"
          >
            Pricing
          </a>
          <a
            href="#how-it-works"
            className="hover:text-sky-500 transition-colors text-slate-600 dark:text-slate-350 dark:hover:text-sky-400"
          >
            How it Works
          </a>
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              "font-bold hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
            )}
          >
            Sign In
          </Link>
          <Link
            href={getStartedUrl}
            className={cn(
              buttonVariants({ variant: 'default', size: 'sm' }),
              "bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm px-4.5 cursor-pointer"
            )}
          >
            Get Started Free
          </Link>
        </div>

        {/* Mobile Hamburger Trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 z-55 cursor-pointer"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </motion.header>

      {/* Slide-out Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-0 z-40 bg-white dark:bg-slate-950 md:hidden pt-20 px-6 flex flex-col justify-between pb-8"
          >
            <nav className="flex flex-col gap-6 text-lg font-bold text-slate-800 dark:text-slate-200">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-sky-500"
              >
                Features
              </a>
              <a
                href="#templates"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-sky-500"
              >
                Templates
              </a>
              <a
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-sky-500"
              >
                Pricing
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-sky-500"
              >
                How it Works
              </a>
            </nav>

            <div className="flex flex-col gap-4">
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg' }),
                  "w-full font-bold border-slate-200 text-slate-800 dark:border-slate-800 dark:text-slate-250 cursor-pointer"
                )}
              >
                Sign In
              </Link>
              <Link
                href={getStartedUrl}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  buttonVariants({ variant: 'default', size: 'lg' }),
                  "w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                )}
              >
                Get Started Free
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. HERO SECTION */}
      <section className="relative pt-24 pb-20 md:pt-36 md:pb-32 bg-gradient-to-br from-sky-50/50 via-violet-50/30 to-white dark:from-slate-950 dark:via-slate-900/40 dark:to-slate-950">
        
        {/* Subtle background SVG shapes */}
        <div className="absolute inset-0 z-0 opacity-20 dark:opacity-10 pointer-events-none overflow-hidden">
          <svg className="absolute top-12 left-12 w-64 h-64 text-sky-400" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="6,4" />
          </svg>
          <svg className="absolute bottom-20 right-10 w-96 h-96 text-violet-400" viewBox="0 0 100 100">
            <rect x="5" y="5" width="90" height="90" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="10,5" />
          </svg>
        </div>

        <div className="max-w-[1280px] mx-auto px-6 md:px-12 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            
            {/* Left Column (60%) */}
            <div className="lg:col-span-7 space-y-6 text-left">
              {/* Flag Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm"
              >
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span>🇮🇳</span> Made for Indian Businesses & Freelancers
                </span>
              </motion.div>

              {/* Staggered Heading */}
              <motion.div
                initial="initial"
                animate="animate"
                variants={{
                  animate: { transition: { staggerChildren: 0.1 } }
                }}
                className="space-y-4"
              >
                <motion.h1
                  variants={{
                    initial: { opacity: 0, y: 30 },
                    animate: { opacity: 1, y: 0 }
                  }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-950 dark:text-slate-50 leading-[1.1] sm:leading-[1.15]"
                >
                  Beautiful{' '}
                  <span className="text-emerald-600 dark:text-emerald-400">Invoices</span>.
                  <br />
                  <span className="text-violet-600 dark:text-violet-400">Zero</span> GST Headaches.
                </motion.h1>
                <motion.p
                  variants={{
                    initial: { opacity: 0, y: 30 },
                    animate: { opacity: 1, y: 0 }
                  }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="text-lg text-slate-650 dark:text-slate-400 max-w-xl leading-relaxed"
                >
                  Create GST-compliant, professional invoices in under 60 seconds. Customize templates, generate dynamic payment QR codes, and export GSTR reports instantly.
                </motion.p>
              </motion.div>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2"
              >
                <Link
                  href={getStartedUrl}
                  className={cn(
                    buttonVariants({ variant: 'default', size: 'lg' }),
                    "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 font-bold px-7 py-4 rounded-lg flex items-center justify-center gap-2 group transition-all cursor-pointer"
                  )}
                >
                  <span>Create Free Invoice</span>
                  <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#templates"
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'lg' }),
                    "border-slate-200 hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:text-slate-350 dark:hover:bg-slate-900 px-7 py-4 rounded-lg flex items-center justify-center font-bold"
                  )}
                >
                  See Templates
                </a>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-xs text-slate-400 dark:text-slate-500 font-semibold"
              >
                Free forever for 5 invoices/month. No credit card required.
              </motion.p>
            </div>

            {/* Right Column (40%) - Floating Mockup */}
            <div className="lg:col-span-5 relative flex justify-center items-center">
              {/* Blur backdrop */}
              <div className="absolute w-80 h-80 bg-sky-400/20 dark:bg-sky-800/10 rounded-full blur-3xl -z-10" />

              {/* Rotated Mockup Card */}
              <motion.div
                initial={{ opacity: 0, x: 50, rotate: 0 }}
                animate={{ opacity: 1, x: 0, rotate: -2 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 80 }}
                className="w-full max-w-[390px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl p-6 relative overflow-hidden"
              >
                <div className="absolute top-4 right-4 rotate-12 border-2 border-sky-500 text-sky-500 font-bold text-xs px-2.5 py-0.5 rounded uppercase tracking-wider">
                  Paid
                </div>

                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    V
                  </div>
                  <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Virbic Studio</span>
                </div>

                <div className="mt-4 space-y-1">
                  <div className="text-[10px] text-slate-450 uppercase tracking-wider font-bold">Billed To</div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-200">Priya Sharma</div>
                  <div className="text-[10px] text-slate-500 font-medium">priya@sharmadesign.com</div>
                </div>

                <div className="mt-6 border-t border-b border-slate-100 dark:border-slate-800 py-3 space-y-2">
                  <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                    <span>Logo & Branding</span>
                    <span className="font-mono text-slate-900 dark:text-slate-250">₹20,000.00</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-450 font-medium">
                    <span>GST (18%)</span>
                    <span className="font-mono">₹3,600.00</span>
                  </div>
                </div>

                <div className="mt-4 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Total</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-450 font-mono">₹23,600.00</span>
                </div>
              </motion.div>

              {/* Floating Self-Bobbing Cards */}
              {/* Card 1: Paid status */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-6 right-0 bg-gradient-to-b from-sky-400 to-sky-600 text-white text-xs font-extrabold py-2 px-3.5 rounded-lg shadow-[0_8px_20px_-4px_rgba(14,165,233,0.4),inset_0_1.5px_0_rgba(255,255,255,0.35),inset_0_-1.5px_0_rgba(0,0,0,0.15)] flex items-center gap-1.5 border border-sky-500/20"
              >
                <Check className="w-3.5 h-3.5 animate-pulse" />
                <span>Paid ₹23,600</span>
              </motion.div>

              {/* Card 2: GST Check */}
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                className="absolute top-1/2 -left-6 bg-gradient-to-b from-violet-500 to-violet-700 text-white text-xs font-semibold py-2 px-3.5 rounded-lg shadow-[0_8px_20px_-4px_rgba(109,40,217,0.4),inset_0_1.5px_0_rgba(255,255,255,0.35),inset_0_-1.5px_0_rgba(0,0,0,0.15)] flex items-center gap-1.5 border border-violet-600/20"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-violet-200" />
                <span>GST Calculated ✓</span>
              </motion.div>

              {/* Card 3: PDF Ready */}
              <motion.div
                animate={{ y: [0, -7, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute -bottom-4 left-6 bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 text-slate-800 dark:text-slate-100 text-xs font-semibold py-2 px-3.5 rounded-lg shadow-[0_8px_20px_-4px_rgba(0,0,0,0.1),inset_0_1.5px_0_rgba(255,255,255,0.8),inset_0_-1.5px_0_rgba(0,0,0,0.05)] dark:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.3),inset_0_1.5px_0_rgba(255,255,255,0.15),inset_0_-1.5px_0_rgba(0,0,0,0.2)] flex items-center gap-1.5 border border-slate-200/60 dark:border-slate-800/80"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-500" />
                <span>PDF Ready ✓</span>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. LOGO MARQUEE */}
      <section className="border-t border-b border-slate-150 dark:border-slate-900 bg-white dark:bg-slate-950 py-8 relative overflow-hidden">
        <div className="max-w-[1280px] mx-auto px-6 mb-4 text-center">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Trusted by 2,000+ freelancers & small businesses across India
          </p>
        </div>

        {/* Infinite marquee */}
        <div className="flex w-full overflow-hidden mask-gradient">
          <div className="flex gap-16 py-3 whitespace-nowrap animate-marquee">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, idx) => (
              <span
                key={`${item}-${idx}`}
                className="text-lg sm:text-xl font-black text-slate-400 dark:text-slate-650 hover:text-slate-650 dark:hover:text-slate-400 cursor-default select-none tracking-tight transition-colors"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 4. FEATURES GRID SECTION */}
      <section id="features" className="py-20 md:py-28 bg-slate-50/50 dark:bg-slate-900/10">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          {/* Header */}
          <div className="text-center max-w-xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-black tracking-widest text-emerald-600 dark:text-emerald-400 uppercase">
              Invoicing, not accounting
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-950 dark:text-slate-55 tracking-tight leading-tight">
              Everything you need.<br />Nothing you don&apos;t.
            </h3>
            <p className="text-sm text-slate-550 dark:text-slate-400">
              Forget heavy spreadsheets. Virbic is lightweight, fast, and engineered specifically for independent creators and agile business owners.
            </p>
          </div>

          {/* Cards Grid */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-100px' }}
            variants={{
              animate: { transition: { staggerChildren: 0.1 } }
            }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {/* Feature 1 */}
            <motion.div
              variants={{
                initial: { opacity: 0, y: 20 },
                animate: { opacity: 1, y: 0 }
              }}
              whileHover={{ y: -5, boxShadow: 'var(--shadow-xl)' }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800/60 p-6 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="inline-flex p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mb-4 shadow-sm">
                <Zap className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">60-Second Invoices</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Create, customize, and finalize a beautiful client invoice in under a minute. Faster than brewing a cup of coffee.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              variants={{
                initial: { opacity: 0, y: 20 },
                animate: { opacity: 1, y: 0 }
              }}
              whileHover={{ y: -5, boxShadow: 'var(--shadow-xl)' }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800/60 p-6 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="inline-flex p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mb-4 shadow-sm">
                <Calculator className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">Auto GST Calculation</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Input your state and your client&apos;s state. We dynamically calculate CGST, SGST, or IGST, generating a compliant tax invoice instantly.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              variants={{
                initial: { opacity: 0, y: 20 },
                animate: { opacity: 1, y: 0 }
              }}
              whileHover={{ y: -5, boxShadow: 'var(--shadow-xl)' }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800/60 p-6 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="inline-flex p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mb-4 shadow-sm">
                <Palette className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">10 Stunning Templates</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                From minimal and typography-focused to bold startup colors. Match your brand color with professional templates.
              </p>
            </motion.div>

            {/* Feature 4 */}
            <motion.div
              variants={{
                initial: { opacity: 0, y: 20 },
                animate: { opacity: 1, y: 0 }
              }}
              whileHover={{ y: -5, boxShadow: 'var(--shadow-xl)' }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800/60 p-6 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="inline-flex p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mb-4 shadow-sm">
                <QrCode className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">UPI QR Code Integrations</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                We generate a dynamic UPI payment QR code directly on the PDF. Clients scan using any app (GPay, PhonePe, BHIM) and pay instantly.
              </p>
            </motion.div>

            {/* Feature 5 */}
            <motion.div
              variants={{
                initial: { opacity: 0, y: 20 },
                animate: { opacity: 1, y: 0 }
              }}
              whileHover={{ y: -5, boxShadow: 'var(--shadow-xl)' }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800/60 p-6 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="inline-flex p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mb-4 shadow-sm">
                <Repeat className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">Recurring Retainers</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Bill clients monthly? Set up recurring schedules. We&apos;ll automatically draft and queue the invoices for your approval.
              </p>
            </motion.div>

            {/* Feature 6 */}
            <motion.div
              variants={{
                initial: { opacity: 0, y: 20 },
                animate: { opacity: 1, y: 0 }
              }}
              whileHover={{ y: -5, boxShadow: 'var(--shadow-xl)' }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800/60 p-6 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="inline-flex p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mb-4 shadow-sm">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">GST Reports Ready</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Download a clean, structured tax summary grouped by client GSTIN and HSN codes, making GSTR-1 filings simple and error-free.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 5. HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-20 md:py-28 bg-white dark:bg-slate-950">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          {/* Header */}
          <div className="text-center max-w-xl mx-auto mb-20 space-y-3">
            <h2 className="text-xs font-black tracking-widest text-emerald-600 dark:text-emerald-400 uppercase">
              How it works
            </h2>
            <h3 className="text-3xl font-extrabold text-slate-950 dark:text-slate-50 tracking-tight">
              From Idea to Invoice in 3 Steps
            </h3>
            <p className="text-sm text-slate-500">
              Get set up in minutes and simplify your billing process.
            </p>
          </div>

          {/* Timeline Cards Container */}
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Connecting dotted line (Desktop) */}
            <div className="absolute top-10 left-12 right-12 h-0.5 border-t border-dashed border-slate-200 dark:border-slate-800 hidden md:block z-0" />

            {/* Step 1 */}
            <motion.div
              whileInView={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 30 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5 }}
              className="relative flex flex-col items-center md:items-start text-center md:text-left z-10 space-y-4"
            >
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950 border border-emerald-200/50 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 font-bold text-lg shadow-sm">
                1
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">Set Up Your Profile</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
                Upload your logo, key in your GSTIN/PAN details, choose your brand color, and configure defaults. Takes under 2 minutes.
              </p>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              whileInView={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 30 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="relative flex flex-col items-center md:items-start text-center md:text-left z-10 space-y-4"
            >
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950 border border-emerald-200/50 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 font-bold text-lg shadow-sm">
                2
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">Draft Your Invoice</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
                Add line items, select your client details, customize template, and review the live preview on screen. Takes 1 minute.
              </p>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              whileInView={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 30 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative flex flex-col items-center md:items-start text-center md:text-left z-10 space-y-4"
            >
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950 border border-emerald-200/50 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 font-bold text-lg shadow-sm">
                3
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">Send & Get Paid</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
                Share a secure public link, download the PDF, or send via email. Clients pay directly via the integrated UPI QR code.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 6. TEMPLATES SHOWCASE SECTION */}
      <section id="templates" className="py-20 md:py-28 bg-slate-50/50 dark:bg-slate-900/10">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-16 gap-4">
            <div className="space-y-2">
              <h2 className="text-xs font-black tracking-widest text-emerald-600 dark:text-emerald-400 uppercase">
                Impressive designs
              </h2>
              <h3 className="text-3xl font-extrabold text-slate-950 dark:text-slate-50 tracking-tight">
                Invoices that impress
              </h3>
              <p className="text-sm text-slate-500">
                10 professionally designed templates. Pick one, choose a brand color, done.
              </p>
            </div>
            <Link
              href={getStartedUrl}
              className="text-sm font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-1 group"
            >
              <span>Explore All Templates</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Horizontal Gallery */}
          <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-slate-200">
            {TEMPLATE_PREVIEWS.map((tmpl) => (
              <motion.div
                key={tmpl.name}
                whileHover={{ scale: 1.02, y: -4 }}
                onClick={() => {
                  setSelectedTemplate(tmpl.id);
                  setPreviewTemplate(tmpl.id);
                }}
                className={cn(
                  "flex-shrink-0 w-[260px] border rounded-xl p-5 shadow-sm space-y-4 cursor-pointer transition-colors duration-200 hover:border-emerald-500/50 dark:hover:border-emerald-500/30",
                  tmpl.darkText
                    ? "bg-slate-900 border-slate-800 text-white"
                    : "bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                )}
              >
                <div className={cn("h-32 rounded-lg flex items-center justify-center", tmpl.bg, tmpl.border)}>
                  <FileText className={cn("w-9 h-9", tmpl.color)} />
                </div>
                <div>
                  <h4 className="text-sm font-bold">{tmpl.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-1">{tmpl.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. PRICING GRID SECTION */}
      <section id="pricing" className="py-20 md:py-28 bg-white dark:bg-slate-950">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          {/* Header */}
          <div className="text-center max-w-xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-black tracking-widest text-emerald-600 dark:text-emerald-400 uppercase">
              Pricing Plans
            </h2>
            <h3 className="text-3xl font-extrabold text-slate-950 dark:text-slate-50 tracking-tight">
              Simple Pricing. No Surprises.
            </h3>
            <p className="text-sm text-slate-500">
              Start completely free. Upgrade only when your volume expands.
            </p>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {/* Plan 1: Free */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 flex flex-col shadow-sm">
              <div className="space-y-1 mb-6">
                <h4 className="text-xs font-black text-slate-450 tracking-wider">FREE</h4>
                <div className="text-3xl font-bold text-slate-950 dark:text-slate-50">₹0</div>
                <p className="text-[11px] text-slate-400">For trying it out</p>
              </div>
              <ul className="space-y-3.5 text-xs text-slate-650 dark:text-slate-400 mb-8 flex-1">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500 flex-shrink-0" /> 5 invoices/month</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500 flex-shrink-0" /> Basic templates (3)</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500 flex-shrink-0" /> Virbic watermark</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500 flex-shrink-0" /> 1 business profile</li>
              </ul>
              <Link
                href={getStartedUrl}
                className={cn(
                  buttonVariants({ variant: 'outline' }),
                  "w-full text-center font-bold border-slate-200 hover:bg-slate-50 text-slate-800 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900 cursor-pointer"
                )}
              >
                Get Started
              </Link>
            </div>

            {/* Plan 2: Starter */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 flex flex-col shadow-sm">
              <div className="space-y-1 mb-6">
                <h4 className="text-xs font-black text-slate-450 tracking-wider">STARTER</h4>
                <div className="text-3xl font-bold text-slate-950 dark:text-slate-50">
                  ₹149<span className="text-xs text-slate-400 font-normal">/mo</span>
                </div>
                <p className="text-[11px] text-slate-400">For side hustlers</p>
              </div>
              <ul className="space-y-3.5 text-xs text-slate-650 dark:text-slate-400 mb-8 flex-1">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500 flex-shrink-0" /> 15 invoices/month</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500 flex-shrink-0" /> Standard templates (6)</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500 flex-shrink-0" /> No watermark</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500 flex-shrink-0" /> Email delivery</li>
              </ul>
              <Link
                href={getStartedUrl}
                className={cn(
                  buttonVariants({ variant: 'outline' }),
                  "w-full text-center font-bold border-slate-200 hover:bg-slate-50 text-slate-800 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900 cursor-pointer"
                )}
              >
                Start Trial
              </Link>
            </div>

            {/* Plan 3: Pro (HIGHLIGHTED) */}
            <motion.div
              whileHover={{ scale: 1.015 }}
              className="bg-emerald-600 text-white rounded-2xl p-6 flex flex-col shadow-2xl relative lg:-translate-y-2.5 border border-emerald-500 z-10"
            >
              {/* Popular Badge */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-[10px] font-bold py-1 px-3 rounded-full uppercase tracking-wider shadow-md">
                Most Popular
              </div>

              <div className="space-y-1 mb-6">
                <h4 className="text-xs font-black text-emerald-100 tracking-wider">PRO</h4>
                <div className="text-4xl font-extrabold text-white">
                  ₹399<span className="text-xs text-emerald-250 font-normal">/mo</span>
                </div>
                <p className="text-[11px] text-emerald-100">For professionals</p>
              </div>
              <ul className="space-y-3 text-xs text-emerald-50 mb-8 flex-1">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-white flex-shrink-0" /> Unlimited invoices</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-white flex-shrink-0" /> All 10 templates</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-white flex-shrink-0" /> Custom colors & branding</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-white flex-shrink-0" /> Recurring invoices</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-white flex-shrink-0" /> Payment reminders</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-white flex-shrink-0" /> Multiple businesses</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-white flex-shrink-0" /> Multi-currency support</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-white flex-shrink-0" /> Dynamic UPI QR Codes</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-white flex-shrink-0" /> Analytics & GSTR reports</li>
              </ul>
              <Link
                href={getStartedUrl}
                className={cn(
                  buttonVariants({ variant: 'default' }),
                  "w-full text-center bg-white hover:bg-emerald-50 text-emerald-700 shadow-lg font-bold cursor-pointer"
                )}
              >
                Get Pro
              </Link>
            </motion.div>

            {/* Plan 4: Pro Yearly */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 flex flex-col shadow-sm">
              {/* Savings Badge */}
              <div className="self-start bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold py-0.5 px-2.5 rounded-full uppercase mb-3 border border-emerald-100/50">
                Save ₹788
              </div>
              <div className="space-y-1 mb-6">
                <h4 className="text-xs font-black text-slate-450 tracking-wider">PRO YEARLY</h4>
                <div className="text-3xl font-bold text-slate-950 dark:text-slate-50">
                  ₹3,999<span className="text-xs text-slate-400 font-normal">/yr</span>
                </div>
                <p className="text-[11px] text-slate-400">Save ~17% (1 month free)</p>
              </div>
              <ul className="space-y-3.5 text-xs text-slate-650 dark:text-slate-400 mb-8 flex-1">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500 flex-shrink-0" /> Everything in Pro</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500 flex-shrink-0" /> 13 months duration</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500 flex-shrink-0" /> Priority chat support</li>
              </ul>
              <Link
                href={getStartedUrl}
                className={cn(
                  buttonVariants({ variant: 'outline' }),
                  "w-full text-center font-bold border-slate-200 hover:bg-slate-50 text-slate-800 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900 cursor-pointer"
                )}
              >
                Go Yearly
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 8. TESTIMONIALS SLIDER SECTION */}
      <section className="py-20 md:py-28 bg-slate-50/50 dark:bg-slate-900/10">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          <div className="text-center max-w-xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-black tracking-widest text-emerald-600 dark:text-emerald-400 uppercase">
              Social Proof
            </h2>
            <h3 className="text-3xl font-extrabold text-slate-950 dark:text-slate-50 tracking-tight">
              Loved by People Who Get Paid
            </h3>
          </div>

          {/* Testimonial slider wrapper */}
          <div className="max-w-2xl mx-auto relative px-10">
            <div className="overflow-hidden min-h-[220px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTestimonial}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl p-8 shadow-md relative"
                >
                  {/* Large quotation mark decoration */}
                  <span className="absolute top-2 left-4 text-6xl font-serif text-emerald-100 dark:text-emerald-950/40 select-none pointer-events-none">
                    “
                  </span>

                  <p className="text-sm sm:text-base text-slate-650 dark:text-slate-350 italic leading-relaxed relative z-10">
                    {TESTIMONIALS[activeTestimonial].quote}
                  </p>

                  <div className="mt-6 flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-sm shadow-sm">
                      {TESTIMONIALS[activeTestimonial].avatarLetter}
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                        {TESTIMONIALS[activeTestimonial].author}
                      </h4>
                      <p className="text-[10px] sm:text-xs text-slate-400">
                        {TESTIMONIALS[activeTestimonial].role}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Arrow controllers */}
            <button
              onClick={handlePrevTestimonial}
              className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-500 bg-white shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-450 dark:hover:bg-slate-700 transition-colors z-20 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextTestimonial}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-500 bg-white shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-450 dark:hover:bg-slate-700 transition-colors z-20 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Slide dots */}
            <div className="flex items-center justify-center gap-2 mt-6">
              {TESTIMONIALS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveTestimonial(idx)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors cursor-pointer",
                    idx === activeTestimonial ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 9. FINAL CTA SECTION */}
      <section className="py-20 md:py-24 bg-emerald-600 text-white relative overflow-hidden">
        {/* Subtle floating particles background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="absolute top-1/2 left-10 w-24 h-24 text-white" viewBox="0 0 100 100">
            <polygon points="50,15 90,85 10,85" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
          <svg className="absolute top-10 right-20 w-16 h-16 text-white animate-spin" style={{ animationDuration: '25s' }} viewBox="0 0 100 100">
            <rect x="20" y="20" width="60" height="60" fill="none" stroke="currentColor" strokeWidth="3" />
          </svg>
        </div>

        <div className="max-w-[1280px] mx-auto px-6 md:px-12 relative z-10 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to send your first invoice?
          </h2>
          <p className="text-sm sm:text-base text-emerald-100 max-w-lg mx-auto leading-relaxed">
            Join over 2,000 freelancers, consultants, and agencies who get paid faster with Virbic.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href={getStartedUrl}
              className={cn(
                buttonVariants({ variant: 'default', size: 'lg' }),
                "w-full sm:w-auto bg-white hover:bg-emerald-50 text-emerald-700 shadow-xl shadow-emerald-700/20 font-bold px-8 py-3.5 rounded-lg cursor-pointer"
              )}
            >
              Create Free Invoice
            </Link>
            <a
              href="#pricing"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'lg' }),
                "w-full sm:w-auto text-white hover:bg-emerald-700/50 hover:text-white px-8 py-3.5 rounded-lg font-bold"
              )}
            >
              See Pricing
            </a>
          </div>
        </div>
      </section>

      {/* 10. FOOTER */}
      <footer className="border-t border-slate-900 bg-[#090d16] py-16 text-sm text-slate-400">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">
          {/* Brand Info */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/virbic-logo.svg" alt="Virbic Logo" className="w-8 h-8 object-contain" />
              <span className="text-lg font-black tracking-tight text-sky-400">
                Virbic
              </span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
              Beautiful invoices. Zero GST headaches. Engineered for Indian businesses and freelancers.
            </p>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest">Product</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="#features" className="hover:text-sky-400 transition-colors">Features</a></li>
              <li><a href="#templates" className="hover:text-sky-400 transition-colors">Templates</a></li>
              <li><a href="#pricing" className="hover:text-sky-400 transition-colors">Pricing</a></li>
              <li><Link href={getStartedUrl} className="hover:text-sky-400 transition-colors">Get Started</Link></li>
            </ul>
          </div>

          {/* Resources Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest">Resources</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="#" className="hover:text-sky-400 transition-colors">GST filing Guide</a></li>
              <li><a href="#" className="hover:text-sky-400 transition-colors">Blog & Updates</a></li>
              <li><a href="#" className="hover:text-sky-400 transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-sky-400 transition-colors">API Docs</a></li>
            </ul>
          </div>

          {/* Company Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest">Company</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="#" className="hover:text-sky-400 transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-sky-400 transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-sky-400 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-sky-400 transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-[1280px] mx-auto px-6 md:px-12 mt-12 pt-8 border-t border-slate-900 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>&copy; {new Date().getFullYear()} Virbic. All rights reserved. Made for Indian businesses.</span>
          <span>Developed by <a href="https://amplivate.in" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold underline text-slate-455 hover:text-sky-400 transition-colors"><img src="/amplivate-logo.svg" alt="Amplivate Logo" className="w-3.5 h-3.5 object-contain" /> amplivate.in</a></span>
        </div>
      </footer>

      {/* Template Preview Dialog */}
      <Dialog open={selectedTemplate !== null} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
        <DialogContent className="flex flex-col gap-0 p-0 sm:max-w-4xl max-h-[90vh] overflow-hidden bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
          <DialogHeader className="p-4 border-b border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-row items-center justify-between gap-4 flex-shrink-0">
            <div className="space-y-0.5 text-left">
              <DialogTitle className="text-sm font-black text-slate-850 dark:text-slate-100 uppercase tracking-wider">
                Live Template Preview
              </DialogTitle>
              <p className="text-[10px] text-slate-400 font-bold">
                Live mockup showing the exact render of the template
              </p>
            </div>
            
            <div className="flex items-center gap-3 pr-8">
              <span className="text-xs font-black text-slate-550 dark:text-slate-400 uppercase tracking-widest text-[9px]">Style:</span>
              <select
                value={previewTemplate}
                onChange={(e) => setPreviewTemplate(e.target.value as TemplateName)}
                className="text-xs bg-slate-550 dark:bg-slate-950 border border-slate-250 dark:border-slate-805 rounded-lg px-3 py-1.5 font-bold outline-none cursor-pointer text-slate-750 dark:text-slate-250 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all select-none"
              >
                {Object.entries(TEMPLATE_META).map(([key, value]) => (
                  <option key={key} value={key} className="bg-white dark:bg-slate-900 font-medium">
                    {value.label} — {value.description}
                  </option>
                ))}
              </select>
            </div>
          </DialogHeader>

          {/* Scrollable invoice container */}
          <div className="flex-1 overflow-y-auto p-6 md:p-10 flex justify-center bg-slate-100 dark:bg-slate-950/60 scrollbar-thin">
            <div className="w-full max-w-[800px] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden p-6 md:p-8 self-start">
              <TemplateRenderer
                template={previewTemplate}
                invoice={mockInvoice}
                totals={mockTotals}
                business={mockInvoice.business}
                client={mockInvoice.client}
                settings={DEFAULT_SETTINGS}
                size="preview"
              />
            </div>
          </div>

          {/* Dialog Footer */}
          <div className="p-4 border-t border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4 flex-shrink-0">
            <div className="text-left hidden sm:block">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Ready to create high-end professional invoices?
              </span>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <DialogClose render={<Button variant="outline" className="h-9 font-bold px-4 text-xs cursor-pointer" />}>
                Cancel
              </DialogClose>
              <Link
                href={getStartedUrl}
                className={cn(
                  buttonVariants({ variant: 'default' }),
                  "h-9 font-bold bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer px-4 text-xs shadow-md shadow-emerald-500/10"
                )}
              >
                Use this Template
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
