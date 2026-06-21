import { useState, useEffect, useCallback } from 'react';
import { Client } from '@/types';

// Extend the client interface with counts and invoices if returned
export interface ClientWithDetails extends Client {
  _count?: {
    invoices: number;
  };
  invoices?: {
    id: string;
    invoiceNumber: string;
    grandTotal: number;
    status: string;
    issueDate: string;
  }[];
}

// Query hook to fetch clients
export function useGetClients(
  search: string = '',
  options?: {
    sortBy?: string;
    minOutstanding?: boolean;
    includeDeleted?: boolean;
  }
) {
  const [clients, setClients] = useState<ClientWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const sortBy = options?.sortBy;
  const minOutstanding = options?.minOutstanding;
  const includeDeleted = options?.includeDeleted;

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const activeBizId = typeof window !== 'undefined' ? localStorage.getItem('active_business_id')?.replace(/^"|"$/g, '') : null;
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (activeBizId) params.append('businessId', activeBizId);
      if (sortBy) params.append('sortBy', sortBy);
      if (minOutstanding) params.append('minOutstanding', 'true');
      if (includeDeleted) params.append('includeDeleted', 'true');

      const url = `/api/clients?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      const data = await response.json();
      setClients(data.clients || []);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [search, sortBy, minOutstanding, includeDeleted]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  return {
    clients,
    loading,
    error,
    refetch: fetchClients,
  };
}

// Mutation hook to create client (single or bulk array)
export function useCreateClient() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Record<string, string[]> | string | null>(null);

  const create = async (clientData: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details) {
          throw new Error(JSON.stringify(data.details));
        }
        throw new Error(data.error || 'Failed to create client');
      }

      return data;
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

// Mutation hook to update client
export function useUpdateClient() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Record<string, string[]> | string | null>(null);

  const update = async (id: string, clientData: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/clients', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, ...clientData }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details) {
          throw new Error(JSON.stringify(data.details));
        }
        throw new Error(data.error || 'Failed to update client');
      }

      return data.client as Client;
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

// Mutation hook to delete client
export function useDeleteClient() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/clients?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete client');
      }

      return true;
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    remove,
    loading,
    error,
  };
}
