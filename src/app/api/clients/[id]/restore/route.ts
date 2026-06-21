import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logClientActivity } from '@/lib/db/client-analytics';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const { id } = await params;

    const client = await prisma.client.findFirst({
      where: { id, userId: user.id },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const updated = await prisma.client.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
      },
    });

    // Log activity
    await logClientActivity({
      clientId: id,
      userId: user.id,
      action: 'CLIENT_RESTORED',
      details: `Client restored from archive`,
    });

    return NextResponse.json({ success: true, client: updated }, { status: 200 });
  } catch (err: any) {
    console.error('[CLIENT RESTORE PUT]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
