import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';



const defaultsSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  defaultDueDateDays: z.number().int().min(0),
  defaultGstRate: z.number().min(0).max(100),
  defaultPlaceOfSupply: z.string().optional().nullable(),
  invoicePrefix: z.string().max(10),
  invoiceNumber: z.number().int().min(1),
  currency: z.string().min(1),
});

export async function PUT(request: NextRequest) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const body = await request.json();

    // Validate inputs
    const validatedData = defaultsSchema.parse(body);

    const { businessId, ...updateData } = validatedData;

    // Verify ownership
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business || business.userId !== user.id) {
      return NextResponse.json({ error: 'Business not found or unauthorized' }, { status: 404 });
    }

    // Update defaults
    const updated = await prisma.business.update({
      where: { id: businessId },
      data: {
        ...updateData,
        defaultGstRate: updateData.defaultGstRate,
      },
    });

    return NextResponse.json({ business: updated }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating defaults settings:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message || 'Failed to update default settings' }, { status: 500 });
  }
}
