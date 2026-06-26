require('dotenv').config();
const http = require('http');
const https = require('https');

// Target a real user ID from your database to test account linking
const userId = 'cmqng1aw80008987k6ehe7vxy'; 
const mockSenderPhone = '919876543210';

const payload = JSON.stringify({
  object: 'whatsapp_business_account',
  entry: [
    {
      id: '1234567890',
      changes: [
        {
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '16505553333',
              phone_number_id: 'PHONE_NUMBER_ID'
            },
            contacts: [
              {
                wa_id: mockSenderPhone,
                profile: { name: 'Hashir Khan' }
              }
            ],
            messages: [
              {
                from: mockSenderPhone,
                id: 'wamid.test_message_' + Math.random().toString(36).substring(7),
                timestamp: Math.floor(Date.now() / 1000).toString(),
                text: { body: `Register ${userId}` },
                type: 'text'
              }
            ]
          },
          field: 'messages'
        }
      ]
    }
  ]
});

// Resolve endpoint URL from environment or default to localhost:3000
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
console.log(`Resolved App URL: ${appUrl}`);

const url = new URL('/api/whatsapp/webhook', appUrl);
const isHttps = url.protocol === 'https:';
const clientModule = isHttps ? https : http;

const options = {
  hostname: url.hostname,
  port: url.port || (isHttps ? 443 : 80),
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

console.log(`Sending mock registration payload to ${url.href}...`);

const req = clientModule.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  let body = '';
  res.on('data', chunk => {
    body += chunk;
  });
  res.on('end', () => {
    console.log(`RESPONSE BODY: ${body}`);
    console.log('\nSimulating registration webhook request complete.');
    console.log(`If your dev server is running on ${appUrl}, check the terminal logs to see the link operation.`);
  });
});

req.on('error', e => {
  console.error(`Connection Error: ${e.message}`);
  console.log(`Please make sure your local dev server is running or configure NEXT_PUBLIC_APP_URL.`);
});

req.write(payload);
req.end();
