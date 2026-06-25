export interface TemplateData {
  clientName: string;
  amountPaid: string;
  invoiceNumber: string;
  invoiceTotal: string;
  amountDue: string;
  businessName: string;
  paymentDate: string;
  paymentMethod: string;
  receiptNumber: string;
  receiptLink?: string;
}

export const CONFIRMATION_TEMPLATES = {
  whatsapp: {
    full: `Hello {{clientName}},\n\nWe have received your payment of *{{amountPaid}}* for Invoice *#{{invoiceNumber}}*. Thank you for your business!\n\nYour invoice is now fully paid.\n\nBest regards,\n*{{businessName}}*`,
    partial: `Hello {{clientName}},\n\nThank you for the payment of *{{amountPaid}}* for Invoice *#{{invoiceNumber}}*.\n\nRemaining Balance: *{{amountDue}}*\nTotal Invoice Amount: *{{invoiceTotal}}*\n\nBest regards,\n*{{businessName}}*`,
  },
  email: {
    subject: `Payment Receipt: {{receiptNumber}} for Invoice #{{invoiceNumber}}`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Receipt</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #1e293b;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 48px 20px;
      box-sizing: border-box;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.03);
      border: 1px solid #f1f5f9;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      padding: 40px 32px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.025em;
    }
    .header p {
      margin: 0;
      font-size: 16px;
      opacity: 0.9;
    }
    .content {
      padding: 40px 32px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .message {
      font-size: 15px;
      line-height: 1.6;
      color: #475569;
      margin-bottom: 32px;
    }
    .receipt-card {
      background-color: #f8fafc;
      border-radius: 12px;
      padding: 24px;
      border: 1px solid #f1f5f9;
      margin-bottom: 32px;
    }
    .receipt-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
      margin-bottom: 16px;
    }
    .btn-container {
      text-align: center;
      margin-bottom: 32px;
    }
    .btn {
      display: inline-block;
      background-color: #10b981;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid #f1f5f9;
      font-size: 13px;
      color: #94a3b8;
    }
    .footer p {
      margin: 0 0 8px 0;
    }
    .footer p:last-child {
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>Payment Confirmation</h1>
        <p>Receipt #{{receiptNumber}}</p>
      </div>
      <div class="content">
        <p class="greeting">Hello {{clientName}},</p>
        <p class="message">
          We have successfully processed your payment of <strong>{{amountPaid}}</strong>. 
          A summary of the transaction is detailed below. 
          {{#ifIsFullyPaid}}Your invoice is now fully paid. Thank you for your business!{{/ifIsFullyPaid}}
          {{#ifIsPartiallyPaid}}Your outstanding balance is now {{amountDue}}.{{/ifIsPartiallyPaid}}
        </p>
        
        <div class="receipt-card">
          <div class="receipt-title">Payment Summary</div>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="font-size: 14px;">
              <td style="padding: 6px 0; color: #64748b; text-align: left;">Receipt Number</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right;">{{receiptNumber}}</td>
            </tr>
            <tr style="font-size: 14px;">
              <td style="padding: 6px 0; color: #64748b; text-align: left;">Invoice Reference</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right;">#{{invoiceNumber}}</td>
            </tr>
            <tr style="font-size: 14px;">
              <td style="padding: 6px 0; color: #64748b; text-align: left;">Payment Date</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right;">{{paymentDate}}</td>
            </tr>
            <tr style="font-size: 14px;">
              <td style="padding: 6px 0; color: #64748b; text-align: left;">Payment Method</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right;">{{paymentMethod}}</td>
            </tr>
            <tr style="font-size: 14px;">
              <td style="padding: 6px 0; color: #64748b; text-align: left;">Total Invoice Amount</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right;">{{invoiceTotal}}</td>
            </tr>
            <tr style="font-size: 14px; border-top: 1px dashed #e2e8f0;">
              <td style="padding: 12px 0 6px 0; color: #64748b; font-weight: bold; text-align: left;">Amount Paid</td>
              <td style="padding: 12px 0 6px 0; font-weight: 700; color: #10b981; font-size: 18px; text-align: right;">{{amountPaid}}</td>
            </tr>
            <tr style="font-size: 14px;">
              <td style="padding: 6px 0 0 0; color: #64748b; text-align: left;">Remaining Balance</td>
              <td style="padding: 6px 0 0 0; font-weight: 600; color: #0f172a; text-align: right;">{{amountDue}}</td>
            </tr>
          </table>
        </div>
        
        {{#ifReceiptLink}}
        <div class="btn-container">
          <a href="{{receiptLink}}" class="btn" style="color: #ffffff; text-decoration: none;" target="_blank">View Receipt Online</a>
        </div>
        {{/ifReceiptLink}}
      </div>
      <div class="footer">
        <p>Thank you for using our invoicing system.</p>
        <p><strong>{{businessName}}</strong></p>
      </div>
    </div>
  </div>
</body>
</html>
    `,
  },
};
