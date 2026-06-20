'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import {
  AlertCircle,
  Check,
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  Info,
  Building,
  User,
  Mail,
  Phone,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { INDIAN_STATES } from '@/lib/constants';
import { ClientWithDetails } from '@/hooks/useClients';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Zod validation schemas
const clientFormSchema = z.object({
  name: z.string().min(1, 'Client name is required'),
  gstin: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(''))
    .refine((val) => {
      if (!val) return true;
      return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(val);
    }, 'Invalid GSTIN format (15 characters, e.g. 27AAAAA1111A1Z1)'),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable().or(z.literal('')),
  billingAddress: z.string().optional().nullable().or(z.literal('')),
  billingCity: z.string().optional().nullable().or(z.literal('')),
  billingState: z.string().optional().nullable().or(z.literal('')),
  billingPincode: z.string().optional().nullable().or(z.literal('')),
  shippingAddress: z.string().optional().nullable().or(z.literal('')),
  shippingCity: z.string().optional().nullable().or(z.literal('')),
  shippingState: z.string().optional().nullable().or(z.literal('')),
  shippingPincode: z.string().optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable().or(z.literal('')),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

interface ClientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: ClientWithDetails | null;
  onSubmit: (data: any) => Promise<void>;
  isLoading?: boolean;
}

