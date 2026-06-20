import { useState } from 'react';
import { Invoice, InvoiceLineItem } from '@/types';

export function useInvoice(initialInvoice?: Invoice) {
  const [invoice, setInvoice] = useState<Invoice | undefined>(initialInvoice);

  const updateInvoice = (updated: Partial<Invoice>) => {
    setInvoice((prev) => (prev ? { ...prev, ...updated } : undefined));
  };

  const addLineItem = (item: Omit<InvoiceLineItem, 'id' | 'invoiceId'>) => {
    // line items logic placeholder
  };

  return {
    invoice,
    setInvoice,
    updateInvoice,
    addLineItem,
  };
}
