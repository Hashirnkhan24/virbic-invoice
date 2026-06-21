'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Check, Layers, Building2 } from 'lucide-react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  Info,
  CheckCircle2,
  Package,
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Standard GST unit list in India
const GST_UNITS = [
  { code: 'PCS', name: 'Pieces' },
  { code: 'HRS', name: 'Hours' },
  { code: 'MTH', name: 'Months' },
  { code: 'DAY', name: 'Days' },
  { code: 'BOX', name: 'Boxes' },
  { code: 'KGS', name: 'Kilograms' },
  { code: 'NOS', name: 'Numbers' },
  { code: 'OTH', name: 'Others' },
];

const itemFormSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional().nullable().or(z.literal('')),
  hsnCode: z.string().optional().nullable().or(z.literal('')),
  rate: z.number().min(0, 'Rate must be greater than or equal to 0'),
  gstRate: z.number(),
  unit: z.string(),
  isService: z.boolean(),
  businessId: z.string().optional().nullable().or(z.literal('')),
});

type ItemFormValues = z.infer<typeof itemFormSchema>;

interface Business {
  id: string;
  name: string;
  currency: string;
}

interface Item {
  id: string;
  name: string;
  description: string | null;
  hsnCode: string | null;
  rate: number;
  gstRate: number;
  unit: string;
  isService: boolean;
  businessId: string | null;
}

interface ItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Item | null;
  duplicateSource?: Item | null;
  businesses: Business[];
  onSuccess: () => Promise<void>;
}

const ITEM_TARGET_FIELDS = [
  { key: 'name', label: 'Item Name', required: true, description: 'Product or service name' },
  { key: 'rate', label: 'Rate (INR)', required: true, description: 'Price or service rate in ₹' },
  { key: 'description', label: 'Description', required: false, description: 'Detailed product description' },
  { key: 'gstRate', label: 'GST Rate (%)', required: false, description: 'Tax rate percentage (e.g. 18)' },
  { key: 'hsnCode', label: 'HSN/SAC Code', required: false, description: 'GST HSN or SAC classification code' },
  { key: 'unit', label: 'Unit', required: false, description: 'Quantity unit (e.g., PCS, BOX, HRS)' },
  { key: 'type', label: 'Type', required: false, description: 'Product or Service category' },
];

