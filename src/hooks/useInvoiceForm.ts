import { useState, useEffect, useMemo, useCallback } from 'react';
import { useGetBusinesses } from './useBusiness';
import { useLocalStorage } from './useLocalStorage';
import { INDIAN_STATES } from '@/lib/constants';
import {
  determineTaxType,
  calculateInvoiceTotals,
  TaxLineItemInput,
} from '@/lib/tax-engine';
import { formatInvoiceNumber, getFinancialYear } from '@/lib/helpers';

export interface LineItemState {
  itemId?: string | null;
  description: string;
  hsnCode?: string | null;
  quantity: number;
  unit: string;
  rate: number;
  discount: number;
  discountType: 'PERCENTAGE' | 'AMOUNT';
  gstRate: number;
}

export interface InvoiceFormState {
  businessId: string;
  clientId: string;
  invoiceNumber: string;
  template: string;
  currency: string;
  exchangeRate: number;
  issueDate: Date;
  dueDate: Date;
  placeOfSupply: string;
  reverseCharge: boolean;
  notes: string;
  terms: string;
  customFields: { key: string; value: string }[];
  overallDiscount: number;
  overallDiscountType: 'PERCENTAGE' | 'AMOUNT';
  cessRate: number;
  lineItems: LineItemState[];
}

const DEFAULT_LINE_ITEM: LineItemState = {
  description: '',
  hsnCode: '',
  quantity: 1,
  unit: 'PCS',
  rate: 0,
  discount: 0,
  discountType: 'PERCENTAGE',
  gstRate: 18,
};

