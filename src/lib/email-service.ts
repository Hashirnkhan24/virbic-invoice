import { prisma } from '@/lib/prisma';
import { generateInvoicePDF } from '@/lib/pdf-generator';
import nodemailer from 'nodemailer';

/**
 * Real/Mock Email Service for Virbic Invoice
 * Supports Resend API (via RESEND_API_KEY) and standard SMTP (via Nodemailer)
 */
export async function sendInvoiceEmail(
  invoiceId: string,
  to: string,
  subject: string,
  message: string
): Promise<{ success: boolean; messageId: string }> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  const systemFromEmail = process.env.SMTP_FROM_EMAIL || 'onboarding@resend.dev';
  const systemFromName = process.env.SMTP_FROM_NAME || 'Virbic Invoicing';

  const fromEmail = systemFromEmail;
  let fromName = systemFromName;
  let replyToEmail = systemFromEmail;
  let businessName = '';
  let businessEmail = '';
  let businessPhone = '';

  const attachments: Array<{ filename: string; content: Buffer }> = [];

  // 1. Fetch complete invoice and generate PDF
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        business: true,
        client: true,
        lineItems: true,
        user: true,
      },
    });

    if (invoice) {
      businessName = invoice.business.name;
      businessEmail = invoice.business.email || invoice.user.email;
      businessPhone = invoice.business.phone || '';
      
      // Dynamic From header display name and Reply-To email
      fromName = `${businessName} via Virbic`;
      replyToEmail = businessEmail;

      const pdfData = {
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
          brandColor: invoice.business.brandColor || undefined,
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
        
        lineItems: invoice.lineItems.map((item) => ({
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

      const pdfBuffer = await generateInvoicePDF(pdfData);
      const cleanInvoiceNum = invoice.invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
      
      attachments.push({
        filename: `Invoice_${cleanInvoiceNum}.pdf`,
        content: Buffer.from(pdfBuffer),
      });
    }
  } catch (pdfError) {
    console.error('[EMAIL SERVICE] Failed to generate/attach PDF:', pdfError);
  }

  // Beautiful HTML wrap for email body
  let htmlBody = message;
  if (businessName) {
    const contactInfo = [
      businessEmail ? `Email: <a href="mailto:${businessEmail}" style="color: #2563eb; text-decoration: none;">${businessEmail}</a>` : '',
      businessPhone ? `Phone: ${businessPhone}` : '',
    ].filter(Boolean).join(' | ');

    htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
        <div style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #0f172a;">${businessName}</h2>
        </div>
        <div style="font-size: 15px; color: #334155; white-space: pre-wrap;">
          ${message}
        </div>
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
          <p style="margin: 0 0 8px 0;">This email was sent by <strong>${businessName}</strong> via Virbic Invoice.</p>
          ${contactInfo ? `<p style="margin: 0;">${contactInfo}</p>` : ''}
        </div>
      </div>
    `;
  }

  // 2. Deliver email via Resend API if API Key is configured
  if (resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: [to],
          subject: subject,
          html: htmlBody,
          reply_to: replyToEmail,
          attachments: attachments.map((att) => ({
            filename: att.filename,
            content: Buffer.from(att.content).toString('base64'),
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to send email via Resend API');
      }

      console.log(`[EMAIL SERVICE] Email sent via Resend API. MsgID: ${data.id}`);
      return {
        success: true,
        messageId: data.id,
      };
    } catch (resendError: any) {
      console.error('[EMAIL SERVICE] Resend API error, trying SMTP backup:', resendError.message);
      // Fall through to SMTP if SMTP is also configured
    }
  }

  // 3. Deliver email via SMTP if Host is configured
  if (smtpHost && smtpUser && smtpPass) {
    try {
      const secure = process.env.SMTP_SECURE === 'true' || smtpPort === '465';
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort || '587', 10),
        secure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html: htmlBody,
        replyTo: replyToEmail,
        attachments: attachments.map((att) => ({
          filename: att.filename,
          content: Buffer.from(att.content),
        })),
      });

      console.log(`[EMAIL SERVICE] Email sent via SMTP. MsgID: ${info.messageId}`);
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (smtpError: any) {
      console.error('[EMAIL SERVICE] SMTP delivery failed:', smtpError.message);
      throw new Error(`Email sending failed: ${smtpError.message}`);
    }
  }

  // 4. Fallback to mock log if neither is configured
  console.log('=== EMAIL SERVICE MOCK (NOT CONFIGURED) ===');
  console.log(`To: ${to}`);
  console.log(`From: "${fromName}" <${fromEmail}>`);
  console.log(`Reply-To: ${replyToEmail}`);
  console.log(`Subject: ${subject}`);
  console.log(`Invoice ID: ${invoiceId}`);
  console.log(`HTML Message:\n${htmlBody}`);
  if (attachments.length > 0) {
    console.log(`Attachment: ${attachments[0].filename} (${attachments[0].content.length} bytes)`);
  }
  console.log('==========================================');

  await new Promise((resolve) => setTimeout(resolve, 800));

  return {
    success: true,
    messageId: `mock-msg-${Math.random().toString(36).substring(2, 11)}`,
  };
}

export async function sendReceiptEmail(options: {
  to: string;
  subject: string;
  htmlBody: string;
  fromName: string;
  replyToEmail: string;
  attachments?: Array<{ filename: string; content: Buffer }>;
}): Promise<{ success: boolean; messageId: string }> {
  const { to, subject, htmlBody, fromName, replyToEmail, attachments = [] } = options;
  const resendApiKey = process.env.RESEND_API_KEY;
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  const systemFromEmail = process.env.SMTP_FROM_EMAIL || 'onboarding@resend.dev';
  const fromEmail = systemFromEmail;

  // Deliver via Resend
  if (resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: [to],
          subject: subject,
          html: htmlBody,
          reply_to: replyToEmail,
          attachments: attachments.map((att) => ({
            filename: att.filename,
            content: Buffer.from(att.content).toString('base64'),
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to send email via Resend API');
      }

      console.log(`[EMAIL SERVICE] Receipt email sent via Resend API. MsgID: ${data.id}`);
      return { success: true, messageId: data.id };
    } catch (resendError: any) {
      console.error('[EMAIL SERVICE] Resend API error for receipt, trying SMTP:', resendError.message);
    }
  }

  // Deliver via SMTP
  if (smtpHost && smtpUser && smtpPass) {
    try {
      const secure = process.env.SMTP_SECURE === 'true' || smtpPort === '465';
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort || '587', 10),
        secure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html: htmlBody,
        replyTo: replyToEmail,
        attachments: attachments.map((att) => ({
          filename: att.filename,
          content: Buffer.from(att.content),
        })),
      });

      console.log(`[EMAIL SERVICE] Receipt email sent via SMTP. MsgID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (smtpError: any) {
      console.error('[EMAIL SERVICE] SMTP delivery failed for receipt:', smtpError.message);
      throw new Error(`Email sending failed: ${smtpError.message}`);
    }
  }

  // Fallback mock log
  console.log('=== EMAIL SERVICE MOCK RECEIPT (NOT CONFIGURED) ===');
  console.log(`To: ${to}`);
  console.log(`From: "${fromName}" <${fromEmail}>`);
  console.log(`Subject: ${subject}`);
  console.log(`HTML Message:\n${htmlBody}`);
  if (attachments.length > 0) {
    console.log(`Attachment: ${attachments[0].filename} (${attachments[0].content.length} bytes)`);
  }
  console.log('==================================================');

  await new Promise((resolve) => setTimeout(resolve, 800));

  return {
    success: true,
    messageId: `mock-msg-${Math.random().toString(36).substring(2, 11)}`,
  };
}

export async function sendWelcomeEmail(to: string, name: string): Promise<{ success: boolean; messageId: string }> {
  const subject = `Welcome to BillCraft, ${name}! 🚀`;
  const htmlBody = `
    <div style="font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #10b981; font-weight: 800; font-size: 24px; margin-top: 0; margin-bottom: 12px; letter-spacing: -0.025em;">Welcome to BillCraft!</h2>
      <p style="font-size: 16px; line-height: 1.6; color: #475569; margin-bottom: 16px;">
        Hi ${name},<br/><br/>
        We're thrilled to have you onboard! BillCraft is designed to help you create professional, GST-compliant invoices and collect payments with <b>zero fees</b> using dynamic UPI.
      </p>
      <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <h3 style="font-size: 14px; font-weight: 700; color: #334155; margin-top: 0; margin-bottom: 8px;">🚀 Quick Start Guide:</h3>
        <ul style="font-size: 13px; color: #64748b; padding-left: 20px; margin: 0; line-height: 1.6;">
          <li>Create your Business Profile in Settings to set up your bank details and custom brand colors.</li>
          <li>Add your Clients under the Clients Registry with their billing and shipping details.</li>
          <li>Link your WhatsApp Assistant from the Dashboard to create invoices and send reminders on the go!</li>
        </ul>
      </div>
      <p style="margin-bottom: 24px; text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
          Go to Dashboard
        </a>
      </p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.5; text-align: center;">
        If you have any questions, feel free to contact our support at support@billcraft.in.
      </p>
    </div>
  `;

  return sendReceiptEmail({
    to,
    subject,
    htmlBody,
    fromName: 'BillCraft Onboarding',
    replyToEmail: 'support@billcraft.in',
  });
}



