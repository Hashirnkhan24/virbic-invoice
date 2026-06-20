/**
 * Mock Email Service for Virbic Invoice
 * Later, this will be integrated with SendGrid or AWS SES.
 */
export async function sendInvoiceEmail(
  invoiceId: string,
  to: string,
  subject: string,
  message: string
): Promise<{ success: boolean; messageId: string }> {
  console.log('=== EMAIL SERVICE MOCK ===');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Invoice ID: ${invoiceId}`);
  console.log(`HTML Message:\n${message}`);
  console.log('Attachment: Invoice_INV_PDF_attached.pdf');
  console.log('==========================');

  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 800));

  return {
    success: true,
    messageId: `mock-msg-${Math.random().toString(36).substring(2, 11)}`,
  };
}