export function useInvoiceForm(initialInvoice?: any) {
  const { businesses, loading: loadingBusinesses } = useGetBusinesses();
  const [activeBusinessId] = useLocalStorage<string | null>('active_business_id', null);

  // Active business resolver
  const activeBusiness = useMemo(() => {
    if (businesses.length === 0) return null;
    return businesses.find((b) => b.id === activeBusinessId) || businesses.find((b) => b.isDefault) || businesses[0];
  }, [businesses, activeBusinessId]);

  // Initial form values
  const initialFormState = useCallback((business: any): InvoiceFormState => {
    if (initialInvoice) {
      return {
        businessId: initialInvoice.businessId,
        clientId: initialInvoice.clientId,
        invoiceNumber: initialInvoice.invoiceNumber,
        template: initialInvoice.template || 'modern',
        currency: initialInvoice.currency || 'INR',
        exchangeRate: initialInvoice.exchangeRate || 1,
        issueDate: new Date(initialInvoice.issueDate),
        dueDate: new Date(initialInvoice.dueDate),
        placeOfSupply: initialInvoice.placeOfSupply || '',
        reverseCharge: initialInvoice.reverseCharge || false,
        notes: initialInvoice.notes || '',
        terms: initialInvoice.terms || '',
        customFields: initialInvoice.customFields || [],
        overallDiscount: Number(initialInvoice.overallDiscount) || 0,
        overallDiscountType: initialInvoice.overallDiscountType || 'PERCENTAGE',
        cessRate: Number(initialInvoice.cessRate) || 0,
        lineItems: initialInvoice.lineItems.map((item: any) => ({
          itemId: item.itemId,
          description: item.description,
          hsnCode: item.hsnCode,
          quantity: Number(item.quantity),
          unit: item.unit || 'PCS',
          rate: Number(item.rate),
          discount: Number(item.discount) || 0,
          discountType: item.discountType || 'PERCENTAGE',
          gstRate: Number(item.gstRate) || 18,
        })),
      };
    }

    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 15); // default 15 days due date
    
    const prefix = business?.invoicePrefix || 'INV';
    const number = business?.invoiceNumber || 1;
    const fy = business?.financialYear || getFinancialYear(today);
    
    return {
      businessId: business?.id || '',
      clientId: '',
      invoiceNumber: formatInvoiceNumber(prefix, number, fy),
      template: 'modern',
      currency: 'INR',
      exchangeRate: 1,
      issueDate: today,
      dueDate: nextWeek,
      placeOfSupply: business?.state || '',
      reverseCharge: false,
      notes: 'Thank you for your business!',
      terms: '1. Please pay within the due date.\n2. Goods once sold will not be taken back.',
      customFields: [],
      overallDiscount: 0,
      overallDiscountType: 'PERCENTAGE',
      cessRate: 0,
      lineItems: [{ ...DEFAULT_LINE_ITEM }],
    };
  }, [initialInvoice]);

  const [formState, setFormState] = useState<InvoiceFormState>(() => initialFormState(null));
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Initialize form state when active business is loaded
  useEffect(() => {
    if (initialInvoice) {
      setFormState(initialFormState(null));
      setIsDraftLoaded(true);
      return;
    }
    if (activeBusiness && !isDraftLoaded) {
      // Check if there is a draft in local storage for this business
      const draftKey = `invoice_draft_${activeBusiness.id}`;
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          // Restore Date objects
          parsed.issueDate = new Date(parsed.issueDate);
          parsed.dueDate = new Date(parsed.dueDate);
          setFormState(parsed);
        } catch (e) {
          console.warn('Failed to parse invoice draft', e);
          setFormState(initialFormState(activeBusiness));
        }
      } else {
        setFormState(initialFormState(activeBusiness));
      }
      setIsDraftLoaded(true);
    }
  }, [activeBusiness, isDraftLoaded, initialFormState, initialInvoice]);

  // Debounced auto-save to localStorage every 3 seconds
  useEffect(() => {
    if (initialInvoice) return;
    if (!activeBusiness || !isDraftLoaded) return;
    
    setIsSaving(true);
    const delayDebounce = setTimeout(() => {
      const draftKey = `invoice_draft_${activeBusiness.id}`;
      localStorage.setItem(draftKey, JSON.stringify(formState));
      setLastSaved(new Date());
      setIsSaving(false);
    }, 3000);

    return () => clearTimeout(delayDebounce);
  }, [formState, activeBusiness, isDraftLoaded, initialInvoice]);

  // Force reset/clear draft
  const resetDraft = useCallback(() => {
    if (!activeBusiness) return;
    const draftKey = `invoice_draft_${activeBusiness.id}`;
    localStorage.removeItem(draftKey);
    setFormState(initialFormState(activeBusiness));
    setLastSaved(null);
  }, [activeBusiness, initialFormState]);

  // Calculate interstate state based on place of supply vs business state
  const isInterState = useMemo(() => {
    if (!activeBusiness) return false;
    const taxType = determineTaxType(activeBusiness.state, formState.placeOfSupply);
    return taxType === 'inter';
  }, [activeBusiness, formState.placeOfSupply]);

  // Real-time calculations
  const totals = useMemo(() => {
    const lineItemInputs: TaxLineItemInput[] = formState.lineItems.map((item) => ({
      quantity: item.quantity,
      rate: item.rate,
      discount: item.discount,
      discountType: item.discountType,
      gstRate: item.gstRate,
    }));

    return calculateInvoiceTotals(
      lineItemInputs,
      formState.overallDiscount,
      formState.overallDiscountType,
      isInterState,
      formState.cessRate
    );
  }, [formState.lineItems, formState.overallDiscount, formState.overallDiscountType, formState.cessRate, isInterState]);

  // Form validations
  const isValid = useMemo(() => {
    // 1. Client selected
    if (!formState.clientId) return false;
    // 2. Invoice number set
    if (!formState.invoiceNumber.trim()) return false;
    // 3. Due date >= issue date
    if (formState.dueDate < formState.issueDate) return false;
    // 4. At least one line item with description, positive quantity and non-negative rate
    if (formState.lineItems.length === 0) return false;
    const hasValidItems = formState.lineItems.every(
      (item) => item.description.trim() !== '' && item.quantity > 0 && item.rate >= 0
    );
    if (!hasValidItems) return false;

    return true;
  }, [formState]);

  // Actions
  const setClient = useCallback((clientId: string, clientGstin?: string | null, clientState?: string | null) => {
    setFormState((prev) => {
      let placeOfSupply = prev.placeOfSupply;
      
      // Auto-detect place of supply from GSTIN or state
      if (clientGstin && clientGstin.length >= 2) {
        const stateCode = clientGstin.slice(0, 2);
        const resolvedState = INDIAN_STATES.find((s) => s.gstCode === stateCode);
        if (resolvedState) {
          placeOfSupply = resolvedState.name;
        }
      } else if (clientState) {
        // Fall back to client billing/shipping state
        const resolvedState = INDIAN_STATES.find(
          (s) => s.name.toLowerCase() === clientState.toLowerCase() || s.code.toLowerCase() === clientState.toLowerCase()
        );
        if (resolvedState) {
          placeOfSupply = resolvedState.name;
        }
      }
      
      return {
        ...prev,
        clientId,
        placeOfSupply,
      };
    });
  }, []);

  const addLineItem = useCallback((item?: Partial<LineItemState>) => {
    setFormState((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        {
          ...DEFAULT_LINE_ITEM,
          ...item,
        },
      ],
    }));
  }, []);

  const removeLineItem = useCallback((index: number) => {
    setFormState((prev) => {
      const newLineItems = prev.lineItems.filter((_, idx) => idx !== index);
      return {
        ...prev,
        lineItems: newLineItems.length > 0 ? newLineItems : [{ ...DEFAULT_LINE_ITEM }],
      };
    });
  }, []);

  const updateLineItem = useCallback((index: number, fields: Partial<LineItemState>) => {
    setFormState((prev) => {
      const newLineItems = prev.lineItems.map((item, idx) => {
        if (idx !== index) return item;
        return {
          ...item,
          ...fields,
        };
      });
      return {
        ...prev,
        lineItems: newLineItems,
      };
    });
  }, []);

  const setDates = useCallback((issueDate: Date, dueDate: Date) => {
    setFormState((prev) => ({
      ...prev,
      issueDate,
      dueDate,
    }));
  }, []);

  const setTemplate = useCallback((template: string) => {
    setFormState((prev) => ({
      ...prev,
      template,
    }));
  }, []);

  const setCurrency = useCallback((currency: string) => {
    setFormState((prev) => {
      const isNonINR = currency !== 'INR';
      const notes = isNonINR
        ? 'GST not applicable for foreign currency invoices'
        : 'Thank you for your business!';
      
      const rates: Record<string, number> = {
        INR: 1.0,
        USD: 83.5,
        EUR: 90.0,
        GBP: 106.0,
      };
      const exchangeRate = rates[currency] || 1.0;

      return {
        ...prev,
        currency,
        exchangeRate,
        notes: prev.notes === 'Thank you for your business!' || prev.notes === 'GST not applicable for foreign currency invoices' || !prev.notes
          ? notes
          : prev.notes,
      };
    });
  }, []);

  const setPlaceOfSupply = useCallback((placeOfSupply: string) => {
    setFormState((prev) => ({
      ...prev,
      placeOfSupply,
    }));
  }, []);

  const updateField = useCallback((field: keyof InvoiceFormState, value: any) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  return {
    formState,
    activeBusiness,
    isInterState,
    totals,
    isValid,
    isSaving,
    lastSaved,
    actions: {
      setClient,
      addLineItem,
      removeLineItem,
      updateLineItem,
      setDates,
      setTemplate,
      setCurrency,
      setPlaceOfSupply,
      updateField,
      resetDraft,
      setFormState,
    },
    loading: loadingBusinesses || !isDraftLoaded,
  };
}
