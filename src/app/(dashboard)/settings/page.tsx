import React from 'react';
import { prisma } from '@/lib/prisma';
import { getSubscription, createSubscription } from '@/lib/db/subscriptions';
import SettingsClient from '@/components/settings/SettingsClient';
import { getAuthUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { seedSystemTemplates } from '@/lib/whatsapp/templates';

export default async function SettingsPage() {
  const { error, dbUser } = await getAuthUser();
  if (error || !dbUser) redirect('/sign-in');
  const user = dbUser;
  
  // Seed WhatsApp system templates
  await seedSystemTemplates();

  // Retrieve all businesses owned by user
  const businesses = await prisma.business.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
  });

  // Get or create subscription
  let subscription = await getSubscription(user.id);
  if (!subscription) {
    subscription = await createSubscription({
      userId: user.id,
      plan: 'FREE',
      invoicesLimit: 5,
    });
  }

  // Convert Decimals & Dates to serializable format for Client Components
  const serializableUser = {
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    emailInvoiceSent: user.emailInvoiceSent,
    emailPaymentReceived: user.emailPaymentReceived,
    emailInvoiceOverdue: user.emailInvoiceOverdue,
    emailWeeklySummary: user.emailWeeklySummary,
    reminderOverdueEnabled: user.reminderOverdueEnabled,
    reminderFrequencyDays: user.reminderFrequencyDays,
    reminderMaxCount: user.reminderMaxCount,
    reminderSubjectTemplate: user.reminderSubjectTemplate,
    reminderBodyTemplate: user.reminderBodyTemplate,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };

  const serializableSubscription = {
    id: subscription.id,
    userId: subscription.userId,
    plan: subscription.plan,
    status: subscription.status,
    invoicesUsed: subscription.invoicesUsed,
    invoicesLimit: subscription.invoicesLimit,
    razorpaySubscriptionId: subscription.razorpaySubscriptionId,
    razorpayCustomerId: subscription.razorpayCustomerId,
    currentPeriodStart: subscription.currentPeriodStart ? subscription.currentPeriodStart.toISOString() : null,
    currentPeriodEnd: subscription.currentPeriodEnd ? subscription.currentPeriodEnd.toISOString() : null,
    createdAt: subscription.createdAt.toISOString(),
    updatedAt: subscription.updatedAt.toISOString(),
  };

  const serializableBusinesses = businesses.map((biz) => ({
    id: biz.id,
    userId: biz.userId,
    name: biz.name,
    gstin: biz.gstin || '',
    pan: biz.pan || '',
    address: biz.address || '',
    city: biz.city || '',
    state: biz.state || '',
    pincode: biz.pincode || '',
    phone: biz.phone || '',
    email: biz.email || '',
    bankName: biz.bankName || '',
    accountNumber: biz.accountNumber || '',
    ifscCode: biz.ifscCode || '',
    upiId: biz.upiId || '',
    logo: biz.logo || '',
    signature: biz.signature || '',
    brandColor: biz.brandColor,
    invoicePrefix: biz.invoicePrefix,
    invoiceNumber: biz.invoiceNumber,
    financialYear: biz.financialYear,
    isDefault: biz.isDefault,
    defaultTemplate: biz.defaultTemplate,
    defaultTerms: biz.defaultTerms || '',
    defaultNotes: biz.defaultNotes || '',
    defaultDueDateDays: biz.defaultDueDateDays,
    defaultGstRate: Number(biz.defaultGstRate),
    defaultPlaceOfSupply: biz.defaultPlaceOfSupply || '',
    currency: biz.currency,
    createdAt: biz.createdAt.toISOString(),
    updatedAt: biz.updatedAt.toISOString(),
  }));

  // Retrieve reminder templates
  const reminderTemplates = await prisma.reminderTemplate.findMany({
    where: { userId: user.id },
    orderBy: { stage: 'asc' },
  });

  // Retrieve last 50 reminder logs
  const reminderLogs = await prisma.reminderLog.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      invoice: true,
      client: true,
    },
  });

  const serializableTemplates = reminderTemplates.map((t: any) => ({
    id: t.id,
    userId: t.userId,
    stage: t.stage,
    tone: t.tone,
    subject: t.subject,
    body: t.body,
    daysAfterDue: t.daysAfterDue,
    daysAfterLast: t.daysAfterLast,
    sendEmail: t.sendEmail,
    generateWaMsg: t.generateWaMsg,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  const serializableLogs = reminderLogs.map((log: any) => ({
    id: log.id,
    invoiceId: log.invoiceId,
    userId: log.userId,
    clientId: log.clientId,
    stage: log.stage,
    templateId: log.templateId || '',
    channel: log.channel,
    content: log.content,
    triggeredBy: log.triggeredBy || 'schedule',
    createdAt: log.createdAt.toISOString(),
    invoiceNumber: log.invoice.invoiceNumber,
    clientName: log.client.name,
  }));

  // Get or create preferences
  let preferences = await prisma.userPreference.findUnique({
    where: { userId: user.id },
  });

  if (!preferences) {
    preferences = await prisma.userPreference.create({
      data: {
        userId: user.id,
        confirmationChannel: 'both',
        autoConfirmation: true,
        includeReceiptPdf: true,
      },
    });
  }

  const serializablePreferences = {
    id: preferences.id,
    userId: preferences.userId,
    confirmationChannel: preferences.confirmationChannel,
    autoConfirmation: preferences.autoConfirmation,
    includeReceiptPdf: preferences.includeReceiptPdf,
    // WhatsApp settings
    whatsAppEnabled: preferences.whatsAppEnabled,
    whatsAppProvider: preferences.whatsAppProvider,
    twilioAccountSid: preferences.twilioAccountSid || '',
    twilioAuthToken: preferences.twilioAuthToken || '',
    twilioWhatsAppNumber: preferences.twilioWhatsAppNumber || '',
    metaAccessToken: preferences.metaAccessToken || '',
    metaPhoneNumberId: preferences.metaPhoneNumberId || '',
    // Portal defaults
    portalEnabledDefault: preferences.portalEnabledDefault,
    portalAutoCreate: preferences.portalAutoCreate,
    portalPasswordDefault: preferences.portalPasswordDefault,
    portalUseBusinessBranding: preferences.portalUseBusinessBranding,
    portalBrandColorDefault: preferences.portalBrandColorDefault,
    portalTitleDefault: preferences.portalTitleDefault,
    portalShowPaidDefault: preferences.portalShowPaidDefault,
    portalAllowPdfDefault: preferences.portalAllowPdfDefault,
    portalAllowPaymentDefault: preferences.portalAllowPaymentDefault,
    portalShowHistoryDefault: preferences.portalShowHistoryDefault,
    upiAutoApproveEnabled: preferences.upiAutoApproveEnabled,
    upiAutoApproveHours: preferences.upiAutoApproveHours,
  };

  // Fetch clients with portal info
  const clientsWithPortals = await prisma.client.findMany({
    where: { userId: user.id, isDeleted: false },
    include: {
      portal: true,
    },
    orderBy: { name: 'asc' },
  });

  const serializableClients = clientsWithPortals.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email || '',
    phone: c.phone || '',
    portal: c.portal
      ? {
          id: c.portal.id,
          slug: c.portal.slug,
          enabled: c.portal.enabled,
          hasPassword: !!c.portal.password,
          brandColor: c.portal.brandColor,
          logoUrl: c.portal.logoUrl,
          title: c.portal.title,
          showPaidInvoices: c.portal.showPaidInvoices,
          allowPdfDownload: c.portal.allowPdfDownload,
          allowPayment: c.portal.allowPayment,
          showPaymentHistory: c.portal.showPaymentHistory,
        }
      : null,
  }));

  return (
    <SettingsClient
      user={serializableUser}
      subscription={serializableSubscription}
      businesses={serializableBusinesses}
      initialTemplates={serializableTemplates}
      initialLogs={serializableLogs}
      initialPreferences={serializablePreferences}
      initialClients={serializableClients}
    />
  );
}
