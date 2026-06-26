import OpenAI from 'openai';
import { ConversationContext, ParsedIntent, UserIntent, ClientIntent } from './intents';

const SYSTEM_PROMPT = `You are the AI brain of BillCraft, an Indian invoicing platform.
You parse natural language (English, Hinglish, Hindi) into structured intents.

RULES:
1. Detect actor: USER (creates/manages invoices, queries revenue/outstanding, sends reminders) or CLIENT (pays/receives invoices, queries their own invoices)
2. Extract all entities: clientName, amount, description, dueDate, invoiceNumber, utr, dateRange.
3. Language Parsing:
   - Hinglish examples: "banao"=CREATE_INVOICE, "bhejo"=CREATE_INVOICE or SEND_REMINDER, "kitna bacha hai"=QUERY_OUTSTANDING, "kitna kamaya"=QUERY_REVENUE, "remind kar do"=SEND_REMINDER.
   - UTR/screenshot examples: "screenshot/proof bheja"=SUBMIT_PAYMENT_PROOF, "UTR number 123"=SUBMIT_UTR.
4. Date parsing: "kal"=tomorrow, "agla hafta"=next week, "15 din"=15 days. Normalize to absolute dates if possible (relative to current date).
5. Amount parsing: "25k"=25000, "1.5 lakh"=150000, "paanch hazaar"=5000.
6. Return JSON only. No explanations.

OUTPUT FORMAT:
{
  "actor": "USER|CLIENT",
  "intent": "INTENT_NAME",
  "entities": {
    "clientName": "string|null",
    "amount": number|null,
    "description": "string|null",
    "dueDate": "ISO string|null",
    "invoiceNumber": "string|null",
    "utr": "string|null",
    "dateRange": "string|null"
  },
  "confidence": 0.0-1.0,
  "missingFields": ["field1", "field2"],
  "requiresConfirmation": true|false,
  "clarificationNeeded": "string|null"
}`;

export async function parseIntent(input: string, context?: ConversationContext): Promise<ParsedIntent> {
  const messages: any[] = [
    { role: 'system', content: SYSTEM_PROMPT }
  ];

  // Inject current date context so model can parse relative dates (like "today", "tomorrow", "next week")
  const currentDateStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata'
  });

  messages.push({
    role: 'system',
    content: `Context:\n- Current Date: ${currentDateStr}\n- Active Currency: INR`
  });

  if (context) {
    messages.push({
      role: 'system',
      content: `Active Conversation Context:\n${JSON.stringify({
        lastIntent: context.lastIntent,
        lastEntities: context.lastEntities,
        actor: context.actor,
        turnCount: context.turnCount
      })}`
    });
  }

  messages.push({ role: 'user', content: input });

  const providers = [
    {
      name: 'openai',
      apiKey: process.env.OPEN_AI_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: undefined,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
    },
    {
      name: 'gemini',
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash'
    },
    {
      name: 'groq',
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
    }
  ];

  for (const provider of providers) {
    if (!provider.apiKey) {
      console.warn(`[AI Intent Parser] Skipping ${provider.name} because API key is not configured.`);
      continue;
    }

    try {
      console.log(`[AI Intent Parser] Attempting parse using ${provider.name} (${provider.model})...`);
      const openai = new OpenAI({
        apiKey: provider.apiKey,
        baseURL: provider.baseURL
      });

      const response = await openai.chat.completions.create({
        model: provider.model,
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 500
      });

      const content = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);
      console.log(`[AI Intent Parser] Successfully parsed with ${provider.name}!`);

      // Normalize entities
      const entities = normalizeEntities(parsed.entities || {});

      // Ensure intent mapping matches enums
      let intent: any = parsed.intent;
      if (parsed.actor === 'CLIENT') {
        if (!Object.values(ClientIntent).includes(intent)) {
          intent = ClientIntent.UNKNOWN;
        }
      } else {
        if (!Object.values(UserIntent).includes(intent)) {
          intent = UserIntent.UNKNOWN;
        }
      }

      return {
        intent,
        actor: parsed.actor || (context?.actor || 'USER'),
        entities,
        confidence: parsed.confidence || 0.5,
        missingFields: parsed.missingFields || [],
        requiresConfirmation: parsed.requiresConfirmation || false,
        suggestedResponse: parsed.clarificationNeeded || ''
      };
    } catch (error: any) {
      console.error(`[AI Intent Parser Error] Provider ${provider.name} failed:`, error.message || error);
      // Fall back to next provider in the chain
    }
  }

  // All API providers failed (or none are configured). Fallback to local rule-based parsing.
  console.warn('[AI Intent Parser] All AI providers failed or were unconfigured. Falling back to local rule-based mock parser.');
  return parseIntentLocally(input, context);
}

