'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  UploadCloud,
  Check,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Palette,
  FileText,
  AlertCircle,
  Search,
  Building,
  User,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { INDIAN_STATES } from '@/lib/constants';
import { useCreateBusiness } from '@/hooks/useBusiness';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { cn } from '@/lib/utils';

// Predefined colors
const PREDEFINED_COLORS = [
  { name: 'Emerald', value: '#10b981' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Slate', value: '#64748b' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Pink', value: '#ec4899' },
];

const onboardingSchema = z.object({
  // Step 1
  name: z.string().min(1, 'Business name is required'),
  gstin: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(''))
    .refine((val) => {
      if (!val) return true;
      return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(val);
    }, 'Invalid GSTIN format (15 characters, e.g. 27AAAAA1111A1Z1)'),
  pan: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(''))
    .refine((val) => {
      if (!val) return true;
      return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(val);
    }, 'Invalid PAN format (10 characters, e.g. ABCDE1234F)'),
  address: z.string().optional().nullable().or(z.literal('')),
  city: z.string().optional().nullable().or(z.literal('')),
  state: z.string().optional().nullable().or(z.literal('')),
  pincode: z.string().optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable().or(z.literal('')),
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .nullable()
    .or(z.literal('')),
  bankName: z.string().optional().nullable().or(z.literal('')),
  accountNumber: z.string().optional().nullable().or(z.literal('')),
  ifscCode: z.string().optional().nullable().or(z.literal('')),
  upiId: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(''))
    .refine((val) => {
      if (!val) return true;
      return val.includes('@');
    }, 'Invalid UPI ID (must contain @)'),
  
  // Step 2
  logo: z.string().optional().nullable().or(z.literal('')),
  signature: z.string().optional().nullable().or(z.literal('')),
  brandColor: z.string().default('#10b981'),
  invoicePrefix: z.string().max(10, 'Prefix must be 10 characters or less').default('INV'),
  invoiceNumber: z.number().int().nonnegative().default(1),
  financialYear: z.string().default('2026-27'),
  isDefault: z.boolean().default(true),
});

type OnboardingValues = z.infer<typeof onboardingSchema>;

