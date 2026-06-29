import { prisma } from './prisma';
import { CONFIRMATION_TEMPLATES } from './confirmation-templates';
import { sendReceiptEmail } from './email-service';
import { generateReceiptPDF } from './receipt-generator';

interface PaymentConfirmationOptions {
  invoiceId: string;
  paymentId: string;
  channel?: 'whatsapp' | 'email' | 'both';
  includePdf?: boolean;
}

export async function sendPaymentConfirmation(options: PaymentConfirmationOptions) {
  const { invoiceId, paymentId, channel, includePdf } = options;

  // 1. Fetch invoice, payment, client, business, user, userPreferences
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      client: true,
      business: true,
      user: {
        include: {
          preferences: true,
        },
      },
      lineItems: true,
    },
  });

  if (!invoice) {
    throw new Error(`Invoice with ID ${invoiceId} not found`);
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new Error(`Payment with ID ${paymentId} not found`);
  }

  const preferences = invoice.user.preferences;
  const activeChannel = channel || preferences?.confirmationChannel || 'both';
  const shouldSendEmail = activeChannel === 'email' || activeChannel === 'both';
  const shouldSendWhatsapp = activeChannel === 'whatsapp' || activeChannel === 'both';
  const shouldIncludePdf = includePdf !== undefined ? includePdf : (preferences?.includeReceiptPdf ?? true);

  const clientName = invoice.client.name;
  const amountPaid = `${invoice.currency} ${Number(payment.amount).toFixed(2)}`;
  const invoiceNumber = invoice.invoiceNumber;
  const invoiceTotal = `${invoice.currency} ${Number(invoice.grandTotal).toFixed(2)}`;
  
  // Calculate remaining balance: grandTotal - totalAmountPaid (where status is CONFIRMED)
  const allPayments = await prisma.payment.findMany({
    where: {
      invoiceId,
      status: 'CONFIRMED',
    },
  });
  
  const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remainingBalance = Math.max(0, Number(invoice.grandTotal) - totalPaid);
  const amountDue = `${invoice.currency} ${remainingBalance.toFixed(2)}`;
  
  const businessName = invoice.business.name;
  const paymentDate = new Date(payment.paidAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  
  const paymentMethod = payment.method;
  const receiptNumber = `RCT-${invoiceNumber}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const receiptLink = `${appUrl}/i/${invoice.publicShareId}?receipt=1`;

  const templateData = {
    clientName,
    amountPaid,
    invoiceNumber,
    invoiceTotal,
    amountDue,
    businessName,
    paymentDate,
    paymentMethod,
    receiptNumber,
    receiptLink,
  };

  const isFullyPaid = remainingBalance <= 0;
  const isPartiallyPaid = remainingBalance > 0;
  const flags = {
    isFullyPaid,
    isPartiallyPaid,
    hasReceiptLink: !!invoice.publicShareId,
  };

  // Compile template for WhatsApp message
  const waTemplate = isFullyPaid 
    ? CONFIRMATION_TEMPLATES.whatsapp.full 
    : CONFIRMATION_TEMPLATES.whatsapp.partial;
    
  const whatsappMessage = compileTemplate(waTemplate, templateData, flags);
  
  // Construct pre-filled WhatsApp deep link
  const rawPhone = invoice.client.phone || '';
  const cleanPhone = rawPhone.replace(/\D/g, '');
  let waPhone = cleanPhone;
  if (waPhone && waPhone.length === 10) {
    waPhone = `91${waPhone}`; // default to Indian country code if 10 digits
  }
  
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(whatsappMessage)}`;

  let emailResult = null;

  // Send Email if enabled
  if (shouldSendEmail && invoice.client.email) {
    try {
      const emailSubject = compileTemplate(CONFIRMATION_TEMPLATES.email.subject, templateData, flags);
      const emailHtml = compileTemplate(CONFIRMATION_TEMPLATES.email.html, templateData, flags);
      
      const attachments = [];
      if (shouldIncludePdf) {
        const pdfBuffer = await generateReceiptPDF(invoice);
        attachments.push({
          filename: `Receipt_${invoiceNumber}.pdf`,
          content: pdfBuffer,
        });
      }

      const fromName = `${businessName} via Virbic`;
      const replyToEmail = invoice.business.email || invoice.user.email;

      emailResult = await sendReceiptEmail({
        to: invoice.client.email,
        subject: emailSubject,
        htmlBody: emailHtml,
        fromName,
        replyToEmail,
        attachments,
      });
    } catch (err: any) {
      console.error('[CONFIRMATION SERVICE] Email dispatch failed:', err.message);
    }
  }

  // Send WhatsApp if enabled and client has phone
  if (shouldSendWhatsapp && invoice.client.phone) {
    try {
      const { sendWhatsAppMessage } = await import('./whatsapp/outbound');
      
      // Try to find conversation
      let conversation = await prisma.whatsAppConversation.findFirst({
        where: {
          userId: invoice.userId,
          clientId: invoice.clientId
        }
      });
      
      if (!conversation) {
        conversation = await prisma.whatsAppConversation.create({
          data: {
            userId: invoice.userId,
            clientId: invoice.clientId,
            clientPhone: invoice.client.phone,
            status: 'ACTIVE',
            optInStatus: 'CONFIRMED'
          }
        });
      }
      
      await sendWhatsAppMessage({
        to: invoice.client.phone,
        body: whatsappMessage,
        conversationId: conversation.id,
        userId: invoice.userId,
        template: {
          name: 'payment_confirmation',
          variables: [
            clientName,
            Number(payment.amount).toFixed(2),
            invoiceNumber,
            receiptLink,
            businessName
          ],
          buttonVariables: [invoice.id]
        }
      });
      console.log(`[CONFIRMATION SERVICE] Payment receipt sent via WhatsApp to client ${invoice.client.name}`);
    } catch (waErr: any) {
      console.error('[CONFIRMATION SERVICE] WhatsApp dispatch failed:', waErr.message);
    }
  }


  return {
    whatsappUrl,
    whatsappMessage,
    emailSent: !!emailResult?.success,
    messageId: emailResult?.messageId || null,
  };
}

