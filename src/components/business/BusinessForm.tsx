'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useDropzone } from 'react-dropzone';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { INDIAN_STATES } from '@/lib/constants';
import { Business } from '@/types';
import { cn } from '@/lib/utils';

// Color Swatches
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

const businessFormSchema = z.object({
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
  logo: z.string().optional().nullable().or(z.literal('')),
  signature: z.string().optional().nullable().or(z.literal('')),
  brandColor: z.string().default('#10b981'),
  invoicePrefix: z.string().max(10, 'Prefix must be 10 characters or less').default('INV'),
  invoiceNumber: z.number().int().nonnegative().default(1),
  financialYear: z.string().default('2026-27'),
  isDefault: z.boolean().default(false),
});

type BusinessFormValues = z.infer<typeof businessFormSchema>;

interface BusinessFormProps {
  initialData?: Business;
  onSubmit: (data: BusinessFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export default function BusinessForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: BusinessFormProps) {
  const [stateSearch, setStateSearch] = useState('');
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const stateDropdownRef = useRef<HTMLDivElement>(null);

  // Initialize form
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(businessFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      gstin: initialData?.gstin || '',
      pan: initialData?.pan || '',
      address: initialData?.address || '',
      city: initialData?.city || '',
      state: initialData?.state || '',
      pincode: initialData?.pincode || '',
      phone: initialData?.phone || '',
      email: initialData?.email || '',
      bankName: initialData?.bankName || '',
      accountNumber: initialData?.accountNumber || '',
      ifscCode: initialData?.ifscCode || '',
      upiId: initialData?.upiId || '',
      logo: initialData?.logo || '',
      signature: initialData?.signature || '',
      brandColor: initialData?.brandColor || '#10b981',
      invoicePrefix: initialData?.invoicePrefix || 'INV',
      invoiceNumber: initialData?.invoiceNumber || 1,
      financialYear: initialData?.financialYear || '2026-27',
      isDefault: initialData?.isDefault || false,
    },
  });

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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* 1. Business Info Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
          <Building2 className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Business Information</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Business Name */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
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
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
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
              <p className="mt-1 text-xs text-slate-400">15 character Indian Tax ID</p>
            )}
          </div>

          {/* PAN */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
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
              <p className="mt-1 text-xs text-slate-400">10 character Permanent Account Number</p>
            )}
          </div>

          {/* Business Address */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Business Address
            </label>
            <textarea
              {...register('address')}
              rows={3}
              placeholder="e.g. Suite 404, Bandra Kurla Complex"
              className="w-full px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-lg focus:outline-none transition-all text-sm dark:border-slate-800 dark:bg-slate-950"
            />
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              City
            </label>
            <input
              type="text"
              {...register('city')}
              placeholder="e.g. Mumbai"
              className="w-full px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-lg focus:outline-none transition-all text-sm dark:border-slate-800 dark:bg-slate-950"
            />
          </div>

          {/* State (Searchable Select) */}
          <div className="relative" ref={stateDropdownRef}>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
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
              <div className="absolute left-0 right-0 z-20 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg">
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
                      className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-between"
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
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
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
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                {...register('phone')}
                placeholder="e.g. +91 98765 43210"
                className="w-full pl-9 pr-4 py-2 border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-lg focus:outline-none transition-all text-sm dark:border-slate-800 dark:bg-slate-950"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="email"
                {...register('email')}
                placeholder="e.g. hello@acme.com"
                className={cn(
                  "w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all text-sm",
                  errors.email
                    ? "border-red-300 focus:ring-red-200 focus:border-red-500 dark:border-red-900"
                    : "border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                )}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.email.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 2. Bank Details Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
          <CreditCard className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Payment & Bank Details</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bank Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Bank Name
            </label>
            <input
              type="text"
              {...register('bankName')}
              placeholder="e.g. HDFC Bank"
              className="w-full px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-lg focus:outline-none transition-all text-sm dark:border-slate-800 dark:bg-slate-950"
            />
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Account Number
            </label>
            <input
              type="text"
              {...register('accountNumber')}
              placeholder="e.g. 50100234567890"
              className="w-full px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-lg focus:outline-none transition-all text-sm dark:border-slate-800 dark:bg-slate-950"
            />
          </div>

          {/* IFSC Code */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              IFSC Code
            </label>
            <input
              type="text"
              {...register('ifscCode')}
              placeholder="e.g. HDFC0000123"
              className="w-full px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-lg focus:outline-none transition-all text-sm dark:border-slate-800 dark:bg-slate-950"
            />
          </div>

          {/* UPI ID */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              UPI ID
            </label>
            <div className="relative">
              <input
                type="text"
                {...register('upiId')}
                placeholder="e.g. acme@okhdfcbank"
                className={cn(
                  "w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all text-sm",
                  errors.upiId
                    ? "border-red-300 focus:ring-red-200 focus:border-red-500 dark:border-red-900"
                    : "border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                )}
              />
            </div>
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

      {/* 3. Branding & Invoicing Series */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-6 shadow-sm space-y-8">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
          <Palette className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Branding & Layout Defaults</h2>
        </div>

        {/* Upload fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Logo Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Logo <span className="text-xs text-slate-400 font-normal">(PNG, JPG up to 2MB)</span>
            </label>
            
            <div className="flex items-center gap-4">
              <div
                {...getLogoRootProps()}
                className={cn(
                  "flex-1 border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/40",
                  isLogoDragActive ? "border-emerald-500 bg-emerald-50/20" : "border-slate-300 dark:border-slate-800"
                )}
              >
                <input {...getLogoInputProps()} />
                <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                <p className="text-xs text-slate-500 text-center">Drag logo here, or click to upload</p>
              </div>

              {watchLogo && (
                <div className="relative group w-20 h-20 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={watchLogo} alt="Logo preview" className="max-w-full max-h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setValue('logo', '')}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all text-white rounded-lg"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Signature Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Authorized Signature <span className="text-xs text-slate-400 font-normal">(PNG, JPG up to 2MB)</span>
            </label>
            
            <div className="flex items-center gap-4">
              <div
                {...getSigRootProps()}
                className={cn(
                  "flex-1 border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/40",
                  isSigDragActive ? "border-emerald-500 bg-emerald-50/20" : "border-slate-300 dark:border-slate-800"
                )}
              >
                <input {...getSigInputProps()} />
                <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                <p className="text-xs text-slate-500 text-center">Drag signature here, or click to upload</p>
              </div>

              {watchSignature && (
                <div className="relative group w-[180px] h-[72px] bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={watchSignature} alt="Signature preview" className="max-w-full max-h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setValue('signature', '')}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all text-white rounded-lg"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Brand Color Picker */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Brand Color
          </label>
          <div className="flex flex-wrap items-center gap-3">
            {PREDEFINED_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => setValue('brandColor', color.value)}
                className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center relative shadow-sm cursor-pointer transition-transform hover:scale-105"
                style={{ backgroundColor: color.value }}
                title={color.name}
              >
                {watchBrandColor === color.value && (
                  <Check className="w-4 h-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                )}
              </button>
            ))}
            
            {/* Custom Color Input */}
            <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-lg p-1 bg-slate-50 dark:bg-slate-950">
              <input
                type="color"
                value={watchBrandColor}
                onChange={(e) => setValue('brandColor', e.target.value)}
                className="w-7 h-7 rounded border border-slate-200 dark:border-slate-800 cursor-pointer p-0 bg-transparent"
              />
              <input
                type="text"
                value={watchBrandColor}
                onChange={(e) => {
                  if (e.target.value.match(/^#[0-9A-Fa-f]{6}$/)) {
                    setValue('brandColor', e.target.value);
                  }
                }}
                className="w-20 bg-transparent text-xs font-semibold focus:outline-none dark:text-white uppercase font-mono px-1"
                placeholder="#10B981"
              />
            </div>
          </div>

          {/* Live Preview of Invoice Header */}
          <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-950/30">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Live Header Preview</p>
            <div className="border border-slate-200 dark:border-slate-850 rounded-lg bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
              <div
                className="h-3.5 transition-all"
                style={{ backgroundColor: watchBrandColor }}
              />
              <div className="p-4 flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {watchLogo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={watchLogo} alt="Logo" className="w-6 h-6 object-contain" />
                    ) : (
                      <div className="w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center text-[10px] font-bold dark:text-slate-200">L</div>
                    )}
                    <span className="font-extrabold text-sm text-slate-900 dark:text-slate-50">
                      {watch('name') || 'Business Name'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    GSTIN: {watchGstin || 'Unspecified'} | State Code: {watch('state') ? INDIAN_STATES.find(s => s.name === watch('state') || s.code === watch('state'))?.gstCode || 'N/A' : 'N/A'}
                  </p>
                </div>
                <div className="text-right">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">TAX INVOICE</h4>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {watchInvoicePrefix || 'INV'}/{watchFinancialYear || '2026-27'}/001
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Series Formats */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <FileText className="w-4.5 h-4.5 text-emerald-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Invoice Numbering series</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Invoice Prefix */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Invoice Prefix
              </label>
              <input
                type="text"
                {...register('invoicePrefix')}
                placeholder="e.g. INV"
                maxLength={10}
                className={cn(
                  "w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all text-sm",
                  errors.invoicePrefix
                    ? "border-red-300 focus:ring-red-200 focus:border-red-500 dark:border-red-900"
                    : "border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                )}
              />
              {errors.invoicePrefix && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.invoicePrefix.message}
                </p>
              )}
            </div>

            {/* Financial Year */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Financial Year
              </label>
              <select
                {...register('financialYear')}
                className="w-full px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-lg focus:outline-none transition-all text-sm dark:border-slate-800 dark:bg-slate-950"
              >
                <option value="2025-26">2025-26</option>
                <option value="2026-27">2026-27</option>
                <option value="2027-28">2027-28</option>
              </select>
            </div>

            {/* Next Invoice Number */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Next Invoice Number
              </label>
              <input
                type="number"
                {...register('invoiceNumber', { valueAsNumber: true })}
                placeholder="1"
                min={1}
                className="w-full px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-lg focus:outline-none transition-all text-sm dark:border-slate-800 dark:bg-slate-950"
              />
            </div>
          </div>

          {/* Numbering Preview Card */}
          <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Invoice Numbering Preview</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {watchInvoicePrefix || 'INV'}/{watchFinancialYear || '2026-27'}/
                {String(watch('invoiceNumber') || 1).padStart(3, '0')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">This is how your invoice numbers will look</p>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-end gap-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-300"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md px-6 cursor-pointer"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </form>
  );
}
