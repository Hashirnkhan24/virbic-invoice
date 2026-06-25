import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Simple in-memory rate limiting map: ip -> Array of timestamps of attempts
const attemptsMap = new Map<string, number[]>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const attempts = attemptsMap.get(ip) || [];
  
  // Filter attempts to only keep ones in the last 10 minutes
  const activeAttempts = attempts.filter(timestamp => now - timestamp < WINDOW_MS);
  attemptsMap.set(ip, activeAttempts);

  return activeAttempts.length >= MAX_ATTEMPTS;
}

function recordAttempt(ip: string) {
  const attempts = attemptsMap.get(ip) || [];
  attempts.push(Date.now());
  attemptsMap.set(ip, attempts);
}

// POST /api/portal/[slug]/verify
// Public endpoint to verify portal password
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

    if (isRateLimited(ip)) {
      return NextResponse.json({
        error: 'Too many login attempts. Please try again in 10 minutes.'
      }, { status: 429 });
    }

    const portal = await prisma.clientPortal.findUnique({
      where: { slug }
    });

    if (!portal || !portal.enabled) {
      return NextResponse.json({ error: 'Portal not found' }, { status: 404 });
    }

    if (!portal.password) {
      return NextResponse.json({ valid: true });
    }

    const body = await request.json();
    const { password } = body;

    if (!password) {
      recordAttempt(ip);
      return NextResponse.json({ valid: false, error: 'Password required' }, { status: 400 });
    }

    const isValid = bcrypt.compareSync(password, portal.password);

    if (!isValid) {
      recordAttempt(ip);
      return NextResponse.json({ valid: false, error: 'Incorrect password' });
    }

    return NextResponse.json({ valid: true });
  } catch (err: any) {
    console.error('[PORTAL_VERIFY_POST]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
