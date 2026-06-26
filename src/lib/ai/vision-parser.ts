import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

/**
 * Downloads a binary media file from WhatsApp API (Meta or Twilio)
 */
export async function downloadWhatsAppMedia(
  mediaUrlOrId: string,
  providerType: string
): Promise<{ buffer: Buffer; extension: string }> {
  if (providerType === 'meta') {
    const accessToken = process.env.META_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error('META_ACCESS_TOKEN is not configured');
    }

    // 1. Fetch metadata to get direct media URL
    const metaUrl = `https://graph.facebook.com/v20.0/${mediaUrlOrId}`;
    console.log(`[Vision Webhook] Fetching Meta media metadata for ID ${mediaUrlOrId} from ${metaUrl}`);
    const metaRes = await fetch(metaUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!metaRes.ok) {
      const errText = await metaRes.text();
      throw new Error(`Failed to fetch Meta media metadata: ${errText}`);
    }

    const metaData = (await metaRes.json()) as any;
    const downloadUrl = metaData.url;
    if (!downloadUrl) {
      throw new Error('Meta media metadata response did not return a URL');
    }

    const mimeType = metaData.mime_type || 'image/jpeg';
    const extension = mimeType.split('/')[1]?.split('+')[0] || 'jpg';

    // 2. Fetch direct file binary from the temporary Amazon S3 CDN URL returned by Graph API
    console.log(`[Vision Webhook] Downloading Meta media file from CDN URL`);
    const fileRes = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!fileRes.ok) {
      throw new Error(`Failed to download Meta media file from CDN. Status: ${fileRes.status}`);
    }

    const arrayBuffer = await fileRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return { buffer, extension };
  } else {
    // Twilio provider (direct mediaUrl provided)
    console.log(`[Vision Webhook] Downloading Twilio media file from URL: ${mediaUrlOrId}`);
    const options: RequestInit = {};
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;

    if (sid && token) {
      const credentials = Buffer.from(`${sid}:${token}`).toString('base64');
      options.headers = {
        Authorization: `Basic ${credentials}`,
      };
    }

    const res = await fetch(mediaUrlOrId, options);
    if (!res.ok) {
      throw new Error(`Failed to download Twilio media file. Status: ${res.status}`);
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const extension = contentType.split('/')[1]?.split('+')[0] || 'jpg';
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return { buffer, extension };
  }
}

/**
 * Sends a base64 payment proof screenshot to GPT-4o-mini or Gemini-2.5-flash
 * to extract UTR, amount, and date.
 */
export async function parseReceiptVision(
  imageBuffer: Buffer,
  extension: string
): Promise<{ utr: string | null; amount: number | null; date: string | null }> {
  const base64Image = imageBuffer.toString('base64');
  const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';

  const providers = [
    {
      name: 'openai',
      apiKey: process.env.OPEN_AI_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: undefined,
      model: process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini'
    },
    {
      name: 'gemini',
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      model: process.env.GEMINI_VISION_MODEL || 'gemini-2.5-flash'
    }
  ];

  const prompt = `You are a receipt parsing assistant. Analyze this payment confirmation screenshot (usually a UPI receipt from GPay, PhonePe, Paytm, or a banking app) and extract the following details in JSON format:
{
  "utr": "12-digit transaction ID / UTR number (string of exactly 12 digits, or null)",
  "amount": numeric payment amount (number or null),
  "date": "transaction date in ISO format or string if not clear (string or null)"
}
Return ONLY the raw JSON object. Do not wrap in markdown code blocks. Do not include any other text.`;

  for (const provider of providers) {
    if (!provider.apiKey) {
      console.warn(`[Vision Parser] Skipping ${provider.name} because API key is not configured.`);
      continue;
    }

    try {
      console.log(`[Vision Parser] Attempting OCR using ${provider.name} (${provider.model})...`);
      const openai = new OpenAI({
        apiKey: provider.apiKey,
        baseURL: provider.baseURL
      });

      const response = await openai.chat.completions.create({
        model: provider.model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 250,
        temperature: 0.1
      });

      const content = response.choices[0]?.message?.content?.trim() || '{}';
      
      // Clean markdown formatting if model accidentally wraps JSON
      const cleanContent = content
        .replace(/^```json\s*/i, '')
        .replace(/```$/, '')
        .trim();

      const parsed = JSON.parse(cleanContent);
      console.log(`[Vision Parser] Successfully parsed receipt with ${provider.name}:`, parsed);
      
      // Extract UTR (should be 12 digits)
      let utrVal = parsed.utr ? String(parsed.utr).replace(/\D/g, '') : null;
      if (utrVal && utrVal.length !== 12) {
        // Fallback check if non-digit characters was in it or it is incomplete
        utrVal = null;
      }

      return {
        utr: utrVal,
        amount: parsed.amount ? parseFloat(String(parsed.amount)) : null,
        date: parsed.date || null
      };
    } catch (err: any) {
      console.error(`[Vision Parser Error] Provider ${provider.name} failed:`, err.message || err);
    }
  }

  // Local fallback if no API key is available (cannot do OCR, but prevent crashing)
  console.warn('[Vision Parser] All vision AI providers failed. Returning null extraction.');
  return { utr: null, amount: null, date: null };
}
