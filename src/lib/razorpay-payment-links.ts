import { razorpay } from './razorpay';

interface InvoiceForPaymentLink {
  id: string;
  invoiceNumber: string;
  currency: string;
  grandTotal: any; // Decimal or number
  amountPaid: any;  // Decimal or number
  publicShareId: string | null;
  client: {
    name: string;
    email: string | null;
    phone: string | null;
  };
}

export async function createInvoicePaymentLink(invoice: InvoiceForPaymentLink) {
  if (invoice.currency.toUpperCase() !== 'INR') {
    throw new Error('Razorpay only supports payments in INR (Indian Rupees).');
  }

  const grandTotal = Number(invoice.grandTotal);
  const amountPaid = Number(invoice.amountPaid);
  const balanceDue = grandTotal - amountPaid;
  const amountInPaise = Math.round(balanceDue * 100);

  if (amountInPaise < 100) {
    throw new Error('Payment amount must be at least ₹1.00');
  }

  const customer: any = {
    name: invoice.client.name || 'Client',
  };

  if (invoice.client.email && invoice.client.email.trim()) {
    customer.email = invoice.client.email.trim();
  }

  if (invoice.client.phone && invoice.client.phone.trim()) {
    const cleanedPhone = invoice.client.phone.replace(/[^0-9+]/g, '');
    if (cleanedPhone) {
      customer.contact = cleanedPhone;
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const shareId = invoice.publicShareId || invoice.id;
  const callbackUrl = `${appUrl}/i/${shareId}?payment=success`;

  try {
    const response = await razorpay.paymentLink.create({
      amount: amountInPaise,
      currency: 'INR',
      accept_partial: false,
      description: `Payment for Invoice #${invoice.invoiceNumber}`,
      customer,
      notify: {
        sms: false,
        email: false,
      },
      reminder_enable: false,
      notes: {
        invoiceId: invoice.id,
      },
      callback_url: callbackUrl,
      callback_method: 'get',
    });

    return {
      id: response.id,
      short_url: response.short_url,
      status: response.status,
    };
  } catch (error: any) {
    console.error('[RAZORPAY LINK ERROR] Failed to create payment link:', error);
    throw new Error(error.message || 'Razorpay Link Creation Failed');
  }
}

export async function cancelPaymentLink(linkId: string) {
  try {
    const response = await razorpay.paymentLink.cancel(linkId);
    return response;
  } catch (error: any) {
    console.error('[RAZORPAY LINK ERROR] Failed to cancel payment link:', error);
    throw new Error(error.message || 'Razorpay Link Cancellation Failed');
  }
}

export async function fetchPaymentLink(linkId: string) {
  try {
    const response = await razorpay.paymentLink.fetch(linkId);
    return response;
  } catch (error: any) {
    console.error('[RAZORPAY LINK ERROR] Failed to fetch payment link:', error);
    throw new Error(error.message || 'Razorpay Link Retrieval Failed');
  }
}