function parseIntentLocally(input: string, context?: ConversationContext): ParsedIntent {
  const text = input.toLowerCase().trim();
  const actor = context?.actor || 'USER';
  
  let intent: any = (actor === 'CLIENT' ? ClientIntent.UNKNOWN : UserIntent.UNKNOWN);
  const entities: Record<string, any> = {
    clientName: null,
    amount: null,
    description: null,
    dueDate: null,
    invoiceNumber: null,
    utr: null,
    dateRange: null
  };
  
  // 1. Client specific flows
  if (actor === 'CLIENT') {
    if (text.includes('pay') || text.includes('upi') || text.includes('bhugtan')) {
      intent = ClientIntent.REQUEST_PAYMENT_LINK;
    } else if (text.includes('invoice') || text.includes('bill') || text.includes('details') || text.includes('rasid')) {
      intent = ClientIntent.QUERY_INVOICES;
    }
    
    // Extract UTR (12 digit number)
    const utrMatch = text.match(/\b\d{12}\b/);
    if (utrMatch) {
      intent = ClientIntent.SUBMIT_UTR;
      entities.utr = utrMatch[0];
    }
  } else {
    // 2. User/Freelancer specific flows
    if (text.includes('banao') || text.includes('create') || text.includes('generate') || text.includes('new invoice')) {
      intent = UserIntent.CREATE_INVOICE;
    } else if (text.includes('outstanding') || text.includes('kitna bacha') || text.includes('baki')) {
      intent = UserIntent.QUERY_OUTSTANDING;
    } else if (text.includes('revenue') || text.includes('kamaya') || text.includes('kamai') || text.includes('earning')) {
      intent = UserIntent.QUERY_REVENUE;
    } else if (text.includes('remind') || text.includes('yadaasht') || text.includes('bhejo') || text.includes('send reminder')) {
      intent = UserIntent.SEND_REMINDER;
    }
    
    // Extract amount
    const amountMatch = text.match(/\b\d+(?:k|kilo|k)?\b/);
    if (amountMatch) {
      const val = amountMatch[0];
      if (val.endsWith('k')) {
        entities.amount = parseInt(val) * 1000;
      } else {
        const parsedAmt = parseInt(val);
        if (!isNaN(parsedAmt)) {
          entities.amount = parsedAmt;
        }
      }
    }
    
    // Extract client name (e.g., "for Acme" or "to Rohan")
    const clientMatch = text.match(/(?:for|to|ko|naam)\s+([a-zA-Z0-9\s]+)/);
    if (clientMatch) {
      entities.clientName = clientMatch[1].trim();
    }
    
    // Extract invoice number if present
    const invMatch = text.match(/inv-\d{4}-\d{2}-\d+/i) || text.match(/inv\/\d{4}-\d{2}\/\d+/i);
    if (invMatch) {
      entities.invoiceNumber = invMatch[0].toUpperCase();
    }
  }
  
  return {
    intent,
    actor,
    entities,
    confidence: 0.8,
    missingFields: [],
    requiresConfirmation: intent === UserIntent.CREATE_INVOICE,
    suggestedResponse: ''
  };
}

function normalizeEntities(entities: Record<string, any>): Record<string, any> {
  const result = { ...entities };

  // 1. Normalize amount
  if (result.amount !== undefined && result.amount !== null) {
    const amt = parseFloat(String(result.amount));
    result.amount = isNaN(amt) ? null : amt;
  }

  // 2. Normalize dueDate
  if (result.dueDate) {
    try {
      const parsedDate = new Date(result.dueDate);
      if (!isNaN(parsedDate.getTime())) {
        result.dueDate = parsedDate;
      } else {
        result.dueDate = null;
      }
    } catch {
      result.dueDate = null;
    }
  }

  return result;
}
