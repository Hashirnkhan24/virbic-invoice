export interface DefaultTemplate {
  stage: number;
  tone: string;
  subject: string;
  body: string;
  daysAfterDue: number;
  daysAfterLast: number;
  sendEmail: boolean;
  generateWaMsg: boolean;
}

export const DEFAULT_REMINDER_TEMPLATES: DefaultTemplate[] = [
  {
    stage: 1,
    tone: "polite",
    daysAfterDue: 3,
    daysAfterLast: 3,
    sendEmail: true,
    generateWaMsg: true,
    subject: "Friendly Reminder: Invoice {{invoiceNumber}} from {{businessName}}",
    body: "Hi {{clientName}},\n\nThis is a friendly reminder that invoice {{invoiceNumber}} for {{grandTotal}} is due on {{dueDate}}.\n\n{{#if amountPaid}}\nYou have already paid {{amountPaid}}, leaving an outstanding balance of {{outstandingAmount}}.\n{{/if}}\n\nYou can view and pay the invoice online here: {{paymentLink}}\n\nThank you for your business!\n\nBest regards,\n{{businessName}}"
  },
  {
    stage: 2,
    tone: "standard",
    daysAfterDue: 7,
    daysAfterLast: 4,
    sendEmail: true,
    generateWaMsg: true,
    subject: "Payment Reminder: Invoice {{invoiceNumber}} - {{businessName}}",
    body: "Dear {{clientName}},\n\nWe hope this email finds you well. We are writing to remind you that invoice {{invoiceNumber}} is now overdue. The total amount of {{grandTotal}} was due on {{dueDate}}.\n\n{{#if amountPaid}}\nWe have received your partial payment of {{amountPaid}}. The remaining balance is {{outstandingAmount}}.\n{{/if}}\n\nPlease review and settle the invoice as soon as possible: {{paymentLink}}\n\nIf you have any questions or if payment has already been sent, please let us know.\n\nSincerely,\n{{businessName}}"
  },
  {
    stage: 3,
    tone: "firm",
    daysAfterDue: 14,
    daysAfterLast: 7,
    sendEmail: true,
    generateWaMsg: true,
    subject: "Overdue Invoice: Invoice {{invoiceNumber}} - {{businessName}}",
    body: "Dear {{clientName}},\n\nThis is a reminder that invoice {{invoiceNumber}} is significantly overdue. The payment of {{outstandingAmount}} was due on {{dueDate}}.\n\nWe request that you settle this invoice immediately. You can view the payment options and invoice details online:\n{{paymentLink}}\n\nPlease reply to this email to confirm when we can expect the payment.\n\nRegards,\n{{businessName}}"
  },
  {
    stage: 4,
    tone: "final",
    daysAfterDue: 30,
    daysAfterLast: 10,
    sendEmail: true,
    generateWaMsg: true,
    subject: "FINAL NOTICE: Invoice {{invoiceNumber}} is severely overdue - {{businessName}}",
    body: "Dear {{clientName}},\n\nDespite our previous reminders, we have still not received payment for invoice {{invoiceNumber}} (outstanding: {{outstandingAmount}}), which was due on {{dueDate}}.\n\nThis is our final payment reminder. Please settle the balance immediately via the payment link below:\n{{paymentLink}}\n\nIf we do not receive payment or hear from you by the end of this week, we may be forced to take further action to recover the debt.\n\n{{businessName}}"
  }
];

export interface TemplateVariable {
  name: string;
  description: string;
  example: string;
}

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { name: "clientName", description: "Name of the client", example: "Acme Corp" },
  { name: "invoiceNumber", description: "The invoice number", example: "INV-2026-001" },
  { name: "dueDate", description: "Invoice due date", example: "July 15, 2026" },
  { name: "issueDate", description: "Invoice issue date", example: "June 15, 2026" },
  { name: "grandTotal", description: "Total amount of the invoice", example: "₹15,000.00" },
  { name: "amountPaid", description: "Amount paid so far", example: "₹5,000.00" },
  { name: "outstandingAmount", description: "Remaining balance on the invoice", example: "₹10,000.00" },
  { name: "paymentLink", description: "Link to view and pay the invoice", example: "https://virbic.com/invoice/pay/xyz" },
  { name: "businessName", description: "Name of your business", example: "Virbic Corp" }
];
