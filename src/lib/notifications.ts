import { prisma } from '@/lib/prisma';
import { sendReceiptEmail } from './email-service';

export async function sendUserNotification({
  userId,
  type,
  title,
  body,
  data
}: {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}) {
  // 1. In-app notification (store in DB)
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      data: data ? JSON.stringify(data) : null,
      read: false
    }
  });

  // 2. Fetch user details to send email
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (user && user.email) {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const invoiceLink = data?.invoiceId ? `${appUrl}/invoices/${data.invoiceId}` : `${appUrl}/payments`;
      
      await sendReceiptEmail({
        to: user.email,
        subject: `[BillCraft] ${title}`,
        htmlBody: `
          <div style="font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #10b981; font-weight: 800; font-size: 20px; margin-top: 0; margin-bottom: 12px; letter-spacing: -0.025em;">${title}</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px;">${body}</p>
            <p style="margin-bottom: 24px;">
              <a href="${invoiceLink}" style="display: inline-block; padding: 10px 18px; background-color: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px; shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
                View Payments Inbox
              </a>
            </p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.5;">
              This is an automated security notification from your BillCraft dashboard. Please check your bank records before approving manual payments.
            </p>
          </div>
        `,
        fromName: 'BillCraft Alerts',
        replyToEmail: 'noreply@billcraft.in'
      });
    } catch (emailErr) {
      console.error('[NOTIFICATIONS] Failed to send email alert:', emailErr);
    }
  }

  // 3. Send WhatsApp notification if user has phone linked
  if (user && user.phone) {
    try {
      const { sendWhatsAppMessage } = await import('./whatsapp/outbound');
      await sendWhatsAppMessage({
        to: user.phone,
        body: `🔔 *New Notification Alert!*\n\n*${title}*\n${body}`,
        userId: user.id
      });
    } catch (waErr: any) {
      console.error('[NOTIFICATIONS] Failed to send WhatsApp alert to user:', waErr.message);
    }
  }

  return notification;
}

