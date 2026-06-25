import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { startOfMonth } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status') || 'pending';
    const clientIdParam = searchParams.get('clientId') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build filter query
    const whereQuery: any = {
      userId: user.id,
    };

    if (clientIdParam) {
      whereQuery.invoice = {
        clientId: clientIdParam,
      };
    }

    if (statusParam !== 'all') {
      if (statusParam === 'pending') {
        whereQuery.status = 'PENDING';
      } else if (statusParam === 'approved') {
        whereQuery.status = 'APPROVED';
      } else if (statusParam === 'rejected') {
        whereQuery.status = 'REJECTED';
      } else if (statusParam === 'auto_approved') {
        whereQuery.status = 'AUTO_APPROVED';
      }
    }

    // Fetch proofs with pagination
    const proofs = await prisma.paymentProof.findMany({
      where: whereQuery,
      include: {
        invoice: {
          include: {
            client: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
      skip,
      take: limit,
    });

    const total = await prisma.paymentProof.count({
      where: whereQuery,
    });

    // Calculate Stats
    const pendingCount = await prisma.paymentProof.count({
      where: {
        userId: user.id,
        status: 'PENDING',
      },
    });

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const autoApprovingSoonCount = await prisma.paymentProof.count({
      where: {
        userId: user.id,
        status: 'PENDING',
        autoApproveAt: {
          lte: tomorrow,
          not: null,
        },
      },
    });

    const monthStart = startOfMonth(new Date());
    const approvedThisMonth = await prisma.paymentProof.aggregate({
      where: {
        userId: user.id,
        status: { in: ['APPROVED', 'AUTO_APPROVED'] },
        verifiedAt: {
          gte: monthStart,
        },
      },
      _sum: {
        amountPaid: true,
      },
    });

    const totalApprovedThisMonth = Number(approvedThisMonth._sum.amountPaid || 0);

    return NextResponse.json({
      proofs,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
      stats: {
        pendingCount,
        autoApprovingSoonCount,
        totalApprovedThisMonth,
      },
    });
  } catch (err: any) {
    console.error('[PAYMENTS_INBOX_GET_API] Error fetching inbox:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
