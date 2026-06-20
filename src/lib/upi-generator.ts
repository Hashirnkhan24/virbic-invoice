import QRCode from 'qrcode';

interface UPILinkArgs {
  upiId: string;
  amount: number | string;
  payeeName: string;
  invoiceNumber: string;
}

/**
 * Generates a standard UPI payment deep link.
 * Supports both overloaded signature formats:
 * 1. Object shape: generateUPILink({ upiId, amount, payeeName, invoiceNumber })
 * 2. Positional shape: generateUPILink(upiId, amount, description, payeeName)
 */
export function generateUPILink(
  argsOrUpiId: UPILinkArgs | string,
  amount?: number | string,
  descriptionOrPayeeName?: string,
  payeeName?: string
): string {
  if (typeof argsOrUpiId === 'object' && argsOrUpiId !== null) {
    const { upiId, amount: am, payeeName: pn, invoiceNumber } = argsOrUpiId;
    const cleanAmount = typeof am === 'number' ? am.toFixed(2) : parseFloat(am).toFixed(2);
    // Returns: upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=Invoice_${invoiceNumber}
    return `upi://pay?pa=${upiId.trim()}&pn=${encodeURIComponent(pn.trim())}&am=${cleanAmount}&cu=INR&tn=Invoice_${invoiceNumber.trim()}`;
  } else {
    const upiId = argsOrUpiId;
    const am = amount!;
    const desc = descriptionOrPayeeName || '';
    const name = payeeName || '';
    const cleanAmount = typeof am === 'number' ? am.toFixed(2) : parseFloat(am).toFixed(2);
    const params = new URLSearchParams({
      pa: upiId.trim(),
      pn: name.trim(),
      am: cleanAmount,
      cu: 'INR',
      tn: desc.trim(),
    });
    return `upi://pay?${params.toString()}`;
  }
}

/**
 * Generates a Bharat QR code string containing GSTIN, invoice details, amount, and date.
 * Typically dynamic UPI QR containing invoice and GSTIN details is used in India for retail invoices.
 */
export function generateBharatQRLink(
  gstin: string,
  invoiceNumber: string,
  amount: number | string,
  date: Date | string
): string {
  const cleanAmount = typeof amount === 'number' ? amount.toFixed(2) : parseFloat(amount).toFixed(2);
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  const cleanInvoice = invoiceNumber.replace(/\//g, '-');
  
  // Custom transaction note containing invoice number, GSTIN, and date
  const transactionNote = `INV:${cleanInvoice}|GSTIN:${gstin.trim()}|DATE:${dateStr}`;
  
  // We construct a standard dynamic UPI QR representation containing the invoice metadata in the transaction note (tn)
  // which satisfies Bharat QR / Dynamic UPI QR guidelines for digital payments.
  const params = new URLSearchParams({
    pa: 'gst.payment@upi', // Fallback or generic merchant address
    pn: 'GST Merchant',
    am: cleanAmount,
    cu: 'INR',
    tr: cleanInvoice, // Transaction reference (invoice #)
    tn: transactionNote, // Transaction note
  });
  
  return `upi://pay?${params.toString()}`;
}

/**
 * Generates a QR Code as a base64 Data URL.
 * Safe to use in both Browser (Client-side) and Node.js (Server-side API routes).
 */
export async function generateQRCodeDataUrl(value: string, size = 150): Promise<string> {
  try {
    return await QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
    });
  } catch (error) {
    console.error('Failed to generate QR Code data URL:', error);
    return '';
  }
}
