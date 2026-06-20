export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  locale: string;
  flag: string;
}

export const currencies: CurrencyInfo[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN', flag: '🇮🇳' },
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'en-DE', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB', flag: '🇬🇧' },
];

export function formatCurrency(amount: number | string, currencyCode = 'INR'): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
  const currency = currencies.find((c) => c.code === currencyCode) || currencies[0];
  
  if (currency.code === 'INR') {
    try {
      return new Intl.NumberFormat(currency.locale, {
        style: 'currency',
        currency: currency.code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(numericAmount);
    } catch {
      return `₹ ${numericAmount.toFixed(2)}`;
    }
  } else {
    try {
      const decimalFormatter = new Intl.NumberFormat(currency.locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const formattedNum = decimalFormatter.format(numericAmount);
      // Amounts always show both symbol and code for non-INR (e.g., "$ 1,500.00 USD")
      return `${currency.symbol} ${formattedNum} ${currency.code}`;
    } catch {
      return `${currency.symbol} ${numericAmount.toFixed(2)} ${currency.code}`;
    }
  }
}

const ratesToINR: Record<string, number> = {
  INR: 1.0,
  USD: 83.5,
  EUR: 90.0,
  GBP: 106.0,
};

export function convertCurrency(amount: number, from: string, to: string): number {
  if (from === to) return amount;
  // Convert from source to INR
  const amountInINR = amount * (ratesToINR[from] || 1.0);
  // Convert from INR to target
  const targetRate = ratesToINR[to] || 1.0;
  return amountInINR / targetRate;
}
