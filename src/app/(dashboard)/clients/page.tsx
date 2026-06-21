'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Building2,
  UserPlus,
  Plus,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  X,
  Search,
} from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import SearchInput from '@/components/shared/SearchInput';
import ClientCard from '@/components/clients/ClientCard';
import ClientForm from '@/components/clients/ClientForm';
import ClientDetail from '@/components/clients/ClientDetail';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import {
  useGetClients,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
  ClientWithDetails,
} from '@/hooks/useClients';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/helpers';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ClientsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [minOutstanding, setMinOutstanding] = useState<boolean>(false);
  const [includeDeleted, setIncludeDeleted] = useState<boolean>(false);

  const { clients, loading, error, refetch } = useGetClients(search, {
    sortBy,
    minOutstanding,
    includeDeleted,
  });

  // Separate query for total counts so stats cards remain stable during search/filters
  const { clients: allClients, refetch: refetchAllCounts } = useGetClients('', { includeDeleted: true });

  // Dialog & drawer states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [selectedClient, setSelectedClient] = useState<ClientWithDetails | null>(null);
  const [clientToDelete, setClientToDelete] = useState<ClientWithDetails | null>(null);

  // Mutation hooks
  const { create, loading: createLoading } = useCreateClient();
  const { update, loading: updateLoading } = useUpdateClient();
  const { remove, loading: deleteLoading } = useDeleteClient();

  const isFormSubmitting = createLoading || updateLoading;

  // Aggregate stats from the full (unfiltered) list
  const stats = useMemo(() => {
    // Only aggregate active clients
    const activeClients = allClients.filter((c) => !c.isDeleted);
    const total = activeClients.length;
    
    const totalOutstanding = activeClients.reduce((sum, c) => sum + (Number(c.totalOutstanding) || 0), 0);
    
    // Find top client by revenue (billed)
    let topClient: ClientWithDetails | null = null;
    let maxRevenue = 0;
    activeClients.forEach((c) => {
      const billed = Number(c.totalBilled) || 0;
      if (billed > maxRevenue) {
        maxRevenue = billed;
        topClient = c;
      }
    });

    return {
      total,
      totalOutstanding,
      topClientName: topClient ? (topClient as any).name : 'None',
      topClientRevenue: maxRevenue,
    };
  }, [allClients]);

  // Handle open add form
  const handleAddClient = () => {
    setSelectedClient(null);
    setIsFormOpen(true);
  };

  // Handle view details
  const handleViewClient = (client: ClientWithDetails) => {
    router.push(`/clients/${client.id}`);
  };

  // Handle edit details
  const handleEditClient = (client: ClientWithDetails) => {
    setSelectedClient(client);
    setIsDetailOpen(false);
    setIsFormOpen(true);
  };

  // Handle delete trigger
  const handleDeleteTrigger = (client: ClientWithDetails) => {
    setClientToDelete(client);
    setIsDeleteOpen(true);
  };

  // Handle form submit (save or update, single or bulk CSV list)
  const handleFormSubmit = async (data: any) => {
    try {
      const activeBizId = typeof window !== 'undefined' ? localStorage.getItem('active_business_id')?.replace(/^"|"$/g, '') : null;

      if (Array.isArray(data)) {
        // Bulk import CSV rows
        const mappedData = data.map((row) => ({
          ...row,
          businessId: activeBizId || null,
        }));
        await create(mappedData);
        toast.success(`Successfully imported ${data.length} clients!`);
      } else {
        // Single client save/update
        const payload = {
          ...data,
          businessId: selectedClient ? (selectedClient.businessId || activeBizId || null) : (activeBizId || null),
        };

        if (selectedClient) {
          await update(selectedClient.id, payload);
          toast.success('Client updated successfully');
        } else {
          await create(payload);
          toast.success('Client created successfully');
        }
      }
      setIsFormOpen(false);
      refetch();
      refetchAllCounts();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to save client');
    }
  };

  // Handle client delete confirmation
  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;
    try {
      await remove(clientToDelete.id);
      toast.success('Client deleted successfully');
      setIsDetailOpen(false);
      refetch();
      refetchAllCounts();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to delete client');
    } finally {
      setClientToDelete(null);
    }
  };

  // Loading Skeleton Grid
  const renderSkeletons = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-xl p-5 shadow-sm space-y-4 animate-pulse"
        >
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800" />
              <div className="space-y-2 text-left">
                <div className="h-3.5 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-2.5 w-20 bg-slate-200 dark:bg-slate-850 rounded" />
              </div>
            </div>
            <div className="w-4 h-6 bg-slate-100 dark:bg-slate-850 rounded" />
          </div>
          <div className="space-y-2 py-3 border-t border-b border-slate-100 dark:border-slate-850">
            <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-850 rounded" />
            <div className="h-2.5 w-5/6 bg-slate-100 dark:bg-slate-850 rounded" />
            <div className="h-2.5 w-4/6 bg-slate-100 dark:bg-slate-850 rounded" />
          </div>
          <div className="flex justify-between items-center pt-1">
            <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
            <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <PageHeader
        title="Clients"
        description="Manage your client registry, address profiles, and GST records."
        action={
          <Button
            onClick={handleAddClient}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-4 gap-1.5 shadow-sm rounded-lg cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Client</span>
          </Button>
        }
      />

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2.5 text-left text-xs font-semibold text-red-650 dark:text-red-400">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span>Error loading registry: {error}</span>
        </div>
      )}

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Total Clients"
          value={stats.total}
          icon={<Users className="w-5 h-5 text-emerald-500" />}
        />
        <StatCard
          title="Total Outstanding"
          value={formatCurrency(stats.totalOutstanding, 'INR')}
          icon={<AlertCircle className="w-5 h-5 text-amber-550" />}
        />
        <StatCard
          title="Top Client (Revenue)"
          value={stats.topClientRevenue > 0 ? `${stats.topClientName} (${formatCurrency(stats.topClientRevenue, 'INR')})` : 'N/A'}
          icon={<Building2 className="w-5 h-5 text-indigo-500" />}
        />
      </div>

      {/* Toolbar / Search Section */}
      <div className="flex flex-col gap-4 py-1.5 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <SearchInput
            onChange={setSearch}
            placeholder="Filter clients by name, GSTIN, email, or city..."
            className="w-full lg:max-w-md"
          />
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Sort By</span>
              <Select value={sortBy} onValueChange={(val) => setSortBy(val || 'name')}>
                <SelectTrigger className="h-9 w-[150px] text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg shadow-sm">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name" className="text-xs font-semibold">Name (A-Z)</SelectItem>
                  <SelectItem value="revenue" className="text-xs font-semibold">Revenue (Highest)</SelectItem>
                  <SelectItem value="outstanding" className="text-xs font-semibold">Outstanding (Highest)</SelectItem>
                  <SelectItem value="recent" className="text-xs font-semibold">Recent Invoice</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Min Outstanding Toggle */}
            <label className="flex items-center gap-2 px-3 h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={minOutstanding}
                onChange={(e) => setMinOutstanding(e.target.checked)}
                className="w-3.5 h-3.5 text-emerald-600 border-slate-300 dark:border-slate-800 rounded focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">Has Balance</span>
            </label>

            {/* Include Deleted Toggle */}
            <label className="flex items-center gap-2 px-3 h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeDeleted}
                onChange={(e) => setIncludeDeleted(e.target.checked)}
                className="w-3.5 h-3.5 text-emerald-600 border-slate-300 dark:border-slate-800 rounded focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-355">Show Archived</span>
            </label>
          </div>
        </div>

        {search && (
          <div className="text-xs text-slate-400 font-semibold text-left">
            Found {clients.length} matching client{clients.length === 1 ? '' : 's'}
          </div>
        )}
      </div>

      {/* Clients Main Content */}
      {loading ? (
        renderSkeletons()
      ) : clients.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onView={handleViewClient}
              onEdit={handleEditClient}
              onDelete={handleDeleteTrigger}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center p-8 sm:p-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 flex items-center justify-center mb-4">
            <Users className="w-8 h-8" />
          </div>
          
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 mb-2">
            {search ? 'No matching clients found' : 'Build your client registry'}
          </h3>
          
          <p className="text-xs text-slate-500 max-w-sm leading-relaxed mb-6">
            {search
              ? 'Try refining your search terms or clearing filters to locate your client registry.'
              : 'Add customer profiles here to speed up invoice drafting, auto-calculate regional GST rates, and track recent invoices.'}
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {search ? (
              <Button
                variant="outline"
                onClick={() => setSearch('')}
                className="border-slate-200 text-slate-700 hover:bg-slate-50 font-bold dark:border-slate-850 dark:text-slate-350 dark:hover:bg-slate-805 cursor-pointer h-9 px-4 rounded-lg text-xs"
              >
                Clear Search Filter
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleAddClient}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 px-5 gap-1.5 shadow-sm rounded-lg cursor-pointer text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Client</span>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleAddClient} // Opens Dialog, can switch to CSV tab
                  className="border-slate-200 text-slate-650 hover:bg-slate-50 font-bold dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-850 cursor-pointer h-9 px-4 gap-1.5 rounded-lg text-xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Bulk Import CSV</span>
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Client Modal Dialog */}
      <ClientForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        initialData={selectedClient}
        onSubmit={handleFormSubmit}
        isLoading={isFormSubmitting}
      />

      {/* Client Detail Sidebar Drawer */}
      <ClientDetail
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        client={selectedClient}
        onEdit={handleEditClient}
        onDelete={handleDeleteTrigger}
      />

      {/* Client Delete Confirmation */}
      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Delete Customer Profile?"
        description={`Are you sure you want to delete ${clientToDelete?.name || 'this client'}? This action is permanent and cannot be undone.`}
        confirmText="Delete Client"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        variant="danger"
        isLoading={deleteLoading}
      />

    </div>
  );
}
