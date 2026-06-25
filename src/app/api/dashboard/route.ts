import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getCollectionDashboardMetrics } from '@/lib/db/collection-analytics';
import { getViewAnalytics } from '@/lib/view-intelligence';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error || !dbUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawBusinessId = searchParams.get('businessId');
    let businessId: string | undefined = undefined;
    if (rawBusinessId) {
      const cleaned = rawBusinessId.replace(/^"|"$/g, '');
      if (cleaned !== 'null' && cleaned !== 'undefined') {
        businessId = cleaned;
      }
    }

    const metrics = await getCollectionDashboardMetrics(dbUser.id, businessId);
    const viewAnalytics = await getViewAnalytics(dbUser.id, businessId);

    return NextResponse.json({
      ...metrics,
      viewAnalytics,
    });
  } catch (err: any) {
    console.error('[DASHBOARD API GET]', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
