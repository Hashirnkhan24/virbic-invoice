import { prisma } from '../prisma';
import { InvoiceStatus, Prisma } from '@prisma/client';

// ==========================================
// BUSINESS CRUD OPERATIONS
// ==========================================

export async function createBusiness(data: Omit<Prisma.BusinessUncheckedCreateInput, 'id'>) {
  return prisma.business.create({
    data,
  });
}

export async function getBusinessesByUser(userId: string) {
  return prisma.business.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateBusiness(id: string, data: Prisma.BusinessUpdateInput) {
  return prisma.business.update({
    where: { id },
    data,
  });
}

export async function deleteBusiness(id: string) {
  return prisma.business.delete({
    where: { id },
  });
}

// ==========================================
// CLIENT CRUD OPERATIONS
// ==========================================

export async function createClient(data: Omit<Prisma.ClientUncheckedCreateInput, 'id'>) {
  return prisma.client.create({
    data,
  });
}

export async function getClientsByUser(userId: string) {
  return prisma.client.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  });
}

export async function updateClient(id: string, data: Prisma.ClientUpdateInput) {
  return prisma.client.update({
    where: { id },
    data,
  });
}

export async function deleteClient(id: string) {
  return prisma.client.delete({
    where: { id },
  });
}

// ==========================================
// ITEM CATALOG CRUD OPERATIONS
// ==========================================

export async function createItem(data: Omit<Prisma.ItemUncheckedCreateInput, 'id'>) {
  return prisma.item.create({
    data,
  });
}

export async function getItemsByUser(userId: string) {
  return prisma.item.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  });
}

export async function updateItem(id: string, data: Prisma.ItemUpdateInput) {
  return prisma.item.update({
    where: { id },
    data,
  });
}

export async function deleteItem(id: string) {
  return prisma.item.delete({
    where: { id },
  });
}

// ==========================================
// INVOICE OPERATIONS & TRANSACTIONS
// ==========================================

export interface CreateInvoiceInput {
  invoiceNumber: string;
  userId: string;
  businessId: string;
  clientId: string;
  template?: string;
  currency?: string;
  exchangeRate?: number | Prisma.Decimal;
  issueDate?: Date;
  dueDate: Date;
  placeOfSupply: string;
  isInterState?: boolean;
  reverseCharge?: boolean;
  subTotal: number | Prisma.Decimal;
  discountTotal?: number | Prisma.Decimal;
  taxableAmount: number | Prisma.Decimal;
  cgstTotal?: number | Prisma.Decimal;
  sgstTotal?: number | Prisma.Decimal;
  igstTotal?: number | Prisma.Decimal;
  cessTotal?: number | Prisma.Decimal;
  roundOff?: number | Prisma.Decimal;
  grandTotal: number | Prisma.Decimal;
  notes?: string;
  terms?: string;
  customFields?: any;
  status?: InvoiceStatus;
  lineItems: {
    itemId?: string;
    description: string;
    hsnCode?: string;
    quantity: number | Prisma.Decimal;
    unit?: string;
    rate: number | Prisma.Decimal;
    discount?: number | Prisma.Decimal;
    discountType?: string;
    gstRate?: number | Prisma.Decimal;
    cgstAmount?: number | Prisma.Decimal;
    sgstAmount?: number | Prisma.Decimal;
    igstAmount?: number | Prisma.Decimal;
    taxableValue: number | Prisma.Decimal;
    totalAmount: number | Prisma.Decimal;
  }[];
}

export async function createInvoice(data: CreateInvoiceInput) {
  const { lineItems, ...invoiceData } = data;

  return prisma.$transaction(async (tx) => {
    // 1. Create the main invoice
    const invoice = await tx.invoice.create({
      data: {
        ...invoiceData,
        lineItems: {
          create: lineItems,
        },
      },
      include: {
        lineItems: true,
      },
    });

    // 2. Increment the business's next invoice number counter
    await tx.business.update({
      where: { id: invoice.businessId },
      data: {
        invoiceNumber: {
          increment: 1,
        },
      },
    });

    return invoice;
  });
}

export async function getInvoicesByUser(
  userId: string,
  filters?: {
    status?: InvoiceStatus;
    clientId?: string;
    businessId?: string;
    startDate?: Date;
    endDate?: Date;
  }
) {
  const whereClause: Prisma.InvoiceWhereInput = { userId };

  if (filters) {
    if (filters.status) {
      whereClause.status = filters.status;
    }
    if (filters.clientId) {
      whereClause.clientId = filters.clientId;
    }
    if (filters.businessId) {
      whereClause.businessId = filters.businessId;
    }
    if (filters.startDate || filters.endDate) {
      whereClause.issueDate = {};
      if (filters.startDate) {
        whereClause.issueDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        whereClause.issueDate.lte = filters.endDate;
      }
    }
  }

  return prisma.invoice.findMany({
    where: whereClause,
    include: {
      client: {
        select: { name: true, email: true },
      },
      business: {
        select: { name: true },
      },
    },
    orderBy: { issueDate: 'desc' },
  });
}

export async function getInvoiceById(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      lineItems: true,
      business: true,
      client: true,
    },
  });
}

