import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  createBusiness,
  getBusinessesByUser,
  updateBusiness,
} from '@/lib/db/queries';
import { getAuthUser } from '@/lib/auth';



// Zod schemas for validation
const businessSchema = z.object({
  name: z.string().min(1, 'Business name is required'),
  gstin: z
    .string()
    .optional()
    .nullable()
    .refine((val) => {
      if (!val) return true;
      return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(val);
    }, 'Invalid GSTIN format (15 characters, standard Indian format)'),
  pan: z
    .string()
    .optional()
    .nullable()
    .refine((val) => {
      if (!val) return true;
      return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(val);
    }, 'Invalid PAN format (10 characters, e.g., ABCDE1234F)'),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  bankName: z.string().optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  ifscCode: z.string().optional().nullable(),
  upiId: z
    .string()
    .optional()
    .nullable()
    .refine((val) => {
      if (!val) return true;
      return val.includes('@');
    }, 'Invalid UPI ID (must contain @)'),
  logo: z.string().optional().nullable(),
  signature: z.string().optional().nullable(),
  brandColor: z.string().default('#10b981'),
  invoicePrefix: z.string().max(10, 'Prefix must be 10 characters or less').default('INV'),
  invoiceNumber: z.number().int().nonnegative().default(1),
  financialYear: z.string().default('2026-27'),
  isDefault: z.boolean().default(false),
});

// GET: List all business profiles for the user
export async function GET() {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const businesses = await getBusinessesByUser(user.id);
    return NextResponse.json({ businesses }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching businesses:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch businesses' },
      { status: 500 }
    );
  }
}

// POST: Create a new business profile
export async function POST(request: NextRequest) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const body = await request.json();
    
    // Validate inputs
    const validatedData = businessSchema.parse(body);

    // If it's the first business, force it to be default
    const existingCount = await prisma.business.count({
      where: { userId: user.id },
    });
    const isDefault = existingCount === 0 ? true : validatedData.isDefault;

    // If setting this business as default, unset existing default businesses
    if (isDefault) {
      await prisma.business.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const business = await createBusiness({
      ...validatedData,
      userId: user.id,
      isDefault,
    });

    return NextResponse.json({ business }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating business:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create business profile' },
      { status: 500 }
    );
  }
}

// PUT: Update an existing business profile
export async function PUT(request: NextRequest) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    // Verify ownership
    const businessObj = await prisma.business.findUnique({
      where: { id },
    });

    if (!businessObj || businessObj.userId !== user.id) {
      return NextResponse.json({ error: 'Business profile not found or unauthorized' }, { status: 404 });
    }

    // Validate inputs
    const validatedData = businessSchema.partial().parse(updateData);

    // If setting this business as default, unset existing default businesses
    if (validatedData.isDefault) {
      await prisma.business.updateMany({
        where: { userId: user.id, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updated = await updateBusiness(id, {
      ...validatedData,
      // If email is empty string, save as null
      email: validatedData.email === '' ? null : validatedData.email,
    });

    return NextResponse.json({ business: updated }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating business:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update business profile' },
      { status: 500 }
    );
  }
}
