import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('CLERK_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  // Get Svix headers for signature verification
  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  // Read the raw body
  const payload = await req.text();

  // Verify the webhook signature
  const wh = new Webhook(webhookSecret);
  let event: WebhookEvent;

  try {
    event = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle events
  const eventType = event.type;

  try {
    if (eventType === 'user.created') {
      const { id: clerkId, email_addresses, first_name, last_name, image_url } = event.data;
      const primaryEmail = email_addresses.find((e) => e.id === event.data.primary_email_address_id);
      const email = primaryEmail?.email_address ?? '';
      const name = [first_name, last_name].filter(Boolean).join(' ') || 'User';
      const avatar = image_url ?? '';

      // Create user in DB
      const user = await prisma.user.upsert({
        where: { clerkId },
        create: {
          clerkId,
          email,
          name,
          avatar,
        },
        update: {
          email,
          name,
          avatar,
        },
      });

      // Create FREE subscription for new users
      await prisma.subscription.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          plan: 'FREE',
          status: 'ACTIVE',
          invoicesUsed: 0,
          invoicesLimit: 5,
        },
        update: {},
      });

      console.log(`✅ Created user ${clerkId} (${email}) and FREE subscription`);
    }

    else if (eventType === 'user.updated') {
      const { id: clerkId, email_addresses, first_name, last_name, image_url } = event.data;
      const primaryEmail = email_addresses.find((e) => e.id === event.data.primary_email_address_id);
      const email = primaryEmail?.email_address ?? '';
      const name = [first_name, last_name].filter(Boolean).join(' ') || 'User';
      const avatar = image_url ?? '';

      await prisma.user.update({
        where: { clerkId },
        data: { email, name, avatar },
      });

      console.log(`✅ Updated user ${clerkId}`);
    }

    else if (eventType === 'user.deleted') {
      const { id: clerkId } = event.data;
      if (!clerkId) {
        return NextResponse.json({ received: true });
      }

      const user = await prisma.user.findUnique({ where: { clerkId } });
      if (user) {
        // Cascade delete all user data — Prisma handles relations via onDelete: Cascade
        await prisma.user.delete({ where: { clerkId } });
        console.log(`✅ Deleted user ${clerkId} and all their data`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
