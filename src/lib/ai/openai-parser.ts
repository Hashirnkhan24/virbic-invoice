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
  const isOpenRouter = !!process.env.OPENROUTER_API_KEY;
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || 'mock-key';
  const baseURL = isOpenRouter ? 'https://openrouter.ai/api/v1' : undefined;
  const model = isOpenRouter 
    ? (process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash:free')
    : (process.env.OPENAI_MODEL || 'gpt-4o-mini');

  const openai = new OpenAI({
    apiKey,
    baseURL,
    defaultHeaders: isOpenRouter ? {
      'HTTP-Referer': 'https://virbic.com',
      'X-Title': 'BillCraft'
    } : undefined
  });

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

  try {
    const response = await openai.chat.completions.create({
      model,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 500
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

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
    console.error('[AI Intent Parser Error]', error);
    return {
      intent: (context?.actor === 'CLIENT' ? ClientIntent.UNKNOWN : UserIntent.UNKNOWN),
      actor: context?.actor || 'USER',
      entities: {},
      confidence: 0,
      missingFields: [],
      requiresConfirmation: false,
      suggestedResponse: 'Sorry, I encountered an issue parsing your message. Please try again.'
    };
  }
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
