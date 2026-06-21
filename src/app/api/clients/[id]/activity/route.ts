import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getClientActivity } from '@/lib/db/client-analytics';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const { id } = await params;

    const client = await prisma.client.findUnique({
      where: { id },
    });

    if (!client || client.userId !== user.id) {
      return NextResponse.json({ error: 'Client not found or unauthorized' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Number(searchParams.get('limit') || '20');

    const activities = await getClientActivity(id, user.id, limit);

    const serializedActivities = activities.map(act => ({
      ...act,
      amount: act.amount ? Number(act.amount) : null,
    }));

    return NextResponse.json({ activities: serializedActivities });
  } catch (err: any) {
    console.error('[CLIENT ACTIVITY GET]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
