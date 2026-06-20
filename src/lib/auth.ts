import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * Server-side auth helper for API routes.
 * Gets the authenticated Clerk user and their corresponding DB record.
 * Returns a 401 response helper if unauthenticated.
 */
export async function getAuthUser() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), dbUser: null, clerkUserId: null };
  }

  // Look up the DB user by their Clerk ID
  const dbUser = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
  });

  if (!dbUser) {
    // User exists in Clerk but not in DB yet — create them on the fly
    // This handles cases where the webhook hasn't fired yet
    const newUser = await prisma.user.create({
      data: {
        clerkId: clerkUserId,
        email: '',
        name: 'User',
        avatar: '',
      },
    });

    // Also create a default FREE subscription
    await prisma.subscription.upsert({
      where: { userId: newUser.id },
      create: {
        userId: newUser.id,
        plan: 'FREE',
        status: 'ACTIVE',
        invoicesUsed: 0,
        invoicesLimit: 5,
      },
      update: {},
    });

    return { error: null, dbUser: newUser, clerkUserId };
  }

  return { error: null, dbUser, clerkUserId };
}
