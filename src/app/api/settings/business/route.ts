import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { updateBusiness } from '@/lib/db/queries';
import { getAuthUser } from '@/lib/auth';



const businessUpdateSchema = z.object({
  name: z.string().min(1, 'Business name is required'),
  gstin: z.string().optional().nullable().or(z.literal('')),
  pan: z.string().optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable().or(z.literal('')),
  city: z.string().optional().nullable().or(z.literal('')),
  state: z.string().optional().nullable().or(z.literal('')),
  pincode: z.string().optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  bankName: z.string().optional().nullable().or(z.literal('')),
  accountNumber: z.string().optional().nullable().or(z.literal('')),
  ifscCode: z.string().optional().nullable().or(z.literal('')),
  upiId: z.string().optional().nullable().or(z.literal('')),
  logo: z.string().optional().nullable().or(z.literal('')),
  signature: z.string().optional().nullable().or(z.literal('')),
  brandColor: z.string().optional(),
  invoicePrefix: z.string().optional(),
  invoiceNumber: z.coerce.number().int().optional(),
  financialYear: z.string().optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const body = await request.json();
    const { action, id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    // Verify ownership
    const business = await prisma.business.findUnique({ where: { id } });
    if (!business || business.userId !== user.id) {
      return NextResponse.json({ error: 'Business not found or unauthorized' }, { status: 404 });
    }

    if (action === 'setDefault') {
      // Unset previous defaults
      await prisma.business.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });

      // Set this as default
      const updated = await prisma.business.update({
        where: { id },
        data: { isDefault: true },
      });

      return NextResponse.json({ business: updated }, { status: 200 });
    }

    // Otherwise, perform full update
    const validatedData = businessUpdateSchema.parse(data);
    const updated = await updateBusiness(id, {
      ...validatedData,
      email: validatedData.email === '' ? null : validatedData.email,
    });

    return NextResponse.json({ business: updated }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating business settings:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message || 'Failed to update business' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    // Verify ownership
    const business = await prisma.business.findUnique({ where: { id } });
    if (!business || business.userId !== user.id) {
      return NextResponse.json({ error: 'Business not found or unauthorized' }, { status: 404 });
    }

    const wasDefault = business.isDefault;

    // Delete business
    await prisma.business.delete({ where: { id } });

    // If it was default, make another one default if exists
    if (wasDefault) {
      const remaining = await prisma.business.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      });
      if (remaining) {
        await prisma.business.update({
          where: { id: remaining.id },
          data: { isDefault: true },
        });
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting business:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete business' }, { status: 500 });
  }
}
