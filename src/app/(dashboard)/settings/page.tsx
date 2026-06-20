import React from 'react';
import { prisma } from '@/lib/prisma';
import { getSubscription, createSubscription } from '@/lib/db/subscriptions';
import SettingsClient from '@/components/settings/SettingsClient';
import { getAuthUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function SettingsPage() {
  const { error, dbUser } = await getAuthUser();
  if (error || !dbUser) redirect('/sign-in');
  const user = dbUser;

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

  return (
    <SettingsClient
      user={serializableUser}
      subscription={serializableSubscription}
      businesses={serializableBusinesses}
    />
  );
}
