import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ensureUniqueSlug, generatePortalSlug } from '@/lib/portal-utils';
import bcrypt from 'bcryptjs';

// POST /api/clients/[id]/portal
// Create portal for client
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const { id: clientId } = await params;

    // Check if client exists and belongs to user
    const client = await prisma.client.findFirst({
      where: { id: clientId, userId: user.id }
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Fetch default business for user branding
    const business = await prisma.business.findFirst({
      where: { userId: user.id, isDefault: true }
    }) || await prisma.business.findFirst({
      where: { userId: user.id }
    });

    const existingPortal = await prisma.clientPortal.findUnique({
      where: { clientId }
    });

    if (existingPortal) {
      return NextResponse.json({ error: 'Client portal already exists' }, { status: 400 });
    }

    const body = await request.json();
    const { slug, password, brandColor, logoUrl, title, showPaidInvoices, allowPdfDownload, allowPayment, showPaymentHistory } = body;

    let finalSlug = slug ? generatePortalSlug(slug) : generatePortalSlug(client.name);
    finalSlug = await ensureUniqueSlug(finalSlug);

    const hashedPassword = password && password.trim() ? bcrypt.hashSync(password, 10) : null;

    const portal = await prisma.clientPortal.create({
      data: {
        clientId,
        userId: user.id,
        slug: finalSlug,
        password: hashedPassword,
        brandColor: brandColor || business?.brandColor || '#10b981',
        logoUrl: logoUrl || business?.logo || null,
        title: title || `${business?.name || 'Client'} Portal`,
        showPaidInvoices: showPaidInvoices !== undefined ? showPaidInvoices : true,
        allowPdfDownload: allowPdfDownload !== undefined ? allowPdfDownload : true,
        allowPayment: allowPayment !== undefined ? allowPayment : true,
        showPaymentHistory: showPaymentHistory !== undefined ? showPaymentHistory : true,
        enabled: true
      }
    });

    // Log activity
    await prisma.clientActivity.create({
      data: {
        clientId,
        userId: user.id,
        action: 'PORTAL_CREATED',
        details: `Client portal created with slug: ${portal.slug}`
      }
    });

    return NextResponse.json(portal, { status: 201 });
  } catch (err: any) {
    console.error('[CLIENT_PORTAL_POST]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/clients/[id]/portal
// Update portal settings for client
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const { id: clientId } = await params;

    const portal = await prisma.clientPortal.findFirst({
      where: { clientId, userId: user.id }
    });

    if (!portal) {
      return NextResponse.json({ error: 'Client portal not found' }, { status: 404 });
    }

    const body = await request.json();
    const { slug, password, brandColor, logoUrl, title, showPaidInvoices, allowPdfDownload, allowPayment, showPaymentHistory, enabled, clearPassword } = body;

    let finalSlug = portal.slug;
    if (slug && slug !== portal.slug) {
      const cleanSlug = generatePortalSlug(slug);
      finalSlug = await ensureUniqueSlug(cleanSlug);
    }

    let hashedPassword = portal.password;
    if (clearPassword) {
      hashedPassword = null;
    } else if (password && password.trim()) {
      hashedPassword = bcrypt.hashSync(password, 10);
    }

    const updated = await prisma.clientPortal.update({
      where: { id: portal.id },
      data: {
        slug: finalSlug,
        password: hashedPassword,
        brandColor: brandColor !== undefined ? brandColor : undefined,
        logoUrl: logoUrl !== undefined ? logoUrl : undefined,
        title: title !== undefined ? title : undefined,
        showPaidInvoices: showPaidInvoices !== undefined ? showPaidInvoices : undefined,
        allowPdfDownload: allowPdfDownload !== undefined ? allowPdfDownload : undefined,
        allowPayment: allowPayment !== undefined ? allowPayment : undefined,
        showPaymentHistory: showPaymentHistory !== undefined ? showPaymentHistory : undefined,
        enabled: enabled !== undefined ? enabled : undefined
      }
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('[CLIENT_PORTAL_PUT]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/clients/[id]/portal
// Delete/disable portal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const { id: clientId } = await params;

    const portal = await prisma.clientPortal.findFirst({
      where: { clientId, userId: user.id }
    });

    if (!portal) {
      return NextResponse.json({ error: 'Client portal not found' }, { status: 404 });
    }

    await prisma.clientPortal.delete({
      where: { id: portal.id }
    });

    // Log activity
    await prisma.clientActivity.create({
      data: {
        clientId,
        userId: user.id,
        action: 'PORTAL_DELETED',
        details: `Client portal deleted`
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[CLIENT_PORTAL_DELETE]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
