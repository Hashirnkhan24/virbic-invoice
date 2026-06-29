export interface WhatsAppProvider {
  // Send a simple text message
  sendText(to: string, body: string): Promise<{ messageId: string }>
  
  // Send a message with media (image, document)
  sendMedia(to: string, body: string, mediaUrl: string, mediaType: 'image' | 'document'): Promise<{ messageId: string }>
  
  // Send an interactive message (buttons, lists)
  sendInteractive(to: string, body: string, buttons: Array<{ id: string; title: string }>): Promise<{ messageId: string }>
  
  // Send a template message
  sendTemplate(to: string, templateName: string, languageCode: string, variables: string[], buttonVariables?: string[]): Promise<{ messageId: string }>
  
  // Parse incoming webhook payload
  parseWebhook(payload: unknown): WhatsAppWebhookEvent
  
  // Verify webhook signature
  verifySignature(payload: string, signature: string, secret: string): boolean
}

export interface WhatsAppWebhookEvent {
  type: 'message' | 'status_update' | 'unknown'
  from: string        // Normalized phone number
  to: string         // Business number
  body?: string
  mediaUrl?: string
  mediaType?: string
  messageId: string
  timestamp: Date
  rawPayload: unknown
}
