import { InvoiceTotals } from '@/lib/helpers';

/**
 * Shared props interface for all invoice template components.
 * Each template receives the same data and renders it in a unique visual style.
 */
export interface InvoiceTemplateProps {
  /** Raw invoice form data (invoiceNumber, dates, lineItems, notes, terms, etc.) */
  invoice: {
    invoiceNumber: string;
    issueDate: Date | string;
    dueDate: Date | string;
    placeOfSupply: string;
    currency: string;
    reverseCharge: boolean;
    notes?: string | null;
    terms?: string | null;
    lineItems: LineItemData[];
    customFields?: Record<string, string>[] | null;
  };
  /** Calculated totals from the tax engine */
  totals: InvoiceTotals;
  /** Business (supplier) details */
  business: BusinessData | null;
  /** Client (recipient) details */
  client: ClientData | null;
  /** Optional settings overrides */
  settings?: TemplateSettings;
  /** Rendering context */
  size?: 'preview' | 'full';
}

export interface LineItemData {
  description: string;
  hsnCode?: string | null;
  quantity: number | string;
  unit?: string | null;
  rate: number | string;
  discount: number | string;
  discountType: 'PERCENTAGE' | 'AMOUNT';
  gstRate: number | string;
}

export interface BusinessData {
  name: string;
  gstin?: string;
  pan?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  logo?: string;
  signature?: string;
  brandColor?: string;
}

export interface ClientData {
  name: string;
  gstin?: string;
  email?: string;
  phone?: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingPincode?: string;
  address?: string;
}

export interface TemplateSettings {
  primaryColor: string;
  font: string;
  showLogo: boolean;
  showSignature: boolean;
  showQR: boolean;
  showBankDetails: boolean;
  showWatermark: boolean;
}

/**
 * Registry of all template names.
 * Used by TemplateRenderer to map template string keys to components.
 */
export const TEMPLATE_NAMES = [
  'modern',
  'minimal',
  'professional',
  'creative',
  'dark',
  'classic',
  'gradient',
  'bold',
  'elegant',
  'startup',
] as const;

export type TemplateName = (typeof TEMPLATE_NAMES)[number];

/** Default settings fallback */
export const DEFAULT_SETTINGS: TemplateSettings = {
  primaryColor: '#10b981',
  font: 'Inter',
  showLogo: true,
  showSignature: true,
  showQR: true,
  showBankDetails: true,
  showWatermark: false,
};
