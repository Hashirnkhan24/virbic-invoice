import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';



const notificationsSchema = z.object({
  emailInvoiceSent: z.coerce.boolean(),
  emailPaymentReceived: z.coerce.boolean(),
  emailInvoiceOverdue: z.coerce.boolean(),
  emailWeeklySummary: z.coerce.boolean(),
  reminderOverdueEnabled: z.coerce.boolean(),
  reminderFrequencyDays: z.coerce.number().int().min(1),
  reminderMaxCount: z.coerce.number().int().min(1),
  reminderSubjectTemplate: z.string().optional(),
  reminderBodyTemplate: z.string().optional().nullable(),
});

export async function PUT(request: NextRequest) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const body = await request.json();

    // Validate inputs
    const validatedData = notificationsSchema.parse(body);

    // Update user notifications
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: validatedData,
    });

    return NextResponse.json({ user: updated }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating notifications settings:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message || 'Failed to update notification settings' }, { status: 500 });
  }
}