export default function ClientForm({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isLoading = false,
}: ClientFormProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [sameAsBilling, setSameAsBilling] = useState(true);

  // Searchable states states
  const [billingSearch, setBillingSearch] = useState('');
  const [showBillingDropdown, setShowBillingDropdown] = useState(false);
  const billingDropdownRef = useRef<HTMLDivElement>(null);

  const [shippingSearch, setShippingSearch] = useState('');
  const [showShippingDropdown, setShowShippingDropdown] = useState(false);
  const shippingDropdownRef = useRef<HTMLDivElement>(null);

  // CSV Import States
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [validRowsCount, setValidRowsCount] = useState(0);

  const isEditMode = !!initialData;

  // Form setup
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: '',
      gstin: '',
      email: '',
      phone: '',
      billingAddress: '',
      billingCity: '',
      billingState: '',
      billingPincode: '',
      shippingAddress: '',
      shippingCity: '',
      shippingState: '',
      shippingPincode: '',
      notes: '',
    },
  });

  const watchGstin = watch('gstin');
  const watchBillingState = watch('billingState');
  const watchShippingState = watch('shippingState');

  // Reset form when initialData changes
  useEffect(() => {
    if (open) {
      setActiveTab('basic');
      setCsvData([]);
      setCsvErrors([]);
      setValidRowsCount(0);
      
      if (initialData) {
        reset({
          name: initialData.name || '',
          gstin: initialData.gstin || '',
          email: initialData.email || '',
          phone: initialData.phone || '',
          billingAddress: initialData.billingAddress || '',
          billingCity: initialData.billingCity || '',
          billingState: initialData.billingState || '',
          billingPincode: initialData.billingPincode || '',
          shippingAddress: initialData.shippingAddress || '',
          shippingCity: initialData.shippingCity || '',
          shippingState: initialData.shippingState || '',
          shippingPincode: initialData.shippingPincode || '',
          notes: initialData.notes || '',
        });
        
        // Determine sameAsBilling
        const isSame =
          initialData.billingAddress === initialData.shippingAddress &&
          initialData.billingCity === initialData.shippingCity &&
          initialData.billingState === initialData.shippingState &&
          initialData.billingPincode === initialData.shippingPincode;
        
        setSameAsBilling(isSame);
      } else {
        reset({
          name: '',
          gstin: '',
          email: '',
          phone: '',
          billingAddress: '',
          billingCity: '',
          billingState: '',
          billingPincode: '',
          shippingAddress: '',
          shippingCity: '',
          shippingState: '',
          shippingPincode: '',
          notes: '',
        });
        setSameAsBilling(true);
      }
    }
  }, [open, initialData, reset]);

  // Click outside for billing state searchable dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (billingDropdownRef.current && !billingDropdownRef.current.contains(event.target as Node)) {
        setShowBillingDropdown(false);
      }
      if (shippingDropdownRef.current && !shippingDropdownRef.current.contains(event.target as Node)) {
        setShowShippingDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update billing state search text
  useEffect(() => {
    if (watchBillingState) {
      const selected = INDIAN_STATES.find(
        (s) => s.code === watchBillingState || s.name === watchBillingState
      );
      if (selected) {
        setBillingSearch(selected.name);
      }
    } else {
      setBillingSearch('');
    }
  }, [watchBillingState]);

  // Update shipping state search text
  useEffect(() => {
    if (watchShippingState) {
      const selected = INDIAN_STATES.find(
        (s) => s.code === watchShippingState || s.name === watchShippingState
      );
      if (selected) {
        setShippingSearch(selected.name);
      }
    } else {
      setShippingSearch('');
    }
  }, [watchShippingState]);

  const filteredBillingStates = INDIAN_STATES.filter((state) =>
    state.name.toLowerCase().includes(billingSearch.toLowerCase())
  );

  const filteredShippingStates = INDIAN_STATES.filter((state) =>
    state.name.toLowerCase().includes(shippingSearch.toLowerCase())
  );

  // GSTIN formats check
  const isGstinValid = watchGstin
    ? /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(watchGstin)
    : false;

  // Handle Form Submit
  const onFormSubmit = async (data: ClientFormValues) => {
    const finalData = { ...data };
    if (sameAsBilling) {
      finalData.shippingAddress = data.billingAddress;
      finalData.shippingCity = data.billingCity;
      finalData.shippingState = data.billingState;
      finalData.shippingPincode = data.billingPincode;
    }
    await onSubmit(finalData);
  };

  // Download CSV template
  const downloadCsvTemplate = () => {
    const headers = [
      'Name',
      'GSTIN',
      'Email',
      'Phone',
      'BillingAddress',
      'BillingCity',
      'BillingState',
      'BillingPincode',
      'Notes',
    ];
    const exampleRow = [
      'John Doe Client',
      '27AAAAA1111A1Z1',
      'john@example.com',
      '9876543210',
      '123 Kurla Complex',
      'Mumbai',
      'Maharashtra',
      '400051',
      'Regular client',
    ];
    const csvContent = [headers.join(','), exampleRow.map((val) => `"${val}"`).join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'virbic_clients_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Drag and Drop CSV file
  const onDropCsv = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as any[];
          const errorsList: string[] = [];
          const validRows: any[] = [];

          rows.forEach((row, idx) => {
            const rowNumber = idx + 1;
            const mappedRow = {
              name: row.Name || row['Client Name'] || '',
              gstin: row.GSTIN || row['GST Number'] || '',
              email: row.Email || row['Email Address'] || '',
              phone: row.Phone || row['Phone Number'] || '',
              billingAddress: row.BillingAddress || row.Address || '',
              billingCity: row.BillingCity || row.City || '',
              billingState: row.BillingState || row.State || '',
              billingPincode: row.BillingPincode || row.Pincode || '',
              notes: row.Notes || '',
            };

            // Run light validations on row
            if (!mappedRow.name) {
              errorsList.push(`Row ${rowNumber}: Name is required`);
              return;
            }

            if (mappedRow.gstin) {
              const matches = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(
                mappedRow.gstin
              );
              if (!matches) {
                errorsList.push(`Row ${rowNumber}: Invalid GSTIN format (${mappedRow.gstin})`);
                return;
              }
            }

            if (mappedRow.email) {
              const emailMatches = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mappedRow.email);
              if (!emailMatches) {
                errorsList.push(`Row ${rowNumber}: Invalid Email format (${mappedRow.email})`);
                return;
              }
            }

            // Valid row
            validRows.push(mappedRow);
          });

          setCsvData(validRows);
          setCsvErrors(errorsList);
          setValidRowsCount(validRows.length);
          toast.info(`CSV Parsed: found ${validRows.length} valid rows and ${errorsList.length} errors.`);
        },
      });
    }
  };

  const {
    getRootProps: getCsvRootProps,
    getInputProps: getCsvInputProps,
    isDragActive: isCsvDragActive,
  } = useDropzone({
    onDrop: onDropCsv,
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
  });

  const handleBulkImport = async () => {
    if (csvData.length === 0) return;
    await onSubmit(csvData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-50">
            {isEditMode ? 'Edit Client' : 'Add New Client'}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            {isEditMode
              ? 'Update your customer details and address profiles.'
              : 'Add custom detail info or bulk import client databases.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList variant="line" className="border-b border-slate-100 dark:border-slate-800 w-full flex gap-4 pb-2 mb-6">
            <TabsTrigger value="basic" className="pb-2 cursor-pointer font-semibold text-sm">Basic Info</TabsTrigger>
            <TabsTrigger value="address" className="pb-2 cursor-pointer font-semibold text-sm">Addresses</TabsTrigger>
            {!isEditMode && (
              <TabsTrigger value="csv" className="pb-2 cursor-pointer font-semibold text-sm flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                <span>Import CSV</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* TAB 1: BASIC INFO */}
          <TabsContent value="basic" className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Client Name */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Client Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="text"
                    {...register('name')}
                    placeholder="e.g. Acme Tech Solutions"
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
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  GSTIN <span className="text-[10px] text-slate-400 font-normal font-sans">(Optional)</span>
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="text"
                    {...register('gstin')}
                    placeholder="e.g. 27AAAAA1111A1Z1"
                    className={cn(
                      "w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all uppercase text-sm",
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
                  <p className="mt-1 text-[10px] text-slate-400 font-medium">15-character GST Identification Number</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="email"
                    {...register('email')}
                    placeholder="e.g. billing@client.com"
                    className={cn(
                      "w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all text-sm",
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

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="text"
                    {...register('phone')}
                    placeholder="e.g. 9876543210"
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-lg focus:outline-none transition-all text-sm dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Internal Notes
                </label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  placeholder="Billing terms, contact person details, etc."
                  className="w-full px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-lg focus:outline-none transition-all text-sm dark:border-slate-800 dark:bg-slate-950"
                />
              </div>
            </div>

            {/* Next buttons */}
            <div className="pt-4 flex justify-between">
              <span />
              <Button
                type="button"
                onClick={() => setActiveTab('address')}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 cursor-pointer"
              >
                Next: Address
              </Button>
            </div>
          </TabsContent>

          {/* TAB 2: ADDRESS */}
          <TabsContent value="address" className="space-y-6">
            {/* BILLING ADDRESS */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider pb-1.5 border-b border-slate-100 dark:border-slate-850">
                Billing Address
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Street Address */}
                <div className="md:col-span-3">
                  <label className="block text-xs text-slate-500 mb-1">Street Address</label>
                  <textarea
                    {...register('billingAddress')}
                    rows={2}
                    placeholder="e.g. Unit 12, Phase 1, IT Park"
                    className="w-full px-3 py-1.5 border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-lg focus:outline-none transition-all text-sm dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs text-slate-500 mb-1">City</label>
                  <input
                    type="text"
                    {...register('billingCity')}
                    placeholder="e.g. Bangalore"
                    className="w-full px-3 py-1.5 border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-lg focus:outline-none transition-all text-sm dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>

                {/* State (Searchable) */}
                <div className="relative" ref={billingDropdownRef}>
                  <label className="block text-xs text-slate-500 mb-1">State</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={billingSearch}
                      onChange={(e) => {
                        setBillingSearch(e.target.value);
                        setShowBillingDropdown(true);
                        if (e.target.value === '') {
                          setValue('billingState', '');
                        }
                      }}
                      onFocus={() => setShowBillingDropdown(true)}
                      placeholder="Search state..."
                      className="w-full pl-7 pr-3 py-1.5 border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-lg focus:outline-none transition-all text-sm dark:border-slate-800 dark:bg-slate-950"
                    />
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  </div>

                  {showBillingDropdown && (
                    <div className="absolute left-0 right-0 z-20 mt-1 max-h-40 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg">
                      {filteredBillingStates.length > 0 ? (
                        filteredBillingStates.map((state) => (
                          <button
                            key={state.code}
                            type="button"
                            onClick={() => {
                              setValue('billingState', state.name);
                              setBillingSearch(state.name);
                              setShowBillingDropdown(false);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                          >
                            {state.name}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-1.5 text-xs text-slate-400">No states found</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Pincode */}
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Pincode</label>
                  <input
                    type="text"
                    {...register('billingPincode')}
                    placeholder="e.g. 560001"
                    maxLength={6}
                    className="w-full px-3 py-1.5 border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-lg focus:outline-none transition-all text-sm dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>
              </div>
            </div>

            {/* Same As billing Checkbox */}
            <div className="flex items-center gap-2 py-2 bg-slate-50 dark:bg-slate-950/40 px-3.5 rounded-lg border border-slate-200/50 dark:border-slate-850">
              <input
                type="checkbox"
                id="sameAsBilling"
                checked={sameAsBilling}
                onChange={(e) => setSameAsBilling(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="sameAsBilling" className="text-xs font-semibold text-slate-700 dark:text-slate-350 cursor-pointer select-none">
                Shipping Address is the same as Billing Address
              </label>
            </div>

            {/* SHIPPING ADDRESS */}
            {!sameAsBilling && (
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider pb-1.5 border-b border-slate-100 dark:border-slate-850">
                  Shipping Address
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Street Address */}
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-500 mb-1">Street Address</label>
                    <textarea
                      {...register('shippingAddress')}
                      rows={2}
                      placeholder="e.g. Delivery dock 4, BKC Complex"
                      className="w-full px-3 py-1.5 border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-lg focus:outline-none transition-all text-sm dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">City</label>
                    <input
                      type="text"
                      {...register('shippingCity')}
                      placeholder="e.g. Mumbai"
                      className="w-full px-3 py-1.5 border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-lg focus:outline-none transition-all text-sm dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>

                  {/* State (Searchable) */}
                  <div className="relative" ref={shippingDropdownRef}>
                    <label className="block text-xs text-slate-500 mb-1">State</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={shippingSearch}
                        onChange={(e) => {
                          setShippingSearch(e.target.value);
                          setShowShippingDropdown(true);
                          if (e.target.value === '') {
                            setValue('shippingState', '');
                          }
                        }}
                        onFocus={() => setShowShippingDropdown(true)}
                        placeholder="Search state..."
                        className="w-full pl-7 pr-3 py-1.5 border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-lg focus:outline-none transition-all text-sm dark:border-slate-800 dark:bg-slate-950"
                      />
                      <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                    </div>

                    {showShippingDropdown && (
                      <div className="absolute left-0 right-0 z-20 mt-1 max-h-40 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg">
                        {filteredShippingStates.length > 0 ? (
                          filteredShippingStates.map((state) => (
                            <button
                              key={state.code}
                              type="button"
                              onClick={() => {
                                setValue('shippingState', state.name);
                                setShippingSearch(state.name);
                                setShowShippingDropdown(false);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                            >
                              {state.name}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-1.5 text-xs text-slate-400">No states found</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Pincode */}
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Pincode</label>
                    <input
                      type="text"
                      {...register('shippingPincode')}
                      placeholder="e.g. 400051"
                      maxLength={6}
                      className="w-full px-3 py-1.5 border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-lg focus:outline-none transition-all text-sm dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-6 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setActiveTab('basic')}
                className="text-slate-650 font-bold hover:bg-slate-50 cursor-pointer"
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleSubmit(onFormSubmit)}
                disabled={isLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 cursor-pointer"
              >
                {isLoading ? 'Saving...' : 'Save Client'}
              </Button>
            </div>
          </TabsContent>

          {/* TAB 3: CSV IMPORT */}
          {!isEditMode && (
            <TabsContent value="csv" className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-850">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-650 flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-850 dark:text-slate-200">CSV Bulk Import</h4>
                      <p className="text-[11px] text-slate-500">Upload multiple client rows at once.</p>
                    </div>
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={downloadCsvTemplate}
                    className="flex items-center justify-center gap-1.5 h-9 text-xs border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-300 hover:bg-slate-50 font-bold cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Template</span>
                  </Button>
                </div>

                {/* CSV File Dropzone */}
                <div
                  {...getCsvRootProps()}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/40",
                    isCsvDragActive ? "border-emerald-500 bg-emerald-50/20" : "border-slate-300 dark:border-slate-800"
                  )}
                >
                  <input {...getCsvInputProps()} />
                  <UploadCloud className="w-10 h-10 text-slate-400 mb-2" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-350">
                    {isCsvDragActive ? 'Drop your CSV here' : 'Drag & drop your CSV client list'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Or click to browse files</p>
                </div>

                {/* CSV Validation feedback */}
                {csvErrors.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-4 rounded-xl space-y-2">
                    <span className="text-xs font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-4.5 h-4.5" />
                      Parsing Warnings ({csvErrors.length})
                    </span>
                    <ul className="text-xs text-red-650 dark:text-red-400 space-y-1 max-h-32 overflow-y-auto list-disc pl-4">
                      {csvErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                    <p className="text-[10px] text-slate-450 italic">Rows with warnings will be skipped during import.</p>
                  </div>
                )}

                {/* CSV Preview Table */}
                {csvData.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                        <Info className="w-4 h-4 text-emerald-500" />
                        Previewing valid rows ({validRowsCount} ready)
                      </span>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full text-xs text-left border-collapse bg-white dark:bg-slate-900">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                            <th className="px-4 py-2">Name</th>
                            <th className="px-4 py-2">GSTIN</th>
                            <th className="px-4 py-2">Email</th>
                          </tr>
                        </thead>
                        <tbody>
                          {csvData.slice(0, 5).map((row, i) => (
                            <tr key={i} className="border-b border-slate-100 dark:border-slate-850 text-slate-800 dark:text-slate-250">
                              <td className="px-4 py-2 font-bold">{row.name}</td>
                              <td className="px-4 py-2 font-mono text-[10px]">{row.gstin || 'N/A'}</td>
                              <td className="px-4 py-2">{row.email || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-6 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
                <span />
                <Button
                  type="button"
                  onClick={handleBulkImport}
                  disabled={isLoading || csvData.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 cursor-pointer"
                >
                  {isLoading ? 'Importing...' : `Import ${validRowsCount} Clients`}
                </Button>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
