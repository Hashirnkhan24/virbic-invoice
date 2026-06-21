import React from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import ItemsClient from '@/components/items/ItemsClient';

export default async function ItemsPage() {
  const { error, dbUser } = await getAuthUser();
  if (error || !dbUser) redirect('/sign-in');
  const user = dbUser;

  // Fetch user's business profiles
  const businesses = await prisma.business.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      name: true,
      currency: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  if (businesses.length === 0) {
    redirect('/onboarding');
  }

  return <ItemsClient businesses={businesses} />;
}
