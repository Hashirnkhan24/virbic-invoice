import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { determineReminderStage, getTemplateVariables, compileTemplate } from '@/lib/reminder-engine';
import { sendInvoiceEmail } from '@/lib/email-service';
import { sendWhatsAppMessage } from '@/lib/whatsapp/outbound';

export async function GET(request: NextRequest) {
  try {
    // 1. Verify cron authorization secret
    const authHeader = request.headers.get('Authorization');
    const secret = process.env.CRON_SECRET || 'virbic-cron-secret-123';
    
    if (!authHeader || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    
    // 2. Fetch all unpaid invoices
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
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
      if (!remindersEnabled) continue;

      // Fetch user's custom templates
      const userTemplates = await prisma.reminderTemplate.findMany({
        where: { userId: invoice.userId }
      });

      // Fetch view count for viewed_not_paid early escalation
      let viewCount = Number(invoice.viewCount);
      if (invoice.publicShareId) {
        try {
          const shareLog = await prisma.invoiceShareLog.findUnique({
            where: { shareId: invoice.publicShareId },
            select: { viewCount: true }
          });
          if (shareLog) {
            viewCount = shareLog.viewCount;
          }
        } catch (err) {
          // Table may not exist during migration
        }
      }

      // Determine if reminder should be sent and at what stage
      const { shouldRemind, stage, template, triggeredBy } = determineReminderStage(
        { ...invoice, viewCount },
        userTemplates,
        today
      );

      if (!shouldRemind) {
        continue;
      }

      // Compile template variables
      const variables = getTemplateVariables(invoice);
      const subject = compileTemplate(template.subject, variables);
      const body = compileTemplate(template.body, variables);

      const recipient = invoice.client.email || 'no-email@client.com';
      
      // Send Email if configured
      if (template.sendEmail && invoice.client.email) {
        try {
          const htmlMessage = body.replace(/\n/g, '<br />');
          await sendInvoiceEmail(invoice.id, recipient, subject, htmlMessage);
        } catch (emailErr: any) {
          console.error(`[CRON REMINDERS] Failed to send email for invoice ${invoice.id} to ${recipient}:`, emailErr.message);
        }
      }

      // Send WhatsApp if configured and client has phone
      const clientPhone = invoice.client.phone;
      if (template.generateWaMsg && clientPhone) {
        try {
          // Clean/normalize client phone
          const digits = clientPhone.replace(/\D/g, '');
          const withoutZero = digits.startsWith('0') ? digits.slice(1) : digits;
          const normalizedPhone = withoutZero.length === 10 ? `+91${withoutZero}` : `+${withoutZero}`;

          // Get or create conversation record
          let conversation = await prisma.whatsAppConversation.findFirst({
            where: {
              userId: invoice.userId,
              clientId: invoice.clientId
            }
          });

          if (!conversation) {
            conversation = await prisma.whatsAppConversation.create({
              data: {
                userId: invoice.userId,
                clientId: invoice.clientId,
                clientPhone: normalizedPhone,
                status: 'ACTIVE',
                optInStatus: 'CONFIRMED',
                optInAt: new Date(),
                optInMethod: 'automated_reminder'
              }
            });
          }

          const templateStage = stage === 3 ? 4 : stage;
          const currentTemplateName = `payment_reminder_stage_${templateStage}`;
          const formattedDate = new Date(invoice.dueDate).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          });
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://virbic.com';
          const invoiceLink = `${appUrl}/i/${invoice.publicShareId}`;

          let templateVariables: string[] = [];
          let buttonVariables: string[] = [];
          if (templateStage === 1) {
            templateVariables = [
              invoice.client.name,
              invoice.invoiceNumber,
              invoice.business.name,
              Number(invoice.grandTotal).toFixed(2),
              formattedDate,
              invoiceLink
            ];
            buttonVariables = [invoice.id];
          } else if (templateStage === 2) {
            const outstandingAmount = Number(invoice.grandTotal) - Number(invoice.amountPaid || 0);
            templateVariables = [
              invoice.client.name,
              invoice.invoiceNumber,
              outstandingAmount.toFixed(2),
              invoiceLink,
              invoice.business.name
            ];
          } else if (templateStage === 4) {
            const outstandingAmount = Number(invoice.grandTotal) - Number(invoice.amountPaid || 0);
            templateVariables = [
              invoice.invoiceNumber,
              invoice.client.name,
              outstandingAmount.toFixed(2),
              invoice.business.name,
              invoiceLink
            ];
            buttonVariables = [invoice.id];
          }

          await sendWhatsAppMessage({
            to: normalizedPhone,
            body: body,
            conversationId: conversation.id,
            userId: invoice.userId,
            template: {
              name: currentTemplateName,
              variables: templateVariables,
              buttonVariables: buttonVariables
            }
          });
        } catch (waErr: any) {
          console.error(`[CRON REMINDERS] Failed to send WhatsApp for invoice ${invoice.id}:`, waErr.message);
        }
      }

      // Set channel for audit log
      let channel = 'email';
      if (template.sendEmail && template.generateWaMsg) {
        channel = 'both';
      } else if (template.generateWaMsg) {
        channel = 'whatsapp';
      }

      // 1. Create Audit Log in database (ReminderLog)
      await prisma.reminderLog.create({
        data: {
          invoiceId: invoice.id,
          userId: invoice.userId,
          clientId: invoice.clientId,
          stage: stage,
          templateId: template.id || null,
          channel: channel,
          content: body,
          triggeredBy: triggeredBy,
        },
      });

      // 2. Create InvoiceReminder for backwards compatibility
      await prisma.invoiceReminder.create({
        data: {
          invoiceId: invoice.id,
          subject,
          body,
          recipient,
        },
      });

      // 3. Update counters and status on Invoice
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
        stage,
        channel,
        triggeredBy,
      });
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
