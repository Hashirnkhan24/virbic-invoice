import { generateInvoicePDF, InvoicePDFData } from './pdf-generator';

export async function generateReceiptPDF(invoice: any): Promise<Buffer> {
  // Map Decimal fields and relation properties to standard numbers / structures for PDF generator
  const pdfData: InvoicePDFData = {
    invoiceNumber: invoice.invoiceNumber,
    template: invoice.template,
    currency: invoice.currency,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    placeOfSupply: invoice.placeOfSupply,
    isInterState: invoice.isInterState,
    reverseCharge: invoice.reverseCharge,
    notes: invoice.notes,
    terms: invoice.terms,
    customFields: invoice.customFields as any,
    
    business: {
      name: invoice.business.name,
      gstin: invoice.business.gstin,
      pan: invoice.business.pan,
      address: invoice.business.address,
      city: invoice.business.city,
      state: invoice.business.state,
      pincode: invoice.business.pincode,
      phone: invoice.business.phone,
      email: invoice.business.email,
      bankName: invoice.business.bankName,
      accountNumber: invoice.business.accountNumber,
      ifscCode: invoice.business.ifscCode,
      upiId: invoice.business.upiId,
      logo: invoice.business.logo,
      signature: invoice.business.signature,
      brandColor: invoice.business.brandColor,
    },
    
    client: {
      name: invoice.client.name,
      gstin: invoice.client.gstin,
      email: invoice.client.email,
      phone: invoice.client.phone,
      billingAddress: invoice.client.billingAddress,
      billingCity: invoice.client.billingCity,
      billingState: invoice.client.billingState,
      billingPincode: invoice.client.billingPincode,
    },
    
    lineItems: invoice.lineItems.map((item: any) => ({
      description: item.description,
      hsnCode: item.hsnCode,
      quantity: Number(item.quantity),
      unit: item.unit,
      rate: Number(item.rate),
      discount: Number(item.discount),
      discountType: item.discountType as 'PERCENTAGE' | 'AMOUNT',
      gstRate: Number(item.gstRate),
      cgstAmount: Number(item.cgstAmount),
      sgstAmount: Number(item.sgstAmount),
      igstAmount: Number(item.igstAmount),
      taxableValue: Number(item.taxableValue),
      totalAmount: Number(item.totalAmount),
    })),
    
    totals: {
      subTotal: Number(invoice.subTotal),
      discountTotal: Number(invoice.discountTotal),
      taxableAmount: Number(invoice.taxableAmount),
      cgstTotal: Number(invoice.cgstTotal),
      sgstTotal: Number(invoice.sgstTotal),
      igstTotal: Number(invoice.igstTotal),
      cessTotal: Number(invoice.cessTotal),
      roundOff: Number(invoice.roundOff),
      grandTotal: Number(invoice.grandTotal),
    },
  };

  return await generateInvoicePDF(pdfData, { asReceipt: true });
}
