import { INDIAN_STATES } from './constants';

export interface TaxLineItemInput {
  quantity: number | string;
  rate: number | string;
  discount: number | string;
  discountType: 'PERCENTAGE' | 'AMOUNT';
  gstRate: number | string;
}

export interface TaxTotals {
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

/**
 * Resolves a state name, state code, or GST state code to its standard 2-letter state code.
 */
export function resolveStateCode(stateNameOrCode: string | null | undefined): string {
  if (!stateNameOrCode) return '';
  const query = stateNameOrCode.trim().toLowerCase();
  
  const state = INDIAN_STATES.find(
    (s) =>
      s.code.toLowerCase() === query ||
      s.name.toLowerCase() === query ||
      s.gstCode === query
  );
  
  return state ? state.code : query.toUpperCase();
}

/**
 * Compares two states (e.g. business state vs. client supply state)
 * to determine if the transaction is intra-state (CGST+SGST) or inter-state (IGST).
 */
export function determineTaxType(
  businessState: string | null | undefined,
  supplyState: string | null | undefined
): 'intra' | 'inter' {
  if (!businessState || !supplyState) return 'intra';
  const bCode = resolveStateCode(businessState);
  const sCode = resolveStateCode(supplyState);
  return bCode === sCode ? 'intra' : 'inter';
}

/**
 * Formats a numeric amount as currency based on selected code.
 */
export function formatCurrency(amount: number | string, currency = 'INR'): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
  
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  };

  const locale = currency === 'INR' ? 'en-IN' : 'en-US';

  try {
    return new Intl.NumberFormat(locale, options).format(numericAmount);
  } catch (error) {
    console.error('Error formatting currency in tax engine:', error);
    return `${currency} ${numericAmount.toFixed(2)}`;
  }
}

/**
 * Calculates raw amounts and taxes for a single line item.
 */
export function calculateLineItemTotal(item: TaxLineItemInput, isInterState: boolean) {
  const quantity = Number(item.quantity) || 0;
  const rate = Number(item.rate) || 0;
  const discount = Number(item.discount) || 0;
  const gstRate = Number(item.gstRate) || 0;

  const amount = quantity * rate;
  
  // Calculate line-level discount
  let discountAmount = 0;
  if (item.discountType === 'PERCENTAGE') {
    discountAmount = amount * (discount / 100);
  } else {
    discountAmount = Math.min(discount, amount);
  }

  const taxableValue = Math.max(0, amount - discountAmount);
  const taxRate = gstRate / 100;

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isInterState) {
    igstAmount = taxableValue * taxRate;
  } else {
    cgstAmount = taxableValue * (taxRate / 2);
    sgstAmount = taxableValue * (taxRate / 2);
  }

  const totalAmount = taxableValue + cgstAmount + sgstAmount + igstAmount;

  return {
    amount: Number(amount.toFixed(2)),
    discountAmount: Number(discountAmount.toFixed(2)),
    taxableValue: Number(taxableValue.toFixed(2)),
    cgstAmount: Number(cgstAmount.toFixed(2)),
    sgstAmount: Number(sgstAmount.toFixed(2)),
    igstAmount: Number(igstAmount.toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2)),
  };
}

/**
 * Calculates invoice totals, handling mixed GST rates, overall discounts, and optional Cess.
 */
export function calculateInvoiceTotals(
  lineItems: TaxLineItemInput[],
  overallDiscount: number | string = 0,
  overallDiscountType: 'PERCENTAGE' | 'AMOUNT' = 'PERCENTAGE',
  isInterState: boolean,
  cessRate: number | string = 0
): TaxTotals {
  const numericOverallDiscount = Number(overallDiscount) || 0;
  const numericCessRate = Number(cessRate) || 0;

  let subTotal = 0;
  let lineItemsDiscountTotal = 0;
  let lineItemsTaxableTotal = 0;

  // First pass: Calculate item level subtotals and initial taxable values
  const itemCalculations = lineItems.map((item) => {
    const calc = calculateLineItemTotal(item, isInterState);
    subTotal += calc.amount;
    lineItemsDiscountTotal += calc.discountAmount;
    lineItemsTaxableTotal += calc.taxableValue;
    return {
      ...item,
      taxableValue: calc.taxableValue,
    };
  });

  // Calculate overall discount amount
  let overallDiscountAmount = 0;
  if (overallDiscountType === 'PERCENTAGE') {
    overallDiscountAmount = lineItemsTaxableTotal * (numericOverallDiscount / 100);
  } else {
    overallDiscountAmount = Math.min(numericOverallDiscount, lineItemsTaxableTotal);
  }
  overallDiscountAmount = Number(overallDiscountAmount.toFixed(2));

  // Second pass: Allocate overall discount proportionally and calculate final taxes per item
  let finalTaxableTotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  itemCalculations.forEach((item) => {
    // Proportion of overall discount for this item
    const share = lineItemsTaxableTotal > 0 ? item.taxableValue / lineItemsTaxableTotal : 0;
    const allocatedOverallDiscount = overallDiscountAmount * share;
    const finalTaxable = Math.max(0, item.taxableValue - allocatedOverallDiscount);
    
    finalTaxableTotal += finalTaxable;

    const gstRate = Number(item.gstRate) || 0;
    const taxRate = gstRate / 100;

    if (isInterState) {
      igstTotal += finalTaxable * taxRate;
    } else {
      cgstTotal += finalTaxable * (taxRate / 2);
      sgstTotal += finalTaxable * (taxRate / 2);
    }
  });

  const cessTotal = finalTaxableTotal * (numericCessRate / 100);
  
  const rawGrandTotal = finalTaxableTotal + cgstTotal + sgstTotal + igstTotal + cessTotal;
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = Number((grandTotal - rawGrandTotal).toFixed(2));

  return {
    subTotal: Number(subTotal.toFixed(2)),
    discountTotal: Number((lineItemsDiscountTotal + overallDiscountAmount).toFixed(2)),
    taxableAmount: Number(finalTaxableTotal.toFixed(2)),
    cgstTotal: Number(cgstTotal.toFixed(2)),
    sgstTotal: Number(sgstTotal.toFixed(2)),
    igstTotal: Number(igstTotal.toFixed(2)),
    cessTotal: Number(cessTotal.toFixed(2)),
    roundOff,
    grandTotal,
  };
}
