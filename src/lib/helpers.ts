import { format } from 'date-fns';
import { InvoiceLineItem } from '@/types';
import { formatCurrency as newFormatCurrency } from './currency';

// Format currency standard (e.g. ₹ 12,500.00)
export function formatCurrency(amount: number | string, currency = 'INR'): string {
  return newFormatCurrency(amount, currency);
}

// Format date (e.g. 16 Jun 2026)
export function formatDate(date: Date | string | number): string {
  try {
    const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    return format(dateObj, 'dd MMM yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return String(date);
  }
}

// Format invoice number (e.g. INV/2026-27/001)
export function formatInvoiceNumber(prefix: string, number: number, fy: string): string {
  const paddedNumber = String(number).padStart(3, '0');
  return `${prefix}/${fy}/${paddedNumber}`;
}

// Calculate GST details for a subtotal amount
export function calculateGST(
  subTotal: number,
  gstRate: number,
  isInterState: boolean
): { cgst: number; sgst: number; igst: number } {
  const rate = gstRate / 100;
  
  if (isInterState) {
    return {
      cgst: 0,
      sgst: 0,
      igst: subTotal * rate,
    };
  } else {
    const halfRate = rate / 2;
    return {
      cgst: subTotal * halfRate,
      sgst: subTotal * halfRate,
      igst: 0,
    };
  }
}

// Validate GSTIN format
export function validateGSTIN(gstin: string): boolean {
  // 15 characters: 2 numbers, 10 PAN characters (5 letters, 4 numbers, 1 letter), 1 number/letter, 1 'Z', 1 number/letter
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
  return gstinRegex.test(gstin.trim());
}

// Validate PAN format
export function validatePAN(pan: string): boolean {
  // 10 characters: 5 letters, 4 numbers, 1 letter
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i;
  return panRegex.test(pan.trim());
}

// Get Indian Financial Year (e.g. 2026-27)
export function getFinancialYear(date: Date | string | number = new Date()): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth(); // 0-indexed: 0 = Jan, 3 = Apr

  // Indian financial year runs from April 1 to March 31 of next year
  if (month >= 3) {
    const nextYearShort = String(year + 1).slice(-2);
    return `${year}-${nextYearShort}`;
  } else {
    const currentYearShort = String(year).slice(-2);
    return `${year - 1}-${currentYearShort}`;
  }
}

// Generate a random alphanumeric string for public sharing links
export function generatePublicShareId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Calculate comprehensive totals from line items
export interface InvoiceTotals {
  subTotal: number;
  discountTotal: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  cessTotal: number;
  roundOff: number;
  grandTotal: number;
}

export function calculateTotals(
  lineItems: Omit<InvoiceLineItem, 'id' | 'invoiceId' | 'taxableValue' | 'totalAmount' | 'cgstAmount' | 'sgstAmount' | 'igstAmount'>[],
  isInterState: boolean
): InvoiceTotals {
  let subTotal = 0;
  let discountTotal = 0;
  let taxableAmount = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  const cessTotal = 0; // default 0, can be extended later if needed

  lineItems.forEach((item) => {
    const rate = Number(item.rate) || 0;
    const quantity = Number(item.quantity) || 0;
    const itemSubtotal = rate * quantity;
    subTotal += itemSubtotal;

    // Calculate discount
    const discountVal = Number(item.discount) || 0;
    let itemDiscount = 0;
    if (item.discountType === 'PERCENTAGE') {
      itemDiscount = itemSubtotal * (discountVal / 100);
    } else {
      itemDiscount = Math.min(discountVal, itemSubtotal);
    }
    discountTotal += itemDiscount;

    const itemTaxable = itemSubtotal - itemDiscount;
    taxableAmount += itemTaxable;

    // Calculate taxes
    const gstRateVal = Number(item.gstRate) || 0;
    const taxes = calculateGST(itemTaxable, gstRateVal, isInterState);
    cgstTotal += taxes.cgst;
    sgstTotal += taxes.sgst;
    igstTotal += taxes.igst;
  });

  const rawGrandTotal = taxableAmount + cgstTotal + sgstTotal + igstTotal + cessTotal;
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = Number((grandTotal - rawGrandTotal).toFixed(2));

  return {
    subTotal: Number(subTotal.toFixed(2)),
    discountTotal: Number(discountTotal.toFixed(2)),
    taxableAmount: Number(taxableAmount.toFixed(2)),
    cgstTotal: Number(cgstTotal.toFixed(2)),
    sgstTotal: Number(sgstTotal.toFixed(2)),
    igstTotal: Number(igstTotal.toFixed(2)),
    cessTotal: Number(cessTotal.toFixed(2)),
    roundOff,
    grandTotal,
  };
}
