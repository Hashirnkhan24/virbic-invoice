'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';

interface DbUser {
  id: string;
  clerkId: string;
  email: string;
  name: string;
  avatar: string;
}

export function useCurrentUser() {
  const { user: clerkUser, isLoaded: isClerkLoaded, isSignedIn } = useUser();
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [isDbLoading, setIsDbLoading] = useState(true);

  useEffect(() => {
    if (!isClerkLoaded || !isSignedIn) {
      setIsDbLoading(false);
      return;
    }

    // Fetch the DB user record
    async function fetchDbUser() {
      try {
        const res = await fetch('/api/user/me');
        if (res.ok) {
          const data = await res.json();
          setDbUser(data.user);
        }
      } catch (err) {
        console.error('Failed to fetch DB user:', err);
      } finally {
        setIsDbLoading(false);
      }
    }

    fetchDbUser();
  }, [isClerkLoaded, isSignedIn]);

  return {
    clerkUser,
    dbUser,
    isLoading: !isClerkLoaded || isDbLoading,
    isSignedIn,
  };
}
