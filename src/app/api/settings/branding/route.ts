import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';



const brandingSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  defaultTemplate: z.string().min(1),
  brandColor: z.string().min(4),
  logo: z.string().optional().nullable(),
  signature: z.string().optional().nullable(),
  defaultTerms: z.string().optional().nullable(),
  defaultNotes: z.string().optional().nullable(),
});

export async function PUT(request: NextRequest) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const body = await request.json();

    // Validate inputs
    const validatedData = brandingSchema.parse(body);

    const { businessId, ...updateData } = validatedData;

    // Verify ownership
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business || business.userId !== user.id) {
      return NextResponse.json({ error: 'Business not found or unauthorized' }, { status: 404 });
    }

    // Update branding fields
    const updated = await prisma.business.update({
      where: { id: businessId },
      data: updateData,
    });

    return NextResponse.json({ business: updated }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating branding settings:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message || 'Failed to update branding settings' }, { status: 500 });
  }
}
