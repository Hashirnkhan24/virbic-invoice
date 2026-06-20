import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatCurrency, formatDate } from '@/lib/helpers';

export async function GET(request: NextRequest) {
  try {
    // 1. Verify cron authorization secret
    const authHeader = request.headers.get('Authorization');
    const secret = process.env.CRON_SECRET || 'virbic-cron-secret-123';
    
    if (!authHeader || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    
    // 2. Fetch all unpaid invoices that are past due date
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        dueDate: { lt: today },
        status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] },
        isRecurringTemplate: false,
      },
      include: {
        user: true,
        business: true,
        client: true,
      },
    });

    const results = [];
    let remindersSent = 0;

    for (const invoice of overdueInvoices) {
      const user = invoice.user;
      
      // Load user configurations
      const remindersEnabled = user.reminderOverdueEnabled ?? true;
      const frequencyDays = user.reminderFrequencyDays ?? 3;
      const maxReminders = user.reminderMaxCount ?? 3;

      if (!remindersEnabled) continue;
      if (invoice.reminderCount >= maxReminders) continue;

      // Check if enough time has elapsed since last reminder
      const referenceDate = invoice.lastReminderAt || invoice.dueDate;
      const msElapsed = today.getTime() - referenceDate.getTime();
      const daysElapsed = msElapsed / (1000 * 60 * 60 * 24);

      if (daysElapsed >= frequencyDays) {
        // Prepare dynamic amounts
        const outstanding = Number(invoice.grandTotal) - Number(invoice.amountPaid);
        const amountStr = formatCurrency(outstanding, invoice.currency);
        
        // Subject & Body
        const shareLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/i/${invoice.publicShareId}`;

        const replacements: { [key: string]: string } = {
          number: String(invoice.invoiceNumber),
          amount: amountStr,
          client_name: invoice.client.name || 'Client',
          due_date: formatDate(invoice.dueDate),
          days_overdue: String(Math.floor((today.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24))),
          share_link: shareLink,
          business_name: invoice.business.name,
        };

        const replaceTokens = (text: string) => {
          let res = text;
          for (const [k, v] of Object.entries(replacements)) {
            const regex = new RegExp(`\\{${k}\\}`, 'gi');
            res = res.replace(regex, v);
          }
          return res;
        };

        const subjectTemplate = user.reminderSubjectTemplate || "Reminder: Invoice {number} for {amount} is overdue";
        const bodyTemplate = user.reminderBodyTemplate || `Dear {client_name},

This is a polite reminder that invoice {number} is currently overdue.
An outstanding balance of {amount} remains unpaid.

Invoice Details:
- Number: {number}
- Due Date: {due_date}
- Days Overdue: {days_overdue} days

You can view the invoice details and complete your payment online using the direct link below:
{share_link}

If you have already processed the payment, please ignore this email.

Sincerely,
{business_name}
Email: ${invoice.business.email || 'N/A'}
Phone: ${invoice.business.phone || 'N/A'}`;

        const subject = replaceTokens(subjectTemplate);
        const body = replaceTokens(bodyTemplate);

        const recipient = invoice.client.email || 'no-email@client.com';

        // 1. Mock email send (simulate)
        console.log(`[MOCK EMAIL SENT] To: ${recipient} | Subject: ${subject}`);

        // 2. Create Audit Log in database
        await prisma.invoiceReminder.create({
          data: {
            invoiceId: invoice.id,
            subject,
            body,
            recipient,
          },
        });

        // 3. Increment counters on Invoice
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            reminderCount: { increment: 1 },
            lastReminderAt: today,
            status: 'OVERDUE', // Mark as overdue explicitly
          },
        });

        remindersSent++;
        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          recipient,
          reminderCount: invoice.reminderCount + 1,
        });
      }
    }

    return NextResponse.json({
      success: true,
      remindersProcessed: overdueInvoices.length,
      remindersSent,
      details: results,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error running automated payment reminders:', error);
    return NextResponse.json({ error: error.message || 'Cron job failed' }, { status: 500 });
  }
}
