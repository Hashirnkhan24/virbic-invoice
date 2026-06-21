import { auth, currentUser } from '@clerk/nextjs/server';
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
    let email = '';
    let name = 'User';
    let avatar = '';

    try {
      const clerkUser = await currentUser();
      if (clerkUser) {
        email = clerkUser.emailAddresses?.[0]?.emailAddress || '';
        name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User';
        avatar = clerkUser.imageUrl || '';
      }
    } catch (clerkErr) {
      console.error('[AUTH HELPER] Failed to fetch user details from Clerk:', clerkErr);
    }

    let newUser;
    
    // Check if user already exists with this email address (to prevent duplicates/collisions)
    const existingUserByEmail = email ? await prisma.user.findUnique({ where: { email } }) : null;

    if (existingUserByEmail) {
      // If user exists by email, update their clerkId mapping
      newUser = await prisma.user.update({
        where: { id: existingUserByEmail.id },
        data: { clerkId: clerkUserId },
      });
    } else {
      // Create user record in DB
      newUser = await prisma.user.create({
        data: {
          clerkId: clerkUserId,
          email: email || `no-email-${clerkUserId}@virbic.com`, // safe unique fallback
          name,
          avatar,
        },
      });
    }

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

