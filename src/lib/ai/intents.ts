export enum UserIntent {
  // Invoice management
  CREATE_INVOICE = 'CREATE_INVOICE',
  EDIT_INVOICE = 'EDIT_INVOICE',
  CANCEL_INVOICE = 'CANCEL_INVOICE',
  DUPLICATE_INVOICE = 'DUPLICATE_INVOICE',
  
  // Queries
  QUERY_OUTSTANDING = 'QUERY_OUTSTANDING',
  QUERY_REVENUE = 'QUERY_REVENUE',
  QUERY_CLIENT_LEDGER = 'QUERY_CLIENT_LEDGER',
  QUERY_INVOICE_STATUS = 'QUERY_INVOICE_STATUS',
  QUERY_GST_SUMMARY = 'QUERY_GST_SUMMARY',
  
  // Actions
  SEND_REMINDER = 'SEND_REMINDER',
  BULK_REMINDER = 'BULK_REMINDER',
  MARK_PAID = 'MARK_PAID',
  
  // Expense logging
  LOG_EXPENSE = 'LOG_EXPENSE',
  
  // Help
  GENERAL_HELP = 'GENERAL_HELP',
  UNKNOWN = 'UNKNOWN'
}

export enum ClientIntent {
  // Payment
  REQUEST_PAYMENT_LINK = 'REQUEST_PAYMENT_LINK',
  SUBMIT_PAYMENT_PROOF = 'SUBMIT_PAYMENT_PROOF',
  SUBMIT_UTR = 'SUBMIT_UTR',
  
  // Queries
  QUERY_INVOICES = 'QUERY_INVOICES',
  QUERY_STATUS = 'QUERY_STATUS',
  REQUEST_RECEIPT = 'REQUEST_RECEIPT',
  
  // Help
  GENERAL_HELP = 'GENERAL_HELP',
  UNKNOWN = 'UNKNOWN'
}

export interface ParsedIntent {
  intent: UserIntent | ClientIntent;
  actor: 'USER' | 'CLIENT';
  entities: Record<string, any>;
  confidence: number;
  missingFields: string[];
  requiresConfirmation: boolean;
  suggestedResponse: string; // Clarification question / help text
}

export interface ConversationContext {
  sessionId: string; // whatsAppConversation ID or custom
  actor: 'USER' | 'CLIENT';
  userId?: string;     // User ID (business owner)
  clientId?: string;   // Client ID
  lastIntent?: string;
  lastEntities?: Record<string, any>;
  draftInvoice?: any;
  pendingConfirmationId?: string;
  turnCount: number;
  lastActiveAt: Date | string;
}
