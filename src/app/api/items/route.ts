import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';



// Zod schema for catalog item validation
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

// GET: Fetch catalog items (supports searching by name or HSN)
export async function GET(request: NextRequest) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    let businessId = searchParams.get('businessId');
    if (businessId) {
      businessId = businessId.replace(/^"|"$/g, '');
      if (businessId === 'null' || businessId === 'undefined') {
        businessId = null;
      }
    }

    const searchCondition = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { hsnCode: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const businessCondition = (businessId && businessId !== 'all')
      ? {
          OR: [
            { businessId: businessId },
            { businessId: null },
          ],
        }
      : {};

    const items = await prisma.item.findMany({
      where: {
        userId: user.id,
        ...businessCondition,
        ...searchCondition,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ items }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching catalog items:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch items' },
      { status: 500 }
    );
  }
}

// POST: Add a new item to catalog
export async function POST(request: NextRequest) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const body = await request.json();
    
    const validatedData = itemSchema.parse(body);

    const newItem = await prisma.item.create({
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
        hsnCode: validatedData.hsnCode || null,
        rate: validatedData.rate,
        gstRate: validatedData.gstRate,
        unit: validatedData.unit,
        isService: validatedData.isService,
        businessId: validatedData.businessId || null,
        userId: user.id,
      },
    });

    return NextResponse.json({ item: newItem }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating catalog item:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create item' },
      { status: 500 }
    );
  }
}