function compileTemplate(
  html: string,
  data: any,
  flags: { isFullyPaid: boolean; isPartiallyPaid: boolean; hasReceiptLink: boolean }
) {
  let compiled = html;
  
  // Replace standard placeholders
  for (const [key, value] of Object.entries(data)) {
    const valStr = typeof value === 'string' ? value : String(value || '');
    compiled = compiled.replace(new RegExp(`{{${key}}}`, 'g'), valStr);
  }

  // Handle conditionals
  if (flags.isFullyPaid) {
    compiled = compiled.replace(/{{#ifIsFullyPaid}}([\s\S]*?){{\/ifIsFullyPaid}}/g, '$1');
  } else {
    compiled = compiled.replace(/{{#ifIsFullyPaid}}([\s\S]*?){{\/ifIsFullyPaid}}/g, '');
  }

  if (flags.isPartiallyPaid) {
    compiled = compiled.replace(/{{#ifIsPartiallyPaid}}([\s\S]*?){{\/ifIsPartiallyPaid}}/g, '$1');
  } else {
    compiled = compiled.replace(/{{#ifIsPartiallyPaid}}([\s\S]*?){{\/ifIsPartiallyPaid}}/g, '');
  }

  if (flags.hasReceiptLink) {
    compiled = compiled.replace(/{{#ifReceiptLink}}([\s\S]*?){{\/ifReceiptLink}}/g, '$1');
  } else {
    compiled = compiled.replace(/{{#ifReceiptLink}}([\s\S]*?){{\/ifReceiptLink}}/g, '');
  }

  return compiled;
}
