import { prisma } from '../prisma';

export const SYSTEM_TEMPLATES = [
  {
    name: 'invoice_delivered',
    category: 'UTILITY',
    content: `*Invoice from {{businessName}}*\n\nInvoice #: {{invoiceNumber}}\nAmount: *₹{{amount}}*\nDue: {{dueDate}}\n\nView & Pay: {{invoiceLink}}\n\nQuestions? Reply here.`,
    variables: ['businessName', 'invoiceNumber', 'amount', 'dueDate', 'invoiceLink']
  },
  {
    name: 'payment_reminder_stage_1',
    category: 'UTILITY',
    content: `Hi {{clientName}}! 👋\n\nFriendly reminder: Invoice *{{invoiceNumber}}* for *₹{{amount}}* is due on {{dueDate}}.\n\nPay now: {{paymentLink}}\n\nThank you!`,
    variables: ['clientName', 'invoiceNumber', 'amount', 'dueDate', 'paymentLink']
  },
  {
    name: 'payment_reminder_stage_2',
    category: 'UTILITY',
    content: `Hi {{clientName}},\n\nInvoice *{{invoiceNumber}}* (*₹{{amount}}*) is now due.\n\nPlease process: {{paymentLink}}\n\n— {{businessName}}`,
    variables: ['clientName', 'invoiceNumber', 'amount', 'paymentLink', 'businessName']
  },
  {
    name: 'payment_reminder_stage_3',
    category: 'UTILITY',
    content: `Hi {{clientName}},\n\nInvoice *{{invoiceNumber}}* for *₹{{amount}}* is *overdue*. Please prioritize.\n\nPay now: {{paymentLink}}\n\n— {{businessName}}`,
    variables: ['clientName', 'invoiceNumber', 'amount', 'paymentLink', 'businessName']
  },
  {
    name: 'payment_proof_received',
    category: 'UTILITY',
    content: `✅ Payment proof received for Invoice *{{invoiceNumber}}*!\n\nAmount: ₹{{amount}}\n\n{{freelancerName}} will verify shortly. You'll get your receipt once confirmed.\n\nReference: {{proofReference}}`,
    variables: ['invoiceNumber', 'amount', 'freelancerName', 'proofReference']
  },
  {
    name: 'payment_confirmed_receipt',
    category: 'UTILITY',
    content: `*Payment Received! 🎉*\n\nInvoice: {{invoiceNumber}}\nAmount Paid: *₹{{amount}}*\nBalance: *₹0.00* (Fully Paid)\n\nThank you for your business!\n\nDownload receipt: {{receiptLink}}`,
    variables: ['invoiceNumber', 'amount', 'receiptLink']
  },
  {
    name: 'opt_in_request',
    category: 'UTILITY',
    content: `Hi {{clientName}}! 👋\n\n{{freelancerName}} would like to send you invoices and payment updates via WhatsApp.\n\nReply *YES* to receive:\n• Invoice notifications\n• Payment reminders\n• Payment receipts\n• Quick payment links\n\nReply *STOP* to decline.\n\nThis is one-time. Your privacy is respected.`,
    variables: ['clientName', 'freelancerName']
  },
  {
    name: 'opt_in_confirmed',
    category: 'UTILITY',
    content: `✅ You're all set! You'll now receive invoices from {{freelancerName}} via WhatsApp.\n\nReply STOP anytime to unsubscribe.\n\nWhat would you like to do?\n• View latest invoice — reply "invoice"\n• Make payment — reply "pay"`,
    variables: ['freelancerName']
  }
];

export async function seedSystemTemplates() {
  for (const template of SYSTEM_TEMPLATES) {
    await prisma.whatsAppTemplate.upsert({
      where: { name: template.name },
      create: {
        name: template.name,
        category: template.category,
        content: template.content,
        variables: template.variables,
        isSystem: true,
        isActive: true
      },
      update: {} // Don't overwrite existing
    });
  }
}
