import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';



// Zod schema for client validation
const clientSchema = z.object({
  name: z.string().min(1, 'Client name is required'),
  gstin: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(''))
    .refine((val) => {
      if (!val) return true;
      return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(val);
    }, 'Invalid GSTIN format (15 characters, standard Indian format)'),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable().or(z.literal('')),
  billingAddress: z.string().optional().nullable().or(z.literal('')),
  billingCity: z.string().optional().nullable().or(z.literal('')),
  billingState: z.string().optional().nullable().or(z.literal('')),
  billingPincode: z.string().optional().nullable().or(z.literal('')),
  shippingAddress: z.string().optional().nullable().or(z.literal('')),
  shippingCity: z.string().optional().nullable().or(z.literal('')),
  shippingState: z.string().optional().nullable().or(z.literal('')),
  shippingPincode: z.string().optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable().or(z.literal('')),
  businessId: z.string().optional().nullable().or(z.literal('')),
});

// GET: List all clients (with optional search)
export async function GET(request: NextRequest) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');

    const searchCondition = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { gstin: { contains: search, mode: 'insensitive' as const } },
            { billingCity: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const clients = await prisma.client.findMany({
      where: {
        userId: user.id,
        ...searchCondition,
      },
      include: {
        _count: {
          select: { invoices: true },
        },
        invoices: {
          take: 5,
          orderBy: { issueDate: 'desc' },
          select: {
            id: true,
            invoiceNumber: true,
            grandTotal: true,
            status: true,
            issueDate: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ clients }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch clients' },
      { status: 550 }
    );
  }
}

// POST: Create a new client (supports single or bulk import)
export async function POST(request: NextRequest) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const body = await request.json();

    // Check for bulk import
    if (Array.isArray(body)) {
      // Validate bulk array
      const validatedList = z.array(clientSchema).parse(body);

      // Perform transaction to bulk import
      const createdClients = await prisma.$transaction(
        validatedList.map((client) =>
          prisma.client.create({
            data: {
              name: client.name,
              gstin: client.gstin || null,
              email: client.email || null,
              phone: client.phone || null,
              billingAddress: client.billingAddress || null,
              billingCity: client.billingCity || null,
              billingState: client.billingState || null,
              billingPincode: client.billingPincode || null,
              shippingAddress: client.shippingAddress || null,
              shippingCity: client.shippingCity || null,
              shippingState: client.shippingState || null,
              shippingPincode: client.shippingPincode || null,
              notes: client.notes || null,
              businessId: client.businessId || null,
              userId: user.id,
            },
          })
        )
      );

      return NextResponse.json({ clients: createdClients }, { status: 201 });
    }

    // Single client creation
    const validatedData = clientSchema.parse(body);
    const client = await prisma.client.create({
      data: {
        name: validatedData.name,
        gstin: validatedData.gstin || null,
        email: validatedData.email || null,
        phone: validatedData.phone || null,
        billingAddress: validatedData.billingAddress || null,
        billingCity: validatedData.billingCity || null,
        billingState: validatedData.billingState || null,
        billingPincode: validatedData.billingPincode || null,
        shippingAddress: validatedData.shippingAddress || null,
        shippingCity: validatedData.shippingCity || null,
        shippingState: validatedData.shippingState || null,
        shippingPincode: validatedData.shippingPincode || null,
        notes: validatedData.notes || null,
        businessId: validatedData.businessId || null,
        userId: user.id,
      },
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating client:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create client' },
      { status: 500 }
    );
  }
}

// PUT: Update an existing client
export async function PUT(request: NextRequest) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

    // Verify ownership
    const existingClient = await prisma.client.findUnique({
      where: { id },
    });

    if (!existingClient || existingClient.userId !== user.id) {
      return NextResponse.json(
        { error: 'Client not found or unauthorized' },
        { status: 404 }
      );
    }

    const validatedData = clientSchema.partial().parse(updateData);

    const updated = await prisma.client.update({
      where: { id },
      data: {
        name: validatedData.name,
        gstin: validatedData.gstin === '' ? null : validatedData.gstin,
        email: validatedData.email === '' ? null : validatedData.email,
        phone: validatedData.phone === '' ? null : validatedData.phone,
        billingAddress: validatedData.billingAddress === '' ? null : validatedData.billingAddress,
        billingCity: validatedData.billingCity === '' ? null : validatedData.billingCity,
        billingState: validatedData.billingState === '' ? null : validatedData.billingState,
        billingPincode: validatedData.billingPincode === '' ? null : validatedData.billingPincode,
        shippingAddress: validatedData.shippingAddress === '' ? null : validatedData.shippingAddress,
        shippingCity: validatedData.shippingCity === '' ? null : validatedData.shippingCity,
        shippingState: validatedData.shippingState === '' ? null : validatedData.shippingState,
        shippingPincode: validatedData.shippingPincode === '' ? null : validatedData.shippingPincode,
        notes: validatedData.notes === '' ? null : validatedData.notes,
        businessId: validatedData.businessId === '' ? null : validatedData.businessId,
      },
    });

    return NextResponse.json({ client: updated }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating client:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update client' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a client
export async function DELETE(request: NextRequest) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

    // Verify ownership
    const existingClient = await prisma.client.findUnique({
      where: { id },
    });

    if (!existingClient || existingClient.userId !== user.id) {
      return NextResponse.json(
        { error: 'Client not found or unauthorized' },
        { status: 404 }
      );
    }

    // Check if client has associated invoices
    const invoicesCount = await prisma.invoice.count({
      where: { clientId: id },
    });

    if (invoicesCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete client. This client has ${invoicesCount} associated invoice(s). Please delete their invoices first.`,
        },
        { status: 400 }
      );
    }

    await prisma.client.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete client' },
      { status: 500 }
    );
  }
}
