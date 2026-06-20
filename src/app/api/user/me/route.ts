import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

// GET: Returns the current authenticated user's DB record
export async function GET() {
  const { error, dbUser } = await getAuthUser();
  if (error) return error;

  return NextResponse.json({
    user: {
      id: dbUser!.id,
      clerkId: dbUser!.clerkId,
      email: dbUser!.email,
      name: dbUser!.name,
      avatar: dbUser!.avatar,
    },
  });
}
