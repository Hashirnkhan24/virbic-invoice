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

// GET: List all clients (with optional search, sorting, and filters)
export async function GET(request: NextRequest) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    let businessId = searchParams.get('businessId');
    if (businessId) {
      businessId = businessId.replace(/^"|"$/g, '');
      if (businessId === 'null' || businessId === 'undefined') {
        businessId = null;
      }
    }

    const includeDeleted = searchParams.get('includeDeleted') === 'true';
    const minOutstanding = searchParams.get('minOutstanding') === 'true';
    const sortBy = searchParams.get('sortBy');

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

    const businessCondition = (businessId && businessId !== 'all')
      ? {
          OR: [
            { businessId: businessId },
            { businessId: null },
            { invoices: { some: { businessId: businessId } } },
          ],
        }
      : {};

    const isDeletedCondition = includeDeleted ? {} : { isDeleted: false };
    
    // If business-scoped, we apply minOutstanding and sorting in memory to ensure accuracy
    const isScoped = businessId && businessId !== 'all';
    const dbOutstandingCondition = (minOutstanding && !isScoped) ? { totalOutstanding: { gt: 0 } } : {};
    
    let dbOrderBy: any = { name: 'asc' };
    if (!isScoped) {
      if (sortBy === 'revenue') {
        dbOrderBy = { totalBilled: 'desc' };
      } else if (sortBy === 'outstanding') {
        dbOrderBy = { totalOutstanding: 'desc' };
      } else if (sortBy === 'recent') {
        dbOrderBy = { lastInvoiceDate: 'desc' };
      } else if (sortBy === 'name') {
        dbOrderBy = { name: 'asc' };
      }
    }

    const rawClients = await prisma.client.findMany({
      where: {
        userId: user.id,
        ...businessCondition,
        ...searchCondition,
        ...isDeletedCondition,
        ...dbOutstandingCondition,
      },
      include: {
        _count: {
          select: { invoices: true },
        },
        invoices: {
          where: isScoped ? { businessId: businessId as string } : {},
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
      orderBy: dbOrderBy,
    });

    let clients = rawClients.map(c => ({
      ...c,
      totalBilled: Number(c.totalBilled),
      totalOutstanding: Number(c.totalOutstanding),
    }));

    if (isScoped && businessId) {
      const activeBizId = businessId;
      // Fetch dynamic metrics for all clients for this business
      const [paidAgg, outstandingAgg, totalAgg] = await Promise.all([
        prisma.invoice.groupBy({
          by: ['clientId'],
          where: {
            userId: user.id,
            businessId: activeBizId,
            status: 'PAID',
          },
          _sum: { grandTotal: true },
        }),
        prisma.invoice.groupBy({
          by: ['clientId'],
          where: {
            userId: user.id,
            businessId: activeBizId,
            status: { in: ['SENT', 'OVERDUE', 'PARTIAL'] },
          },
          _sum: { grandTotal: true },
        }),
        prisma.invoice.groupBy({
          by: ['clientId'],
          where: {
            userId: user.id,
            businessId: activeBizId,
          },
          _count: { id: true },
          _max: { issueDate: true },
        }),
      ]);

      const paidMap = new Map(paidAgg.map(item => [item.clientId, Number((item as any)._sum?.grandTotal || 0)]));
      const outstandingMap = new Map(outstandingAgg.map(item => [item.clientId, Number((item as any)._sum?.grandTotal || 0)]));
      const totalMap = new Map(totalAgg.map(item => [item.clientId, {
        count: Number((item as any)._count?.id || (item as any)._count?._all || 0),
        lastDate: (item as any)._max?.issueDate || null,
      }]));

      clients = clients.map(client => {
        const billed = paidMap.get(client.id) || 0;
        const outstanding = outstandingMap.get(client.id) || 0;
        const totals = totalMap.get(client.id) || { count: 0, lastDate: null };

        return {
          ...client,
          totalBilled: billed,
          totalOutstanding: outstanding,
          invoiceCount: totals.count,
          lastInvoiceDate: totals.lastDate,
        };
      });

      // Filter by minOutstanding in memory
      if (minOutstanding) {
        clients = clients.filter(c => c.totalOutstanding > 0);
      }

      // Sort in memory
      if (sortBy === 'revenue') {
        clients.sort((a, b) => b.totalBilled - a.totalBilled);
      } else if (sortBy === 'outstanding') {
        clients.sort((a, b) => b.totalOutstanding - a.totalOutstanding);
      } else if (sortBy === 'recent') {
        clients.sort((a, b) => {
          const dateA = a.lastInvoiceDate ? new Date(a.lastInvoiceDate).getTime() : 0;
          const dateB = b.lastInvoiceDate ? new Date(b.lastInvoiceDate).getTime() : 0;
          return dateB - dateA;
        });
      } else {
        // default by name
        clients.sort((a, b) => a.name.localeCompare(b.name));
      }
    }

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
      // Soft-delete
      await prisma.client.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });
      return NextResponse.json({ success: true, isSoftDeleted: true, message: 'Client soft-deleted (archived) successfully' }, { status: 200 });
    }

    await prisma.client.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, isSoftDeleted: false, message: 'Client deleted permanently' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete client' },
      { status: 500 }
    );
  }
}
