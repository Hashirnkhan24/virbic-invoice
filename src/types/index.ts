export interface User {
  id: string;
  clerkId: string;
  email: string;
  name?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Business {
  id: string;
  userId: string;
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
  brandColor: string;
  invoicePrefix: string;
  invoiceNumber: number;
  financialYear: string;
  isDefault: boolean;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Client {
  id: string;
  userId: string;
  businessId?: string;
  name: string;
  gstin?: string;
  email?: string;
  phone?: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingPincode?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPincode?: string;
  notes?: string;
  totalBilled?: number;
  totalOutstanding?: number;
  invoiceCount?: number;
  lastInvoiceDate?: Date | string | null;
  isDeleted?: boolean;
  deletedAt?: Date | string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Item {
  id: string;
  userId: string;
  businessId?: string;
  name: string;
  description?: string;
  hsnCode?: string;
  rate: number;
  gstRate: number;
  unit: string;
  isService: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'PARTIAL';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  userId: string;
  businessId: string;
  clientId: string;
  template: string;
  currency: string;
  exchangeRate: number;
  issueDate: Date;
  dueDate: Date;
  placeOfSupply: string;
  isInterState: boolean;
  reverseCharge: boolean;
  subTotal: number;
  discountTotal: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  cessTotal: number;
  roundOff: number;
  grandTotal: number;
  notes?: string;
  terms?: string;
  customFields?: Record<string, string>[];
  status: InvoiceStatus;
  pdfUrl?: string;
  publicShareId?: string;
  sharePassword?: string;
  viewCount: number;
  amountPaid: number;
  paidAt?: Date;
  paymentNotes?: string;
  isRecurring: boolean;
  recurringFrequency?: string;
  recurringEndDate?: Date;
  parentInvoiceId?: string;
  lastReminderAt?: Date;
  reminderCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  itemId?: string;
  description: string;
  hsnCode?: string;
  quantity: number;
  unit: string;
  rate: number;
  discount: number;
  discountType: 'PERCENTAGE' | 'AMOUNT';
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  taxableValue: number;
  totalAmount: number;
}
