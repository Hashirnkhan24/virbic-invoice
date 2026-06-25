import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { DEFAULT_REMINDER_TEMPLATES } from '@/lib/reminder-defaults';

const templateSchema = z.object({
  stage: z.number().int().min(1).max(4),
  tone: z.string(),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  daysAfterDue: z.coerce.number().int().nonnegative(),
  daysAfterLast: z.coerce.number().int().nonnegative(),
  sendEmail: z.boolean(),
  generateWaMsg: z.boolean(),
});

const putSchema = z.object({
  templates: z.array(templateSchema).optional(),
  reset: z.boolean().optional(),
});

export async function GET() {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;

    let templates = await prisma.reminderTemplate.findMany({
      where: { userId: user.id },
      orderBy: { stage: 'asc' },
    });

    // If no templates exist yet (e.g. legacy user), seed and return them
    if (templates.length === 0) {
      const seeded = [];
      for (const t of DEFAULT_REMINDER_TEMPLATES) {
        const template = await prisma.reminderTemplate.create({
          data: {
            userId: user.id,
            stage: t.stage,
            tone: t.tone,
            subject: t.subject,
            body: t.body,
            daysAfterDue: t.daysAfterDue,
            daysAfterLast: t.daysAfterLast,
            sendEmail: t.sendEmail,
            generateWaMsg: t.generateWaMsg,
          },
        });
        seeded.push(template);
      }
      templates = seeded;
    }

    return NextResponse.json({ templates }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching reminder templates:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    
    const body = await request.json();
    const { templates, reset } = putSchema.parse(body);

    if (reset) {
      // Reset by upserting the system defaults
      const results = [];
      for (const t of DEFAULT_REMINDER_TEMPLATES) {
        const updated = await prisma.reminderTemplate.upsert({
          where: {
            userId_stage: {
              userId: user.id,
              stage: t.stage,
            },
          },
          create: {
            userId: user.id,
            stage: t.stage,
            tone: t.tone,
            subject: t.subject,
            body: t.body,
            daysAfterDue: t.daysAfterDue,
            daysAfterLast: t.daysAfterLast,
            sendEmail: t.sendEmail,
            generateWaMsg: t.generateWaMsg,
          },
          update: {
            tone: t.tone,
            subject: t.subject,
            body: t.body,
            daysAfterDue: t.daysAfterDue,
            daysAfterLast: t.daysAfterLast,
            sendEmail: t.sendEmail,
            generateWaMsg: t.generateWaMsg,
          },
        });
        results.push(updated);
      }
      return NextResponse.json({ success: true, templates: results }, { status: 200 });
    }

    if (templates) {
      const results = [];
      for (const t of templates) {
        const updated = await prisma.reminderTemplate.upsert({
          where: {
            userId_stage: {
              userId: user.id,
              stage: t.stage,
            },
          },
          create: {
            userId: user.id,
            stage: t.stage,
            tone: t.tone,
            subject: t.subject,
            body: t.body,
            daysAfterDue: t.daysAfterDue,
            daysAfterLast: t.daysAfterLast,
            sendEmail: t.sendEmail,
            generateWaMsg: t.generateWaMsg,
          },
          update: {
            tone: t.tone,
            subject: t.subject,
            body: t.body,
            daysAfterDue: t.daysAfterDue,
            daysAfterLast: t.daysAfterLast,
            sendEmail: t.sendEmail,
            generateWaMsg: t.generateWaMsg,
          },
        });
        results.push(updated);
      }
      return NextResponse.json({ success: true, templates: results }, { status: 200 });
    }

    return NextResponse.json({ error: 'No operation provided' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating reminder templates:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message || 'Failed to update reminder templates' }, { status: 500 });
  }
}
