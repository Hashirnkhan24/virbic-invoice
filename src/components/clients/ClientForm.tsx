'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
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

const CLIENT_TARGET_FIELDS = [
  { key: 'name', label: 'Client Name', required: true, description: 'Legal or display name of the client' },
  { key: 'gstin', label: 'GSTIN', required: false, description: '15-digit GST identification number' },
  { key: 'email', label: 'Email Address', required: false, description: 'Primary contact email' },
  { key: 'phone', label: 'Phone Number', required: false, description: '10-digit mobile or telephone number' },
  { key: 'billingAddress', label: 'Billing Address', required: false, description: 'Street address' },
  { key: 'billingCity', label: 'City', required: false, description: 'City name' },
  { key: 'billingState', label: 'State', required: false, description: 'Indian State name or code' },
  { key: 'billingPincode', label: 'Pincode', required: false, description: '6-digit postal code' },
  { key: 'notes', label: 'Notes', required: false, description: 'Additional customer details or remarks' },
];

const autoMapClientHeaders = (headers: string[]): Record<string, string> => {
  const initialMappings: Record<string, string> = {};
  
  const aliasMap: Record<string, string[]> = {
    name: ['name', 'client name', 'company', 'company name', 'customer', 'customer name', 'organization', 'display name'],
    gstin: ['gstin', 'gst number', 'gst no', 'gst', 'tax registration', 'tax id', 'gst_in', 'gstin/uin'],
    email: ['email', 'email address', 'email id', 'emailaddress', 'email_id', 'mail'],
    phone: ['phone', 'phone number', 'phone_number', 'mobile', 'mobile number', 'contact', 'telephone'],
    billingAddress: ['billingaddress', 'billing address', 'address', 'street address', 'street', 'billing_address', 'address line 1', 'addressline1'],
    billingCity: ['billingcity', 'billing city', 'city', 'town', 'billing_city'],
    billingState: ['billingstate', 'billing state', 'state', 'province', 'billing_state'],
    billingPincode: ['billingpincode', 'billing pincode', 'pincode', 'pin code', 'postal code', 'zip', 'zip code', 'billing_pincode'],
    notes: ['notes', 'note', 'remarks', 'description', 'comment'],
  };

  headers.forEach((header) => {
    const cleanHeader = header.toLowerCase().trim();
    for (const [key, aliases] of Object.entries(aliasMap)) {
      if (aliases.includes(cleanHeader)) {
        initialMappings[key] = header;
        break;
      }
    }
  });

  return initialMappings;
};

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

  // CSV / Excel Import States
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [validRowsCount, setValidRowsCount] = useState(0);
  const [importStep, setImportStep] = useState<'upload' | 'map' | 'validate'>('upload');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [excelWorkbook, setExcelWorkbook] = useState<any>(null);
  const [sheetsList, setSheetsList] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [mappings, setMappings] = useState<Record<string, string>>({});

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
      setImportStep('upload');
      setRawHeaders([]);
      setRawRows([]);
      setExcelWorkbook(null);
      setSheetsList([]);
      setSelectedSheet('');
      setMappings({});
      
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

  // Drag and Drop CSV / Excel file
  const onDropCsv = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

      try {
        if (isExcel) {
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: 'array' });
          const sheets = workbook.SheetNames;
          
          setExcelWorkbook(workbook);
          setSheetsList(sheets);
          
          const defaultSheet = sheets[0];
          setSelectedSheet(defaultSheet);
          
          const worksheet = workbook.Sheets[defaultSheet];
          const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
          
          if (json.length === 0) {
            toast.error('The uploaded sheet is empty.');
            return;
          }
          
          // Row 0 is the headers
          const headers = json[0].map((h) => String(h).trim()).filter((h) => h !== '');
          const rows = json.slice(1).map((rowArray) => {
            const rowObj: any = {};
            headers.forEach((header, index) => {
              rowObj[header] = rowArray[index] !== undefined ? rowArray[index] : '';
            });
            return rowObj;
          });
          
          setRawHeaders(headers);
          setRawRows(rows);
          setMappings(autoMapClientHeaders(headers));
          setImportStep('map');
          
        } else {
          // CSV Parsing
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              const rows = results.data as any[];
              const headers = (results.meta.fields || []).map((h) => h.trim());
              
              if (rows.length === 0) {
                toast.error('The uploaded CSV file is empty.');
                return;
              }
              
              setRawHeaders(headers);
              setRawRows(rows);
              setMappings(autoMapClientHeaders(headers));
              setImportStep('map');
            },
            error: (err) => {
              toast.error(`Error parsing CSV: ${err.message}`);
            }
          });
        }
      } catch (err: any) {
        console.error(err);
        toast.error(`Failed to read spreadsheet file: ${err.message || err}`);
      }
    }
  };

  const handleSheetChange = async (sheetName: string) => {
    if (!excelWorkbook) return;
    try {
      setSelectedSheet(sheetName);
      const worksheet = excelWorkbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
      
      if (json.length === 0) {
        setRawHeaders([]);
        setRawRows([]);
        setMappings({});
        toast.warning('Selected sheet is empty.');
        return;
      }
      
      const headers = json[0].map((h) => String(h).trim()).filter((h) => h !== '');
      const rows = json.slice(1).map((rowArray) => {
        const rowObj: any = {};
        headers.forEach((header, index) => {
          rowObj[header] = rowArray[index] !== undefined ? rowArray[index] : '';
        });
        return rowObj;
      });
      
      setRawHeaders(headers);
      setRawRows(rows);
      setMappings(autoMapClientHeaders(headers));
    } catch (err: any) {
      toast.error(`Error loading sheet: ${err.message}`);
    }
  };

  const handleValidateMappings = () => {
    // Check if required fields are mapped
    const missingRequired = CLIENT_TARGET_FIELDS.filter((f) => f.required && !mappings[f.key]);
    if (missingRequired.length > 0) {
      toast.error(`Please map required fields: ${missingRequired.map((f) => f.label).join(', ')}`);
      return;
    }

    const errorsList: string[] = [];
    const validRows: any[] = [];

    rawRows.forEach((row, idx) => {
      const rowNumber = idx + 2; // header is row 1, so data starts at row 2
      
      // Extract values based on mapping
      const name = mappings.name ? String(row[mappings.name] || '').trim() : '';
      const gstin = mappings.gstin ? String(row[mappings.gstin] || '').trim() : '';
      const email = mappings.email ? String(row[mappings.email] || '').trim() : '';
      const phone = mappings.phone ? String(row[mappings.phone] || '').trim() : '';
      const billingAddress = mappings.billingAddress ? String(row[mappings.billingAddress] || '').trim() : '';
      const billingCity = mappings.billingCity ? String(row[mappings.billingCity] || '').trim() : '';
      const billingState = mappings.billingState ? String(row[mappings.billingState] || '').trim() : '';
      const billingPincode = mappings.billingPincode ? String(row[mappings.billingPincode] || '').trim() : '';
      const notes = mappings.notes ? String(row[mappings.notes] || '').trim() : '';

      // Skip entirely empty rows (edge case)
      const isRowEmpty = !name && !gstin && !email && !phone && !billingAddress && !billingCity && !billingState && !billingPincode && !notes;
      if (isRowEmpty) return;

      const mappedRow = {
        name,
        gstin,
        email,
        phone,
        billingAddress,
        billingCity,
        billingState,
        billingPincode,
        notes,
      };

      // Validations
      if (!mappedRow.name) {
        errorsList.push(`Row ${rowNumber}: Name is empty or missing`);
        return;
      }

      if (mappedRow.gstin) {
        const matches = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(
          mappedRow.gstin
        );
        if (!matches) {
          errorsList.push(`Row ${rowNumber}: Invalid GSTIN format ("${mappedRow.gstin}")`);
          return;
        }
      }

      if (mappedRow.email) {
        const emailMatches = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mappedRow.email);
        if (!emailMatches) {
          errorsList.push(`Row ${rowNumber}: Invalid Email format ("${mappedRow.email}")`);
          return;
        }
      }

      validRows.push(mappedRow);
    });

    setCsvData(validRows);
    setCsvErrors(errorsList);
    setValidRowsCount(validRows.length);
    setImportStep('validate');
    
    if (errorsList.length > 0) {
      toast.warning(`Mapped ${validRows.length} valid rows, but found ${errorsList.length} schema conflicts.`);
    } else {
      toast.success(`Success! All ${validRows.length} rows mapped and validated successfully.`);
    }
  };

  const {
    getRootProps: getCsvRootProps,
    getInputProps: getCsvInputProps,
    isDragActive: isCsvDragActive,
  } = useDropzone({
    onDrop: onDropCsv,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
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
          {/* TAB 3: CSV / EXCEL BULK IMPORT */}
          {!isEditMode && (
            <TabsContent value="csv" className="space-y-6">
              {importStep === 'upload' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-850">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-650 flex items-center justify-center">
                        <FileSpreadsheet className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-850 dark:text-slate-200">Spreadsheet Bulk Import</h4>
                        <p className="text-[11px] text-slate-500">Upload multiple client rows from CSV or Excel sheets.</p>
                      </div>
                    </div>
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={downloadCsvTemplate}
                      className="flex items-center justify-center gap-1.5 h-9 text-xs border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-300 hover:bg-slate-50 font-bold cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Template</span>
                    </Button>
                  </div>

                  {/* Dropzone */}
                  <div
                    {...getCsvRootProps()}
                    className={cn(
                      "border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/40 min-h-[200px]",
                      isCsvDragActive ? "border-emerald-500 bg-emerald-50/20" : "border-slate-300 dark:border-slate-800"
                    )}
                  >
                    <input {...getCsvInputProps()} />
                    <UploadCloud className="w-12 h-12 text-slate-400 mb-3" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-350 text-center">
                      {isCsvDragActive ? 'Drop your spreadsheet here' : 'Drag & drop your CSV or Excel client list'}
                    </p>
                    <p className="text-xs text-slate-450 mt-1 text-center">Formats: .csv, .xlsx, .xls files only</p>
                  </div>
                </div>
              )}

              {importStep === 'map' && (
                <div className="space-y-4">
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 p-3 rounded-lg flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-455">
                      File Loaded. Map spreadsheet headers to client attributes.
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setImportStep('upload')}
                      className="h-7 text-[10px] text-slate-550 font-bold cursor-pointer hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20"
                    >
                      Upload Different File
                    </Button>
                  </div>

                  {/* Excel Sheet selector if multiple */}
                  {sheetsList.length > 1 && (
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-lg border border-slate-200/50 dark:border-slate-800/80 text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">Selected Sheet:</span>
                      <select
                        value={selectedSheet}
                        onChange={(e) => handleSheetChange(e.target.value)}
                        className="h-8 px-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
                      >
                        {sheetsList.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Mapping Fields Grid */}
                  <div className="border border-slate-250/60 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-xs text-left border-collapse bg-white dark:bg-slate-900">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-455 font-bold uppercase tracking-wider">
                          <th className="px-4 py-2.5">Virbic Client Attribute</th>
                          <th className="px-4 py-2.5">Your Column Header</th>
                          <th className="px-4 py-2.5">Sample Value (Row 1)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                        {CLIENT_TARGET_FIELDS.map((field) => {
                          const mappedCol = mappings[field.key];
                          const previewVal = mappedCol ? String(rawRows[0]?.[mappedCol] || '') : '';
                          
                          return (
                            <tr key={field.key} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/10">
                              <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                                <span>{field.label}</span>
                                {field.required && <span className="text-red-500 ml-1 font-bold">*</span>}
                                <span className="block text-[10px] text-slate-400 font-medium">{field.description}</span>
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  value={mappedCol || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setMappings((prev) => {
                                      const next = { ...prev };
                                      if (val) next[field.key] = val;
                                      else delete next[field.key];
                                      return next;
                                    });
                                  }}
                                  className={cn(
                                    "w-full h-8 px-2 rounded-md border text-xs bg-white dark:bg-slate-900 cursor-pointer font-semibold",
                                    field.required && !mappedCol 
                                      ? "border-red-300 dark:border-red-900 text-red-500" 
                                      : "border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                                  )}
                                >
                                  <option value="">-- Unmapped --</option>
                                  {rawHeaders.map((header) => (
                                    <option key={header} value={header}>{header}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3 text-slate-500 font-medium truncate max-w-[150px]">
                                {mappedCol ? (
                                  previewVal ? (
                                    <code className="text-[10px] bg-slate-50 dark:bg-slate-950 px-1 py-0.5 rounded border border-slate-100 dark:border-slate-855 font-mono text-slate-650 dark:text-slate-400">{previewVal}</code>
                                  ) : (
                                    <span className="italic text-slate-355">empty</span>
                                  )
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setImportStep('upload')}
                      className="text-slate-500 hover:text-slate-800 dark:text-slate-450 dark:hover:text-slate-250 cursor-pointer font-bold"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleValidateMappings}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 cursor-pointer"
                    >
                      Validate & Preview Mapped Data
                    </Button>
                  </div>
                </div>
              )}

              {importStep === 'validate' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                      <Info className="w-4.5 h-4.5 text-emerald-500 animate-bounce" />
                      Validation Results: {validRowsCount} ready to import.
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setImportStep('map')}
                      className="h-7 text-[10px] text-slate-550 font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-850"
                    >
                      Adjust Column Mappings
                    </Button>
                  </div>

                  {/* Schema warnings log */}
                  {csvErrors.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-955/20 border border-amber-100 dark:border-amber-900/30 p-4 rounded-xl space-y-2">
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-450 flex items-center gap-1.5">
                        <AlertTriangle className="w-4.5 h-4.5 text-amber-500" />
                        Schema Conflicts / Warnings ({csvErrors.length} rows skipped)
                      </span>
                      <ul className="text-xs text-amber-750 dark:text-amber-400 space-y-1 max-h-32 overflow-y-auto list-disc pl-4 font-medium">
                        {csvErrors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                      <p className="text-[10px] text-slate-455 italic">These rows contain invalid data and will be skipped during import.</p>
                    </div>
                  )}

                  {csvErrors.length === 0 && (
                    <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 p-3 rounded-lg text-xs font-semibold text-emerald-800 dark:text-emerald-450 flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />
                      Success! Clean import. All rows matched and passed validations.
                    </div>
                  )}

                  {/* Data Preview Table */}
                  {csvData.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Previewing first 5 rows</h5>
                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                        <table className="w-full text-xs text-left border-collapse bg-white dark:bg-slate-900">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-455 font-bold uppercase">
                              <th className="px-4 py-2">Client Name</th>
                              <th className="px-4 py-2">GSTIN</th>
                              <th className="px-4 py-2">Email</th>
                              <th className="px-4 py-2">Phone</th>
                            </tr>
                          </thead>
                          <tbody>
                            {csvData.slice(0, 5).map((row, i) => (
                              <tr key={i} className="border-b border-slate-100 dark:border-slate-850 text-slate-800 dark:text-slate-200 font-medium">
                                <td className="px-4 py-2 font-bold text-slate-850 dark:text-slate-100">{row.name}</td>
                                <td className="px-4 py-2 font-mono text-[10px]">{row.gstin || <span className="text-slate-300">—</span>}</td>
                                <td className="px-4 py-2">{row.email || <span className="text-slate-300">—</span>}</td>
                                <td className="px-4 py-2">{row.phone || <span className="text-slate-300">—</span>}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-4 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
                    <Button
                      type="button"
                      onClick={() => setImportStep('map')}
                      className="h-9 px-4 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-850 rounded-lg cursor-pointer"
                    >
                      Back to Mapping
                    </Button>
                    <Button
                      type="button"
                      onClick={handleBulkImport}
                      disabled={isLoading || csvData.length === 0}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 cursor-pointer"
                    >
                      {isLoading ? 'Importing...' : `Confirm Import: Save ${validRowsCount} Clients`}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