export async function updateInvoice(id: string, data: Partial<CreateInvoiceInput>) {
  const { lineItems, ...invoiceData } = data;

  return prisma.$transaction(async (tx) => {
    // 1. If line items are provided, delete the old ones and create new ones
    if (lineItems) {
      await tx.invoiceLineItem.deleteMany({
        where: { invoiceId: id },
      });
    }

    // 2. Update the main invoice and create new line items if provided
    return tx.invoice.update({
      where: { id },
      data: {
        ...invoiceData,
        ...(lineItems && {
          lineItems: {
            create: lineItems,
          },
        }),
      },
      include: {
        lineItems: true,
      },
    });
  });
}

export async function deleteInvoice(id: string) {
  // Line items will be deleted automatically due to Cascade onDelete in Schema
  return prisma.invoice.delete({
    where: { id },
  });
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus) {
  return prisma.invoice.update({
    where: { id },
    data: {
      status,
      ...(status === 'PAID' && { paidAt: new Date() }),
    },
  });
}

// ==========================================
// REPORTING & DASHBOARD AGGREGATIONS
// ==========================================

export async function getDashboardStats(userId: string) {
  const invoices = await prisma.invoice.findMany({
    where: { userId },
    select: {
      status: true,
      grandTotal: true,
      amountPaid: true,
    },
  });

  let totalRevenue = 0;
  let unpaidAmount = 0;
  let overdueAmount = 0;
  let draftCount = 0;

  invoices.forEach((inv) => {
    const total = Number(inv.grandTotal) || 0;
    const paid = Number(inv.amountPaid) || 0;

    if (inv.status === 'PAID') {
      totalRevenue += total;
    } else if (inv.status === 'SENT' || inv.status === 'PARTIAL') {
      unpaidAmount += total - paid;
    } else if (inv.status === 'OVERDUE') {
      overdueAmount += total - paid;
      unpaidAmount += total - paid;
    } else if (inv.status === 'DRAFT') {
      draftCount++;
    }
  });

  const clientsCount = await prisma.client.count({
    where: { userId },
  });

  const recentInvoices = await prisma.invoice.findMany({
    where: { userId },
    take: 5,
    orderBy: { issueDate: 'desc' },
    include: {
      client: {
        select: { name: true },
      },
    },
  });

  return {
    totalRevenue,
    unpaidAmount,
    overdueAmount,
    draftCount,
    totalInvoices: invoices.length,
    clientsCount,
    recentInvoices,
  };
}

export async function getMonthlyRevenue(userId: string) {
  // Query all non-draft, non-cancelled invoices
  const invoices = await prisma.invoice.findMany({
    where: {
      userId,
      status: {
        in: ['PAID', 'SENT', 'PARTIAL', 'OVERDUE'],
      },
    },
    select: {
      issueDate: true,
      grandTotal: true,
      status: true,
      amountPaid: true,
    },
  });

  const monthlyData: Record<string, { total: number; paid: number }> = {};

  invoices.forEach((inv) => {
    const date = new Date(inv.issueDate);
    // Format key as "YYYY-MM" (e.g. "2026-06")
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    const totalVal = Number(inv.grandTotal) || 0;
    const paidVal = Number(inv.amountPaid) || 0;

    if (!monthlyData[key]) {
      monthlyData[key] = { total: 0, paid: 0 };
    }

    monthlyData[key].total += totalVal;
    monthlyData[key].paid += inv.status === 'PAID' ? totalVal : paidVal;
  });

  // Convert to sorted array of objects [{ month: '2026-06', revenue: 15000, collected: 12000 }]
  return Object.entries(monthlyData)
    .map(([month, data]) => ({
      month,
      revenue: Number(data.total.toFixed(2)),
      collected: Number(data.paid.toFixed(2)),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export async function getGstSummary(userId: string) {
  // Fetch non-draft, non-cancelled invoices and their line items
  const invoices = await prisma.invoice.findMany({
    where: {
      userId,
      status: {
        notIn: ['DRAFT', 'CANCELLED'],
      },
    },
    include: {
      lineItems: true,
      client: {
        select: { gstin: true, name: true },
      },
    },
  });

  const hsnSummary: Record<
    string,
    {
      hsnCode: string;
      taxableValue: number;
      cgstAmount: number;
      sgstAmount: number;
      igstAmount: number;
      totalAmount: number;
    }
  > = {};

  invoices.forEach((inv) => {
    inv.lineItems.forEach((item) => {
      const hsn = item.hsnCode || 'N/A';
      const taxable = Number(item.taxableValue) || 0;
      const cgst = Number(item.cgstAmount) || 0;
      const sgst = Number(item.sgstAmount) || 0;
      const igst = Number(item.igstAmount) || 0;
      const total = Number(item.totalAmount) || 0;

      if (!hsnSummary[hsn]) {
        hsnSummary[hsn] = {
          hsnCode: hsn,
          taxableValue: 0,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
          totalAmount: 0,
        };
      }

      hsnSummary[hsn].taxableValue += taxable;
      hsnSummary[hsn].cgstAmount += cgst;
      hsnSummary[hsn].sgstAmount += sgst;
      hsnSummary[hsn].igstAmount += igst;
      hsnSummary[hsn].totalAmount += total;
    });
  });

  return Object.values(hsnSummary).map((s) => ({
    hsnCode: s.hsnCode,
    taxableValue: Number(s.taxableValue.toFixed(2)),
    cgstAmount: Number(s.cgstAmount.toFixed(2)),
    sgstAmount: Number(s.sgstAmount.toFixed(2)),
    igstAmount: Number(s.igstAmount.toFixed(2)),
    totalAmount: Number(s.totalAmount.toFixed(2)),
  }));
}
