import React from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import ReportsClient from '@/components/reports/ReportsClient';

export default async function ReportsPage() {
  const { error, dbUser } = await getAuthUser();
  if (error || !dbUser) redirect('/sign-in');
  const user = dbUser;

  // Fetch all businesses for this user
  const businesses = await prisma.business.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      name: true,
      currency: true,
      isDefault: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  if (businesses.length === 0) {
    redirect('/onboarding');
  }

  // Pass JSON-serializable businesses list
  const serializedBusinesses = businesses.map((b) => ({
    id: b.id,
    name: b.name,
    currency: b.currency,
    isDefault: b.isDefault,
  }));

  return <ReportsClient businesses={serializedBusinesses} />;
}
