import { prisma } from '../prisma';
import { Plan, Prisma, SubscriptionStatus } from '@prisma/client';

// Get user's current subscription record
export async function getSubscription(userId: string) {
  return prisma.subscription.findUnique({
    where: { userId },
  });
}

// Check if user is allowed to create a new invoice based on their current plan limits
export async function canCreateInvoice(userId: string): Promise<boolean> {
  const subscription = await getSubscription(userId);

  // If no subscription record, create a default FREE tier subscription
  if (!subscription) {
    const defaultSub = await createSubscription({
      userId,
      plan: 'FREE',
      invoicesLimit: 5,
    });
    return defaultSub.invoicesUsed < defaultSub.invoicesLimit;
  }

  // If the limit is -1, it means unlimited invoices (Pro / Enterprise tiers)
  if (subscription.invoicesLimit === -1) {
    return true;
  }

  return subscription.invoicesUsed < subscription.invoicesLimit;
}

// Increment user's invoice count by 1 (used upon creation of a new invoice)
export async function incrementInvoiceCount(userId: string) {
  return prisma.subscription.update({
    where: { userId },
    data: {
      invoicesUsed: {
        increment: 1,
      },
    },
  });
}

// Create a new subscription record
export async function createSubscription(data: {
  userId: string;
  plan?: Plan;
  status?: SubscriptionStatus;
  invoicesUsed?: number;
  invoicesLimit?: number;
  razorpaySubscriptionId?: string;
  razorpayCustomerId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
}) {
  return prisma.subscription.create({
    data: {
      userId: data.userId,
      plan: data.plan ?? 'FREE',
      status: data.status ?? 'ACTIVE',
      invoicesUsed: data.invoicesUsed ?? 0,
      invoicesLimit: data.invoicesLimit ?? 5,
      razorpaySubscriptionId: data.razorpaySubscriptionId,
      razorpayCustomerId: data.razorpayCustomerId,
      currentPeriodStart: data.currentPeriodStart,
      currentPeriodEnd: data.currentPeriodEnd,
    },
  });
}

// Update subscription details (used for plan upgrades / renewals)
export async function updateSubscription(
  id: string,
  data: Partial<Omit<Prisma.SubscriptionUncheckedUpdateInput, 'id' | 'userId'>>
) {
  return prisma.subscription.update({
    where: { id },
    data,
  });
}
