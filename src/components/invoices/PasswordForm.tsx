'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldAlert, KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PasswordFormProps {
  shareId: string;
  errorMsg?: string;
}

export default function PasswordForm({ shareId, errorMsg }: PasswordFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(errorMsg || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter a password.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    // Append password as 'p' query param to trigger page reload and server-side validation
    const params = new URLSearchParams(searchParams.toString());
    params.set('p', password);
    
    router.push(`/i/${shareId}?${params.toString()}`);
    
    // Simulate short loader
    setTimeout(() => {
      setIsSubmitting(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md text-center space-y-6">
        <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900">
          <KeyRound className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <h1 className="text-lg font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
            Password Protected
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            This invoice is password protected. Please enter the access password below to view it.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              Access Password
            </label>
            <Input
              type="password"
              placeholder="Enter password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 text-sm border-slate-350 dark:border-slate-800 dark:bg-slate-950"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-500 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-150 dark:border-red-900/30 font-medium">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-10 font-bold text-xs bg-slate-900 hover:bg-slate-850 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <span>Access Invoice</span>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
