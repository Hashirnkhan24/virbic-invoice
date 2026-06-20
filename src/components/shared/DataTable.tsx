'use client';

import { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface Column<T> {
  key: string;
  header: ReactNode;
  className?: string;
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyState?: {
    title?: string;
    description?: string;
    icon?: ReactNode;
  };
}

export default function DataTable<T extends { id: string | number }>({
  columns,
  data,
  onRowClick,
  isLoading = false,
  emptyState,
}: DataTableProps<T>) {
  const defaultEmptyIcon = <Inbox className="w-10 h-10 text-emerald-500/80 dark:text-emerald-400/80 mb-2" />;
  const emptyTitle = emptyState?.title ?? 'No data found';
  const emptyDesc = emptyState?.description ?? 'Get started by creating your first entry.';

  return (
    <div className="w-full border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden animate-fade-in">
      <Table>
        <TableHeader className="bg-slate-50/50 dark:bg-slate-800/30">
          <TableRow className="hover:bg-transparent border-b border-slate-200/60 dark:border-slate-800/60">
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={`text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 py-3.5 ${col.className ?? ''}`}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            // Skeleton Loader
            Array.from({ length: 5 }).map((_, idx) => (
              <TableRow
                key={`skeleton-${idx}`}
                className="border-b border-slate-200/40 dark:border-slate-800/40"
              >
                {columns.map((col) => (
                  <TableCell key={`skeleton-cell-${col.key}`} className="py-4">
                    <div className="h-4 bg-slate-200/60 dark:bg-slate-800/60 rounded animate-pulse w-3/4" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : data.length === 0 ? (
            // Empty State
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="py-12 text-center text-slate-500 dark:text-slate-400 hover:bg-transparent"
              >
                <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                  {emptyState?.icon ?? defaultEmptyIcon}
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {emptyTitle}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {emptyDesc}
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            // Data Rows
            data.map((row) => (
              <TableRow
                key={row.id}
                onClick={() => onRowClick && onRowClick(row)}
                className={`border-b border-slate-200/40 dark:border-slate-800/40 transition-colors ${
                  onRowClick
                    ? 'cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                    : 'hover:bg-transparent'
                }`}
              >
                {columns.map((col) => (
                  <TableCell
                    key={`cell-${row.id}-${col.key}`}
                    className={`py-3.5 text-sm text-slate-900 dark:text-slate-100 ${col.className ?? ''}`}
                  >
                    {col.render ? col.render(row) : (row as any)[col.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
