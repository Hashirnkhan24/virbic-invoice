import { useState, useEffect, useCallback } from 'react';
import { Business } from '@/types';

// Query hook to fetch businesses
export function useGetBusinesses() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/business');
      if (!response.ok) {
        throw new Error('Failed to fetch businesses');
      }
      const data = await response.json();
      setBusinesses(data.businesses || []);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  return {
    businesses,
    loading,
    error,
    refetch: fetchBusinesses,
  };
}

// Mutation hook to create a business
export function useCreateBusiness() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Record<string, string[]> | string | null>(null);

  const create = async (businessData: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/business', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(businessData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details) {
          throw new Error(JSON.stringify(data.details));
        }
        throw new Error(data.error || 'Failed to create business');
      }

      return data.business as Business;
    } catch (err: any) {
      try {
        const parsed = JSON.parse(err.message);
        setError(parsed);
      } catch {
        setError(err.message || 'An error occurred');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    create,
    loading,
    error,
  };
}

// Mutation hook to update a business
export function useUpdateBusiness() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Record<string, string[]> | string | null>(null);

  const update = async (
    id: string,
    businessData: any
  ) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/business', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, ...businessData }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details) {
          throw new Error(JSON.stringify(data.details));
        }
        throw new Error(data.error || 'Failed to update business');
      }

      return data.business as Business;
    } catch (err: any) {
      try {
        const parsed = JSON.parse(err.message);
        setError(parsed);
      } catch {
        setError(err.message || 'An error occurred');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    update,
    loading,
    error,
  };
}
