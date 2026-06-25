import { sendInvoiceEmail } from '@/lib/email-service';
import { formatCurrency, formatDate } from '@/lib/helpers';
import { DEFAULT_REMINDER_TEMPLATES } from './reminder-defaults';

/**
 * Compiles a template string, replacing variables in {{variableName}} format
 * and executing conditional blocks in {{#if variableName}}content{{/if}} format.
 */
export function compileTemplate(template: string, variables: Record<string, string>): string {
  let result = template;

  // 1. Process conditional blocks: {{#if variableName}}content{{/if}}
  const conditionalRegex = /\{\{#if\s+([a-zA-Z0-9_]+)\s*\}\}([\s\S]*?)\{\{\/if\}\}/g;
  result = result.replace(conditionalRegex, (match, key, content) => {
    const value = variables[key];
    // Check if the value is truthy and not zero/empty
    const isTruthy = value !== undefined && value !== null && value !== "" && value !== "0" && !value.includes("₹0.00") && !value.includes("$0.00");
    if (isTruthy) {
      return content;
    }
    return "";
  });

  // 2. Process variable replacements: {{variableName}}
  const variableRegex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  result = result.replace(variableRegex, (match, key) => {
    return variables[key] !== undefined && variables[key] !== null ? variables[key] : "";
  });

  return result.trim();
}

/**
 * Generates variables lookup dictionary from an invoice object for compilation.
 */
export function getTemplateVariables(invoice: any): Record<string, string> {
  const grandTotal = Number(invoice.grandTotal);
  const amountPaid = Number(invoice.amountPaid || 0);
  const outstanding = grandTotal - amountPaid;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const paymentLink = invoice.publicShareId 
    ? `${appUrl}/i/${invoice.publicShareId}` 
    : `${appUrl}/dashboard/invoices/${invoice.id}`;

  return {
    clientName: invoice.client.name || 'Client',
    invoiceNumber: String(invoice.invoiceNumber),
    dueDate: formatDate(invoice.dueDate),
    issueDate: formatDate(invoice.issueDate),
    grandTotal: formatCurrency(grandTotal, invoice.currency),
    amountPaid: amountPaid > 0 ? formatCurrency(amountPaid, invoice.currency) : "",
    outstandingAmount: formatCurrency(outstanding, invoice.currency),
    paymentLink: paymentLink,
    businessName: invoice.business.name || 'Our Business',
  };
}

/**
 * Determines whether an invoice qualifies for a reminder stage and returns the details.
 */
export function determineReminderStage(
  invoice: any,
  userTemplates: any[],
  today: Date = new Date()
): {
  shouldRemind: boolean;
  stage: number;
  template: any;
  triggeredBy: 'schedule' | 'viewed_not_paid' | null;
  reason?: string;
} {
  // Only remind for unpaid, sent/partial/overdue invoices
  const unpaidStatus = ['SENT', 'PARTIAL', 'OVERDUE'];
  if (!unpaidStatus.includes(invoice.status)) {
    return { shouldRemind: false, stage: 0, template: null, triggeredBy: null, reason: "Invoice is not unpaid" };
  }

  // Next logical stage based on current reminder count
  const nextStage = invoice.reminderCount + 1;
  if (nextStage > 4) {
    return { shouldRemind: false, stage: 0, template: null, triggeredBy: null, reason: "Max reminder stage (4) exceeded" };
  }

  // Find template for this stage (user-configured or system default)
  const template = userTemplates.find(t => t.stage === nextStage) || 
                   DEFAULT_REMINDER_TEMPLATES.find(t => t.stage === nextStage);

  if (!template) {
    return { shouldRemind: false, stage: 0, template: null, triggeredBy: null, reason: `No template found for stage ${nextStage}` };
  }

  // Calculate days overdue
  const msOverdue = today.getTime() - new Date(invoice.dueDate).getTime();
  const daysOverdue = Math.floor(msOverdue / (1000 * 60 * 60 * 24));

  // Calculate days since last reminder
  let daysSinceLast = Infinity;
  if (invoice.lastReminderAt) {
    const msSinceLast = today.getTime() - new Date(invoice.lastReminderAt).getTime();
    daysSinceLast = Math.floor(msSinceLast / (1000 * 60 * 60 * 24));
  }

  // Escalation rules configuration
  let daysAfterDueRequired = template.daysAfterDue;
  let daysAfterLastRequired = template.daysAfterLast;
  let triggeredBy: 'schedule' | 'viewed_not_paid' = 'schedule';

  // "Viewed but not paid" early escalation rule:
  // If the invoice was viewed but not paid, reduce threshold requirements by 1 day
  if (invoice.viewCount > 0) {
    daysAfterDueRequired = Math.max(0, template.daysAfterDue - 1);
    daysAfterLastRequired = Math.max(1, template.daysAfterLast - 1);
    triggeredBy = 'viewed_not_paid';
  }

  // Check if enough days have passed since due date
  if (daysOverdue < daysAfterDueRequired) {
    return { 
      shouldRemind: false, 
      stage: nextStage, 
      template, 
      triggeredBy: null, 
      reason: `Invoice is only ${daysOverdue} days overdue. Needs ${daysAfterDueRequired} days.` 
    };
  }

  // Check if enough days have passed since last reminder
  if (invoice.lastReminderAt && daysSinceLast < daysAfterLastRequired) {
    return { 
      shouldRemind: false, 
      stage: nextStage, 
      template, 
      triggeredBy: null, 
      reason: `Only ${daysSinceLast} days since last reminder. Needs ${daysAfterLastRequired} days.` 
    };
  }

  return {
    shouldRemind: true,
    stage: nextStage,
    template,
    triggeredBy,
  };
}

/**
 * Interface/wrapper to send reminder emails.
 */
export async function sendReminderEmail(
  invoiceId: string,
  to: string,
  subject: string,
  body: string
): Promise<{ success: boolean; messageId: string }> {
  // Directly trigger email service (supports real SMTP or Resend, or mock fallback)
  return sendInvoiceEmail(invoiceId, to, subject, body);
}

/**
 * Helper to generate WhatsApp reminder link
 */
export function generateWhatsAppReminder(
  phone: string | null,
  body: string
): string {
  if (!phone) return "";
  // Strip non-numeric characters except maybe leading '+'
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  const encodedText = encodeURIComponent(body);
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
}
