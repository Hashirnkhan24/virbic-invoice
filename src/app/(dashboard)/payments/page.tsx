import React from 'react';
import { getAuthUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PaymentsInboxClient from './PaymentsInboxClient';
import { prisma } from '@/lib/prisma';

export default async function PaymentsInboxPage() {
  const { error, dbUser } = await getAuthUser();
  if (error || !dbUser) redirect('/sign-in');
  const user = dbUser;

  // Fetch clients to populate filter dropdowns in client component
  const clients = await prisma.client.findMany({
    where: { userId: user.id, isDeleted: false },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });

  return <PaymentsInboxClient initialClients={clients} />;
}
