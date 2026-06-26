import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { DEFAULT_REMINDER_TEMPLATES } from './reminder-defaults';

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

    // Seed default user preferences
    await prisma.userPreference.upsert({
      where: { userId: newUser.id },
      create: {
        userId: newUser.id,
        confirmationChannel: 'both',
        autoConfirmation: true,
        includeReceiptPdf: true,
      },
      update: {},
    });

    // Seed default reminder templates
    for (const t of DEFAULT_REMINDER_TEMPLATES) {
      await prisma.reminderTemplate.upsert({
        where: {
          userId_stage: {
            userId: newUser.id,
            stage: t.stage,
          },
        },
        create: {
          userId: newUser.id,
          stage: t.stage,
          tone: t.tone,
          subject: t.subject,
          body: t.body,
          daysAfterDue: t.daysAfterDue,
          daysAfterLast: t.daysAfterLast,
          sendEmail: t.sendEmail,
          generateWaMsg: t.generateWaMsg,
          isDefault: false,
        },
        update: {},
      });
    }

    return { error: null, dbUser: newUser, clerkUserId };
  }

  return { error: null, dbUser, clerkUserId };
}