// Background Confetti Particle Animation
const ConfettiBackground = () => {
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    delay: number;
    duration: number;
    size: number;
    color: string;
    drift: number;
  }>>([]);

  useEffect(() => {
    setMounted(true);
    const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f43f5e', '#f59e0b', '#ec4899'];
    const generated = Array.from({ length: 60 }).map((_, idx) => ({
      id: idx,
      x: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 2.5 + Math.random() * 3.5,
      size: 6 + Math.random() * 12,
      color: colors[Math.floor(Math.random() * colors.length)],
      drift: Math.random() * 30 - 15,
    }));
    setParticles(generated);
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `-20px`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
          }}
          animate={{
            y: ['0vh', '110vh'],
            x: [`${p.x}%`, `${p.x + p.drift}%`],
            rotate: [0, 720],
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeOut',
            repeat: Infinity,
          }}
        />
      ))}
    </div>
  );
};

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const router = useRouter();
  const { create, loading: submitting } = useCreateBusiness();
  const [, setActiveBusinessId] = useLocalStorage<string | null>('active_business_id', null);

  const [stateSearch, setStateSearch] = useState('');
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const stateDropdownRef = useRef<HTMLDivElement>(null);

  // Initialize form
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: '',
      gstin: '',
      pan: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      phone: '',
      email: '',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      upiId: '',
      logo: '',
      signature: '',
      brandColor: '#10b981',
      invoicePrefix: 'INV',
      invoiceNumber: 1,
      financialYear: '2026-27',
      isDefault: true,
    },
  });

  const watchName = watch('name');
  const watchGstin = watch('gstin');
  const watchBrandColor = watch('brandColor');
  const watchInvoicePrefix = watch('invoicePrefix');
  const watchFinancialYear = watch('financialYear');
  const watchLogo = watch('logo');
  const watchSignature = watch('signature');
  const watchState = watch('state');

  // Handle click outside for searchable state dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(event.target as Node)) {
        setShowStateDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync state search field when watchState updates
  useEffect(() => {
    if (watchState) {
      const selected = INDIAN_STATES.find((s) => s.code === watchState || s.name === watchState);
      if (selected) {
        setStateSearch(selected.name);
      }
    }
  }, [watchState]);

  // Dropzone for Logo
  const onDropLogo = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue('logo', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const {
    getRootProps: getLogoRootProps,
    getInputProps: getLogoInputProps,
    isDragActive: isLogoDragActive,
  } = useDropzone({
    onDrop: onDropLogo,
    accept: { 'image/jpeg': [], 'image/png': [] },
    maxSize: 2 * 1024 * 1024,
    multiple: false,
  });

  // Dropzone for Signature
  const onDropSignature = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue('signature', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const {
    getRootProps: getSigRootProps,
    getInputProps: getSigInputProps,
    isDragActive: isSigDragActive,
  } = useDropzone({
    onDrop: onDropSignature,
    accept: { 'image/jpeg': [], 'image/png': [] },
    maxSize: 2 * 1024 * 1024,
    multiple: false,
  });

  // Check GSTIN valid format helper
  const isGstinValid = watchGstin
    ? /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(watchGstin)
    : false;

  // Search filtered states
  const filteredStates = INDIAN_STATES.filter((state) =>
    state.name.toLowerCase().includes(stateSearch.toLowerCase())
  );

  // Validate Step 1 before continuing
  const handleContinueToStep2 = async () => {
    const isStep1Valid = await trigger([
      'name',
      'gstin',
      'pan',
      'address',
      'city',
      'state',
      'pincode',
      'phone',
      'email',
      'bankName',
      'accountNumber',
      'ifscCode',
      'upiId',
    ]);
    if (isStep1Valid) {
      setStep(2);
    }
  };

  // Submit and create business profile
  const handleFormSubmit = async (data: OnboardingValues) => {
    try {
      const created = await create(data);
      if (created) {
        setActiveBusinessId(created.id);
        // Notify other components (like TopBar Selector) that a new business profile was created
        window.dispatchEvent(new CustomEvent('business-changed'));
        setStep(3);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center px-4 py-12 md:py-20 select-none overflow-x-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-emerald-400/10 dark:bg-emerald-500/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-400/10 dark:bg-violet-500/5 rounded-full blur-3xl -z-10" />

      {step === 3 && <ConfettiBackground />}

      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-xl p-6 md:p-8 relative z-10 flex flex-col">
        {/* HEADER & PROGRESS BAR */}
        {step < 3 && (
          <div className="mb-8 space-y-4">
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
                Setup Your Business Profile
              </h1>
              <p className="text-sm text-slate-500">
                Let&apos;s customize your invoices. This takes less than 2 minutes.
              </p>
            </div>

            {/* Progress Indicators */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
                <span className={cn(step >= 1 ? "text-emerald-500 font-bold" : "")}>1. Business Info</span>
                <span className={cn(step >= 2 ? "text-emerald-500 font-bold" : "")}>2. Branding & Defaults</span>
                <span>3. Ready!</span>
              </div>
              {/* Progress Bar */}
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                  style={{ width: `${(step / 3) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* WIZARD PANELS WITH SLIDE TRANSITIONS */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-500" />
                    Business Information
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Business Name */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-350 mb-1.5">
                        Business Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Building className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          {...register('name')}
                          placeholder="e.g. Acme Studio"
                          className={cn(
                            "w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all text-sm",
                            errors.name
                              ? "border-red-300 focus:ring-red-200 focus:border-red-500 dark:border-red-900"
                              : "border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                          )}
                        />
                      </div>
                      {errors.name && (
                        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {errors.name.message}
                        </p>
                      )}
                    </div>

                    {/* GSTIN */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-350 mb-1.5">
                        GSTIN <span className="text-xs text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          {...register('gstin')}
                          placeholder="e.g. 27AAAAA1111A1Z1"
                          className={cn(
                            "w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all uppercase text-sm pr-10",
                            errors.gstin
                              ? "border-red-300 focus:ring-red-200 focus:border-red-500 dark:border-red-900"
                              : "border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                          )}
                        />
                        {isGstinValid && (
                          <div className="absolute right-3 top-2.5 bg-emerald-100 dark:bg-emerald-950/60 p-0.5 rounded-full text-emerald-600 dark:text-emerald-400">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                      {errors.gstin ? (
                        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {errors.gstin.message}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-slate-450">15-char tax number (e.g. Maharashtra format)</p>
                      )}
                    </div>

                    {/* PAN */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-350 mb-1.5">
                        PAN <span className="text-xs text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        {...register('pan')}
                        placeholder="e.g. ABCDE1234F"
                        className={cn(
                          "w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all uppercase text-sm",
                          errors.pan
                            ? "border-red-300 focus:ring-red-200 focus:border-red-500 dark:border-red-900"
                            : "border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                        )}
                      />
                      {errors.pan ? (
                        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {errors.pan.message}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-slate-455">10-char Permanent Account Number</p>
                      )}
                    </div>

                    {/* Address */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-350 mb-1.5">
                        Business Address
                      </label>
                      <textarea
                        {...register('address')}
                        rows={2}
                        placeholder="e.g. BKC, Bandra East"
                        className="w-full px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-lg focus:outline-none transition-all text-sm dark:border-slate-800 dark:bg-slate-950"
                      />
                    </div>

                    {/* City */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-350 mb-1.5">
                        City
                      </label>
                      <input
                        type="text"
                        {...register('city')}
                        placeholder="e.g. Mumbai"
                        className="w-full px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-lg focus:outline-none transition-all text-sm dark:border-slate-800 dark:bg-slate-950"
                      />
                    </div>

                    {/* State (Searchable) */}
                    <div className="relative" ref={stateDropdownRef}>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-350 mb-1.5">
                        State
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={stateSearch}
                          onChange={(e) => {
                            setStateSearch(e.target.value);
                            setShowStateDropdown(true);
                            if (e.target.value === '') {
                              setValue('state', '');
                            }
                          }}
                          onFocus={() => setShowStateDropdown(true)}
                          placeholder="Search state..."
                          className="w-full pl-9 pr-4 py-2 border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-lg focus:outline-none transition-all text-sm dark:border-slate-800 dark:bg-slate-950"
                        />
                        <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      </div>

                      {showStateDropdown && (
                        <div className="absolute left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg">
                          {filteredStates.length > 0 ? (
                            filteredStates.map((state) => (
                              <button
                                key={state.code}
                                type="button"
                                onClick={() => {
                                  setValue('state', state.name);
                                  setStateSearch(state.name);
                                  setShowStateDropdown(false);
                                }}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-205 flex items-center justify-between"
                              >
                                <span>{state.name}</span>
                                <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-850 px-1.5 py-0.5 rounded">
                                  GST: {state.gstCode}
                                </span>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-2 text-sm text-slate-400">No states found</div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Pincode */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-350 mb-1.5">
                        Pincode
                      </label>
                      <input
                        type="text"
                        {...register('pincode')}
                        placeholder="e.g. 400051"
                        maxLength={6}
                        className="w-full px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-lg focus:outline-none transition-all text-sm dark:border-slate-800 dark:bg-slate-950"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-350 mb-1.5">
                        Phone
                      </label>
                      <input
                        type="text"
                        {...register('phone')}
                        placeholder="e.g. 9876543210"
                        className="w-full px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-lg focus:outline-none transition-all text-sm dark:border-slate-800 dark:bg-slate-950"
                      />
                    </div>

                    {/* Email */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-350 mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        {...register('email')}
                        placeholder="e.g. billing@acme.com"
                        className={cn(
                          "w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all text-sm",
                          errors.email
                            ? "border-red-300 focus:ring-red-200 focus:border-red-500 dark:border-red-900"
                            : "border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                        )}
                      />
                      {errors.email && (
                        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {errors.email.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bank Details sub-header */}
                  <h3 className="text-md font-semibold text-slate-900 dark:text-slate-100 mt-8 mb-4 flex items-center gap-2">
                    <CreditCard className="w-4.5 h-4.5 text-emerald-500" />
                    Bank Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-350 mb-1.5">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        {...register('bankName')}
                        placeholder="HDFC Bank"
                        className="w-full px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-lg focus:outline-none transition-all text-sm dark:border-slate-800 dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-350 mb-1.5">
                        Account Number
                      </label>
                      <input
                        type="text"
                        {...register('accountNumber')}
                        placeholder="50100123456789"
                        className="w-full px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-lg focus:outline-none transition-all text-sm dark:border-slate-800 dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-350 mb-1.5">
                        IFSC Code
                      </label>
                      <input
                        type="text"
                        {...register('ifscCode')}
                        placeholder="HDFC0000123"
                        className="w-full px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-lg focus:outline-none transition-all text-sm dark:border-slate-800 dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-350 mb-1.5">
                        UPI ID
                      </label>
                      <input
                        type="text"
                        {...register('upiId')}
                        placeholder="e.g. acme@okaxis"
                        className={cn(
                          "w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all text-sm",
                          errors.upiId
                            ? "border-red-300 focus:ring-red-200 focus:border-red-500 dark:border-red-900"
                            : "border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                        )}
                      />
                      {errors.upiId ? (
                        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {errors.upiId.message}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-slate-500">Requires @ symbol (used for dynamic UPI QR generation)</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Continue button */}
                <div className="pt-4">
                  <Button
                    type="button"
                    onClick={handleContinueToStep2}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <Palette className="w-5 h-5 text-emerald-500" />
                    Branding & Personalization
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Logo upload */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-350">
                        Upload Logo <span className="text-xs text-slate-400 font-normal">(PNG, JPG, max 2MB)</span>
                      </label>
                      <div className="flex items-center gap-4">
                        <div
                          {...getLogoRootProps()}
                          className={cn(
                            "flex-1 border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/40",
                            isLogoDragActive ? "border-emerald-500 bg-emerald-50/20" : "border-slate-300 dark:border-slate-800"
                          )}
                        >
                          <input {...getLogoInputProps()} />
                          <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                          <p className="text-[11px] text-slate-500 text-center">Drag or click logo</p>
                        </div>
                        {watchLogo && (
                          <div className="relative group w-[80px] h-[80px] bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={watchLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                            <button
                              type="button"
                              onClick={() => setValue('logo', '')}
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all text-white rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Signature upload */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-350">
                        Signature <span className="text-xs text-slate-400 font-normal">(PNG, JPG, max 2MB)</span>
                      </label>
                      <div className="flex items-center gap-4">
                        <div
                          {...getSigRootProps()}
                          className={cn(
                            "flex-1 border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/40",
                            isSigDragActive ? "border-emerald-500 bg-emerald-50/20" : "border-slate-300 dark:border-slate-800"
                          )}
                        >
                          <input {...getSigInputProps()} />
                          <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                          <p className="text-[11px] text-slate-500 text-center">Drag or click signature</p>
                        </div>
                        {watchSignature && (
                          <div className="relative group w-[120px] h-[48px] bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={watchSignature} alt="Signature" className="max-w-full max-h-full object-contain" />
                            <button
                              type="button"
                              onClick={() => setValue('signature', '')}
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all text-white rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Brand Color Swatches */}
                  <div className="space-y-3 mb-6">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-350">
                      Brand Color
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {PREDEFINED_COLORS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setValue('brandColor', color.value)}
                          className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-850 flex items-center justify-center relative shadow-sm cursor-pointer hover:scale-105 transition-transform"
                          style={{ backgroundColor: color.value }}
                        >
                          {watchBrandColor === color.value && (
                            <Check className="w-3.5 h-3.5 text-white drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.5)]" />
                          )}
                        </button>
                      ))}
                      <div className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 rounded-lg p-1 bg-slate-50 dark:bg-slate-950">
                        <input
                          type="color"
                          value={watchBrandColor}
                          onChange={(e) => setValue('brandColor', e.target.value)}
                          className="w-6 h-6 rounded border border-slate-200 dark:border-slate-850 cursor-pointer p-0 bg-transparent"
                        />
                        <input
                          type="text"
                          value={watchBrandColor}
                          onChange={(e) => {
                            if (e.target.value.match(/^#[0-9A-Fa-f]{6}$/)) {
                              setValue('brandColor', e.target.value);
                            }
                          }}
                          className="w-16 bg-transparent text-[10px] font-bold focus:outline-none dark:text-white uppercase font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Invoice prefix */}
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-350 mb-1.5">
                        Invoice Series Prefix
                      </label>
                      <input
                        type="text"
                        {...register('invoicePrefix')}
                        maxLength={10}
                        className={cn(
                          "w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all text-sm",
                          errors.invoicePrefix
                            ? "border-red-300 focus:ring-red-200 focus:border-red-500 dark:border-red-900"
                            : "border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                        )}
                      />
                    </div>
                    {/* Live preview */}
                    <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 p-3 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Format Preview</span>
                        <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          {watchInvoicePrefix || 'INV'}/{watchFinancialYear || '2026-27'}/001
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 text-right max-w-xs">
                        This is how your invoice numbers will look
                      </p>
                    </div>
                  </div>

                  {/* Live Invoice Preview */}
                  <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-950/30">
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Live Header Preview</p>
                    <div className="border border-slate-200 dark:border-slate-850 rounded-lg bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                      <div
                        className="h-3 transition-all"
                        style={{ backgroundColor: watchBrandColor }}
                      />
                      <div className="p-4 flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            {watchLogo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={watchLogo} alt="Logo" className="w-5 h-5 object-contain" />
                            ) : (
                              <div className="w-5 h-5 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center text-[8px] font-bold dark:text-slate-200">L</div>
                            )}
                            <span className="font-extrabold text-xs text-slate-900 dark:text-slate-50">
                              {watchName || 'Business Name'}
                            </span>
                          </div>
                          <p className="text-[8px] text-slate-400">
                            GSTIN: {watchGstin || 'Unspecified'} | State: {watchState || 'N/A'}
                          </p>
                        </div>
                        <div className="text-right">
                          <h4 className="text-[10px] font-bold text-slate-850 dark:text-slate-200">TAX INVOICE</h4>
                          <p className="text-[9px] text-slate-400 font-mono">
                            {watchInvoicePrefix || 'INV'}/{watchFinancialYear || '2026-27'}/001
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Back and Continue Buttons */}
                <div className="flex items-center gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="w-1/3 border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-350 flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSubmit(handleFormSubmit)}
                    disabled={submitting}
                    className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <span>{submitting ? 'Creating Profile...' : 'Finish & Setup'}</span>
                    <Sparkles className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, type: 'spring' }}
                className="space-y-8 text-center py-6"
              >
                {/* Large Checkmark Icon */}
                <div className="flex justify-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                    className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-lg"
                  >
                    <Check className="w-10 h-10" />
                  </motion.div>
                </div>

                {/* Heading */}
                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
                    You&apos;re all set!
                  </h2>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto">
                    Your business profile is created. You are now ready to generate beautiful, GST-compliant invoices.
                  </p>
                </div>

                {/* Summary Card */}
                <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 max-w-md mx-auto text-left space-y-3.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Business Profile</span>
                    <div
                      className="w-4 h-4 rounded-full border border-slate-200 dark:border-slate-800"
                      style={{ backgroundColor: watchBrandColor }}
                      title="Selected Brand Color"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{watchName}</h3>
                    {watchGstin ? (
                      <p className="text-xs text-slate-500 font-mono mt-0.5">GSTIN: {watchGstin.toUpperCase()}</p>
                    ) : (
                      <p className="text-xs text-slate-450 mt-0.5 italic">GSTIN not provided</p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto pt-4 relative z-25">
                  <Button
                    onClick={() => router.push('/invoices/new')}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Create First Invoice</span>
                    <Sparkles className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/dashboard')}
                    className="flex-1 border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-300 font-semibold py-3 rounded-lg flex items-center justify-center"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