const autoMapItemHeaders = (headers: string[]): Record<string, string> => {
  const initialMappings: Record<string, string> = {};
  
  const aliasMap: Record<string, string[]> = {
    name: ['name', 'item name', 'product name', 'service name', 'product', 'service', 'item', 'title'],
    rate: ['rate', 'price', 'unit price', 'unitprice', 'cost', 'amount', 'rate (inr)', 'price (inr)'],
    description: ['description', 'desc', 'item description', 'details'],
    gstRate: ['gst rate', 'gstrate', 'gst %', 'gst percent', 'gst', 'tax', 'tax rate', 'tax percentage'],
    hsnCode: ['hsn/sac code', 'hsn code', 'hsn', 'sac', 'hsn_code', 'sac_code', 'hsncode', 'saccode'],
    unit: ['unit', 'uom', 'measurement', 'qty unit', 'quantity unit'],
    type: ['type', 'item type', 'category', 'product/service', 'is_service', 'product or service'],
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

export default function ItemForm({
  open,
  onOpenChange,
  initialData,
  duplicateSource,
  businesses,
  onSuccess,
}: ItemFormProps) {
  const [activeTab, setActiveTab] = useState('manual');
  
  // CSV / Excel Import States
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [validRowsCount, setValidRowsCount] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importStep, setImportStep] = useState<'upload' | 'map' | 'validate'>('upload');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [excelWorkbook, setExcelWorkbook] = useState<any>(null);
  const [sheetsList, setSheetsList] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [mappings, setMappings] = useState<Record<string, string>>({});

  const isEditMode = !!initialData;
  const isDuplicateMode = !!duplicateSource;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      name: '',
      description: '',
      hsnCode: '',
      rate: 0,
      gstRate: 18,
      unit: 'PCS',
      isService: true,
      businessId: 'all',
    },
  });

  const watchIsService = watch('isService');
  const watchGstRate = watch('gstRate');
  const watchUnit = watch('unit');
  const watchBusinessId = watch('businessId');

  // Prepopulate form when editing/duplicating
  useEffect(() => {
    if (open) {
      const source = initialData || duplicateSource;
      if (source) {
        reset({
          name: isDuplicateMode ? `${source.name} (Copy)` : source.name,
          description: source.description || '',
          hsnCode: source.hsnCode || '',
          rate: Number(source.rate),
          gstRate: Number(source.gstRate),
          unit: source.unit || 'PCS',
          isService: source.isService,
          businessId: source.businessId || 'all',
        });
      } else {
        const activeBizId = typeof window !== 'undefined' ? localStorage.getItem('active_business_id')?.replace(/^"|"$/g, '') || 'all' : 'all';
        reset({
          name: '',
          description: '',
          hsnCode: '',
          rate: 0,
          gstRate: 18,
          unit: 'PCS',
          isService: true,
          businessId: activeBizId,
        });
      }
      // Reset CSV state
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
      setActiveTab('manual');
    }
  }, [open, initialData, duplicateSource]);

  // Form submit handler
  const onFormSubmit = async (values: ItemFormValues) => {
    try {
      const url = isEditMode ? `/api/items/${initialData.id}` : '/api/items';
      const method = isEditMode ? 'PUT' : 'POST';
      
      const payload = {
        ...values,
        businessId: values.businessId === 'all' ? null : values.businessId,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(
          isEditMode
            ? 'Product/service updated successfully!'
            : 'Product/service added to catalog!'
        );
        await onSuccess();
        onOpenChange(false);
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Failed to save item');
      }
    } catch (e) {
      console.error(e);
      toast.error('An error occurred while saving.');
    }
  };

  // Quick Preset Helper for SAC chips
  const applySACPreset = (sac: string, label: string) => {
    setValue('isService', true);
    setValue('hsnCode', sac);
    setValue('gstRate', 18);
    setValue('unit', 'HRS');
    toast.success(`Applied preset for ${label}`);
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
          setMappings(autoMapItemHeaders(headers));
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
              setMappings(autoMapItemHeaders(headers));
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
      setMappings(autoMapItemHeaders(headers));
    } catch (err: any) {
      toast.error(`Error loading sheet: ${err.message}`);
    }
  };

  const handleValidateMappings = () => {
    // Check if required fields are mapped
    const missingRequired = ITEM_TARGET_FIELDS.filter((f) => f.required && !mappings[f.key]);
    if (missingRequired.length > 0) {
      toast.error(`Please map required fields: ${missingRequired.map((f) => f.label).join(', ')}`);
      return;
    }

    const errorsList: string[] = [];
    const validRows: any[] = [];

    rawRows.forEach((row, idx) => {
      const rowNumber = idx + 2; // header is row 1, data starts at row 2

      // Extract values based on mapping
      const name = mappings.name ? String(row[mappings.name] || '').trim() : '';
      const rateStr = mappings.rate ? String(row[mappings.rate] || '').trim() : '';
      const description = mappings.description ? String(row[mappings.description] || '').trim() : '';
      const gstRateStr = mappings.gstRate ? String(row[mappings.gstRate] || '').trim() : '';
      const hsnCode = mappings.hsnCode ? String(row[mappings.hsnCode] || '').trim() : '';
      const unit = mappings.unit ? String(row[mappings.unit] || '').trim() : '';
      const typeStr = mappings.type ? String(row[mappings.type] || '').trim().toLowerCase() : '';

      // Skip entirely empty rows
      const isRowEmpty = !name && !rateStr && !description && !gstRateStr && !hsnCode && !unit && !typeStr;
      if (isRowEmpty) return;

      // Validation & Parsing
      if (!name) {
        errorsList.push(`Row ${rowNumber}: Name is required`);
        return;
      }

      const rate = parseFloat(rateStr);
      if (isNaN(rate) || rate < 0) {
        errorsList.push(`Row ${rowNumber}: Invalid Rate value ("${rateStr}")`);
        return;
      }

      let gstRate = 18;
      if (gstRateStr) {
        const parsedGst = parseFloat(gstRateStr);
        if (!isNaN(parsedGst)) {
          gstRate = parsedGst;
        }
      }

      // Determine if service or product dynamically with smart fallbacks (Type term -> HSN/SAC code -> Unit -> Default)
      let isService = true;
      if (typeStr) {
        const isServiceTerm = ['service', 'services', 'serv', 's', 'yes', 'true', '1'].includes(typeStr);
        const isProductTerm = ['product', 'products', 'goods', 'good', 'prod', 'p', 'g', 'no', 'false', '0'].includes(typeStr);
        
        if (isServiceTerm) {
          isService = true;
        } else if (isProductTerm) {
          isService = false;
        } else {
          // Unrecognized term: Fallback to HSN/SAC detection
          if (hsnCode.startsWith('99')) {
            isService = true;
          } else if (unit && ['hrs', 'hr', 'day', 'days', 'mth', 'months', 'week', 'weeks'].includes(unit.toLowerCase())) {
            isService = true;
          } else {
            isService = false;
          }
        }
      } else {
        // Missing Type mapping or value: Fallback to HSN/SAC detection
        if (hsnCode.startsWith('99')) {
          isService = true;
        } else if (unit && ['hrs', 'hr', 'day', 'days', 'mth', 'months', 'week', 'weeks'].includes(unit.toLowerCase())) {
          isService = true;
        } else {
          isService = false; // Safe default
        }
      }

      // Check if unit is in standard list, or default
      let mappedUnit = 'PCS';
      if (unit) {
        const matchedUnit = GST_UNITS.find(u => u.code.toLowerCase() === unit.toLowerCase() || u.name.toLowerCase() === unit.toLowerCase());
        if (matchedUnit) {
          mappedUnit = matchedUnit.code;
        } else {
          const exists = GST_UNITS.some(u => u.code.toUpperCase() === unit.toUpperCase());
          mappedUnit = exists ? unit.toUpperCase() : 'PCS';
        }
      } else {
        mappedUnit = isService ? 'HRS' : 'PCS';
      }

      const selectedBusinessId = watchBusinessId === 'all' ? null : watchBusinessId;

      validRows.push({
        name,
        rate,
        description,
        gstRate,
        hsnCode,
        unit: mappedUnit,
        isService,
        businessId: selectedBusinessId,
      });
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
    getRootProps,
    getInputProps,
    isDragActive,
  } = useDropzone({
    onDrop: onDropCsv,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
  });

  // Export templates
  const downloadTemplate = () => {
    const csvContent = 'Name,Description,Type,Rate,Unit,GST Rate,HSN/SAC Code\n"Web Development Service","Custom web design and coding","Service",1500,"HRS",18,"998314"\n"Office Chair","Ergonomic mesh rolling chair","Product",4500,"PCS",18,"9403"';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'virbic_items_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Run Bulk Import
  const handleBulkImport = async () => {
    if (csvData.length === 0) return;
    setImporting(true);
    let successCount = 0;
    
    try {
      for (const row of csvData) {
        const res = await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(row),
        });
        if (res.ok) {
          successCount++;
        }
      }
      
      toast.success(`Successfully imported ${successCount} of ${csvData.length} items!`);
      await onSuccess();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error('An error occurred during bulk import.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 overflow-hidden">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-50">
            {isEditMode ? 'Edit Catalog Item' : isDuplicateMode ? 'Duplicate Item' : 'Add Item to Catalog'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Create reusable entries for your products or services to speed up invoicing.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          {/* Form Tabs list (disable CSV in edit mode for focus) */}
          {!isEditMode && !isDuplicateMode && (
            <TabsList className="grid w-full grid-cols-2 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg mb-4 shrink-0">
              <TabsTrigger value="manual" className="text-xs font-bold py-1.5 rounded-md cursor-pointer">
                Manual Input
              </TabsTrigger>
              <TabsTrigger value="import" className="text-xs font-bold py-1.5 rounded-md cursor-pointer">
                Bulk CSV Import
              </TabsTrigger>
            </TabsList>
          )}

          {/* Business association filter bound globally */}
          <div className="mb-4 shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450">Assign to Entity</span>
              <p className="text-[9px] text-slate-400">Which business profiles can use this item?</p>
            </div>
            <Select
              value={watchBusinessId || 'all'}
              onValueChange={(val) => setValue('businessId', val || 'all')}
            >
              <SelectTrigger className="h-8 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 rounded-lg">
                <SelectValue placeholder="All Businesses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs font-bold">All Businesses (Global)</SelectItem>
                {businesses.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-xs font-semibold">
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* TAB 1: MANUAL FORM */}
          <TabsContent value="manual" className="flex-1 overflow-y-auto pr-1 space-y-4 focus-visible:outline-none">
            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
              
              {/* Item Type - Modern Row design */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450">Item Catalog Type</label>
                  <p className="text-[9px] text-slate-400">Identify this item as a service or a physical product.</p>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg h-8 w-44 shrink-0">
                  <button
                    type="button"
                    onClick={() => setValue('isService', true)}
                    className={cn(
                      "flex-1 text-[9px] font-extrabold uppercase tracking-wider rounded-md transition-all cursor-pointer",
                      watchIsService
                        ? "bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-100 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    Service
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue('isService', false)}
                    className={cn(
                      "flex-1 text-[9px] font-extrabold uppercase tracking-wider rounded-md transition-all cursor-pointer",
                      !watchIsService
                        ? "bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-100 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    Product
                  </button>
                </div>
              </div>

              {/* Item Name - full width */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450">Item Name</label>
                <Input
                  placeholder={watchIsService ? "e.g., Software Development Services" : "e.g., Office Ergonomic Desk"}
                  {...register('name')}
                  className="h-9 text-xs font-semibold bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 rounded-lg"
                />
                {errors.name && <p className="text-[10px] text-red-500 font-semibold">{errors.name.message}</p>}
              </div>

              {/* Rate, Unit, GST */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450">Base Rate (₹)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register('rate', { valueAsNumber: true })}
                    className="h-9 text-xs font-semibold bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 rounded-lg"
                  />
                  {errors.rate && <p className="text-[10px] text-red-500 font-semibold">{errors.rate.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450">Unit</label>
                  <Select
                    value={watchUnit || 'PCS'}
                    onValueChange={(val) => setValue('unit', val || 'PCS')}
                  >
                    <SelectTrigger className="h-9 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 rounded-lg">
                      <SelectValue placeholder="PCS" />
                    </SelectTrigger>
                    <SelectContent>
                      {GST_UNITS.map((u) => (
                        <SelectItem key={u.code} value={u.code} className="text-xs font-semibold">
                          {u.code} - {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450">Default GST Rate</label>
                  <Select
                    value={String(watchGstRate ?? 18)}
                    onValueChange={(val) => setValue('gstRate', parseFloat(val || '18'))}
                  >
                    <SelectTrigger className="h-9 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 rounded-lg">
                      <SelectValue placeholder="18%" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0" className="text-xs font-semibold">0% (Nil/Exempt)</SelectItem>
                      <SelectItem value="5" className="text-xs font-semibold">5% GST</SelectItem>
                      <SelectItem value="12" className="text-xs font-semibold">12% GST</SelectItem>
                      <SelectItem value="18" className="text-xs font-semibold">18% GST (Standard)</SelectItem>
                      <SelectItem value="28" className="text-xs font-semibold">28% GST</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* HSN/SAC Code & Inline Presets */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450">
                    {watchIsService ? 'SAC Code (Services)' : 'HSN Code (Goods)'}
                  </label>
                  <span className="text-[8px] text-slate-400 font-bold uppercase">Optional but Recommended</span>
                </div>
                <Input
                  placeholder={watchIsService ? "e.g., 998314" : "e.g., 84713010"}
                  {...register('hsnCode')}
                  className="h-9 text-xs font-semibold bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 rounded-lg"
                />

                {/* Inline Quick Chips presets */}
                {watchIsService && (
                  <div className="flex flex-wrap gap-1.5 pt-1 items-center">
                    <span className="text-[9px] text-slate-400 font-bold uppercase">SAC Presets:</span>
                    <button
                      type="button"
                      onClick={() => applySACPreset('998314', 'Software Dev')}
                      className="px-2 py-0.5 border border-slate-200 dark:border-slate-800 text-[9px] font-bold text-slate-650 hover:text-emerald-500 rounded bg-white dark:bg-slate-900 cursor-pointer hover:border-emerald-300 transition-colors"
                    >
                      IT/Software (998314)
                    </button>
                    <button
                      type="button"
                      onClick={() => applySACPreset('998311', 'Consulting')}
                      className="px-2 py-0.5 border border-slate-200 dark:border-slate-800 text-[9px] font-bold text-slate-650 hover:text-emerald-500 rounded bg-white dark:bg-slate-900 cursor-pointer hover:border-emerald-300 transition-colors"
                    >
                      Consulting (998311)
                    </button>
                    <button
                      type="button"
                      onClick={() => applySACPreset('998313', 'Design Work')}
                      className="px-2 py-0.5 border border-slate-200 dark:border-slate-800 text-[9px] font-bold text-slate-650 hover:text-emerald-500 rounded bg-white dark:bg-slate-900 cursor-pointer hover:border-emerald-300 transition-colors"
                    >
                      Design (998313)
                    </button>
                  </div>
                )}
                <p className="text-[9px] text-slate-400 font-semibold leading-normal pt-1">
                  Providing HSN/SAC codes allows the GST tax calculations engines to validate tax categories for filing GSTR-1 summaries correctly.
                </p>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450">Default Invoice Description</label>
                <Textarea
                  placeholder="Provide details that will automatically populate on invoice line descriptions..."
                  {...register('description')}
                  rows={3}
                  className="text-xs font-semibold bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 rounded-lg"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="h-9 text-xs font-bold border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-950 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer shadow-md shadow-emerald-500/10"
                >
                  {isSubmitting ? 'Saving...' : 'Save to Catalog'}
                </Button>
              </div>
            </form>
          </TabsContent>          {/* TAB 2: CSV / EXCEL BULK IMPORT */}
          <TabsContent value="import" className="flex-1 overflow-y-auto pr-1 space-y-4 focus-visible:outline-none">
            {importStep === 'upload' && (
              <div className="space-y-4">
                {/* CSV Drag and Drop Zone */}
                <div
                  {...getRootProps()}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-950/20 min-h-[160px]",
                    isDragActive && "border-emerald-450 bg-emerald-50/10 dark:bg-emerald-950/10"
                  )}
                >
                  <input {...getInputProps()} />
                  <UploadCloud className="w-10 h-10 text-slate-400 animate-pulse" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-350">
                    {isDragActive ? 'Drop your spreadsheet here' : 'Drag & drop your CSV or Excel catalog file'}
                  </p>
                  <p className="text-[9px] text-slate-400">
                    Formats: .csv, .xlsx, .xls files only
                  </p>
                </div>

                {/* Template & Helper info */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/20 p-3 rounded-lg border border-slate-100 dark:border-slate-855">
                  <div className="space-y-0.5">
                    <h5 className="text-[10px] font-extrabold uppercase text-slate-800 dark:text-slate-100 flex items-center gap-1">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Spreadsheet Formatting Template</span>
                    </h5>
                    <p className="text-[9px] text-slate-400">Use our standard catalog structure to avoid parsing issues.</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadTemplate}
                    className="h-8 text-[10px] font-bold border-slate-200 dark:border-slate-800 hover:bg-slate-100 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    <span>Download Template</span>
                  </Button>
                </div>
              </div>
            )}

            {importStep === 'map' && (
              <div className="space-y-4">
                <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 p-2.5 rounded-lg flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-455">
                    File Loaded. Map spreadsheet headers to catalog fields.
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setImportStep('upload')}
                    className="h-7 text-[9px] text-slate-550 font-black cursor-pointer hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20"
                  >
                    Choose Different File
                  </Button>
                </div>

                {/* Excel Sheet selector if multiple */}
                {sheetsList.length > 1 && (
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-150 dark:border-slate-800/80 text-[11px]">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Selected Sheet:</span>
                    <select
                      value={selectedSheet}
                      onChange={(e) => handleSheetChange(e.target.value)}
                      className="h-7 px-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
                    >
                      {sheetsList.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Mapping Fields Grid */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
                  <table className="w-full text-[11px] text-left border-collapse bg-white dark:bg-slate-900">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-455 font-bold uppercase tracking-wider">
                        <th className="px-3 py-2">Catalog Field</th>
                        <th className="px-3 py-2">Spreadsheet Header</th>
                        <th className="px-3 py-2">Preview (Row 1)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                      {ITEM_TARGET_FIELDS.map((field) => {
                        const mappedCol = mappings[field.key];
                        const previewVal = mappedCol ? String(rawRows[0]?.[mappedCol] || '') : '';
                        
                        return (
                          <tr key={field.key} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/10">
                            <td className="px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-300">
                              <span>{field.label}</span>
                              {field.required && <span className="text-red-500 ml-1 font-bold">*</span>}
                              <span className="block text-[9px] text-slate-400 font-medium">{field.description}</span>
                            </td>
                            <td className="px-3 py-2.5">
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
                                  "w-full h-8 px-2 rounded-md border text-[11px] bg-white dark:bg-slate-900 cursor-pointer font-semibold",
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
                            <td className="px-3 py-2.5 text-slate-500 font-medium truncate max-w-[120px]">
                              {mappedCol ? (
                                previewVal ? (
                                  <code className="text-[10px] bg-slate-50 dark:bg-slate-950 px-1 py-0.5 rounded border border-slate-150 font-mono text-slate-655 dark:text-slate-400">{previewVal}</code>
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
                <div className="pt-3 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setImportStep('upload')}
                    className="text-slate-500 hover:text-slate-800 dark:text-slate-450 dark:hover:text-slate-250 cursor-pointer font-bold h-8 text-[11px]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleValidateMappings}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 cursor-pointer h-8 text-[11px]"
                  >
                    Validate & Preview Mapped Data
                  </Button>
                </div>
              </div>
            )}

            {importStep === 'validate' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                  <span className="text-[11px] font-bold text-slate-505 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-emerald-500" />
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
                  <div className="bg-amber-50 dark:bg-amber-955/20 border border-amber-100 dark:border-amber-900/30 p-3 rounded-lg space-y-2">
                    <span className="text-xs font-bold text-amber-850 dark:text-amber-450 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Schema Conflicts / Warnings ({csvErrors.length} rows skipped)
                    </span>
                    <ul className="text-[10px] text-amber-750 dark:text-amber-400 space-y-1 max-h-24 overflow-y-auto list-disc pl-4 font-medium">
                      {csvErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                    <p className="text-[9px] text-slate-455 italic">These rows contain invalid data and will be skipped during import.</p>
                  </div>
                )}

                {csvErrors.length === 0 && (
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 p-2.5 rounded-lg text-[11px] font-semibold text-emerald-800 dark:text-emerald-450 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />
                    Success! Clean import. All rows matched and passed validations.
                  </div>
                )}

                {/* Data Preview Table */}
                {csvData.length > 0 && (
                  <div className="space-y-1.5">
                    <h5 className="text-[9px] font-black uppercase tracking-wider text-slate-400">Previewing first 5 rows</h5>
                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
                      <table className="w-full text-[11px] text-left border-collapse bg-white dark:bg-slate-900">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-455 font-bold uppercase">
                            <th className="px-3 py-1.5">Item Name</th>
                            <th className="px-3 py-1.5">Rate</th>
                            <th className="px-3 py-1.5">GST</th>
                            <th className="px-3 py-1.5">Unit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {csvData.slice(0, 5).map((row, i) => (
                            <tr key={i} className="border-b border-slate-100 dark:border-slate-850 text-slate-800 dark:text-slate-200 font-medium">
                              <td className="px-3 py-1.5 font-bold text-slate-850 dark:text-slate-100">{row.name}</td>
                              <td className="px-3 py-1.5 font-mono">₹{row.rate.toFixed(2)}</td>
                              <td className="px-3 py-1.5">{row.gstRate}%</td>
                              <td className="px-3 py-1.5">{row.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-3 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
                  <Button
                    type="button"
                    onClick={() => setImportStep('map')}
                    className="h-8 px-3 text-[11px] font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-850 rounded-lg cursor-pointer"
                  >
                    Back to Mapping
                  </Button>
                  <Button
                    type="button"
                    onClick={handleBulkImport}
                    disabled={validRowsCount === 0 || importing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 cursor-pointer h-8 text-[11px]"
                  >
                    {importing ? 'Importing items...' : `Confirm Import: Save ${validRowsCount} Items`}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
