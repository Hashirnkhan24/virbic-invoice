import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

const itemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional().nullable().or(z.literal('')),
  hsnCode: z.string().optional().nullable().or(z.literal('')),
  rate: z.coerce.number().min(0, 'Rate must be greater than or equal to 0'),
  gstRate: z.coerce.number().default(18.00),
  unit: z.string().default('PCS'),
  isService: z.boolean().default(true),
  businessId: z.string().optional().nullable().or(z.literal('')),
});

// PUT: Update an item in the catalog
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;

    const body = await request.json();
    const validatedData = itemSchema.parse(body);

    // Verify ownership and update
    const updatedItem = await prisma.item.update({
      where: {
        id,
        userId: user.id,
      },
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
        hsnCode: validatedData.hsnCode || null,
        rate: validatedData.rate,
        gstRate: validatedData.gstRate,
        unit: validatedData.unit,
        isService: validatedData.isService,
        businessId: validatedData.businessId || null,
      },
    });

    return NextResponse.json({ item: updatedItem }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating catalog item:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update item' },
      { status: 500 }
    );
  }
}

// DELETE: Remove an item from the catalog
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;

    // Verify ownership and delete
    await prisma.item.delete({
      where: {
        id,
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true, message: 'Item deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting catalog item:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete item' },
      { status: 500 }
    );
  }
}
