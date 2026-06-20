import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950">
      {/* Decorative background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo + Brand */}
        <div className="text-center mb-8">
          <img src="/virbic-logo.svg" alt="Virbic Logo" className="w-16 h-16 object-contain mb-4 mx-auto" />
          <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-blue-400 to-sky-400 bg-clip-text text-transparent">Virbic</h1>
          <p className="text-sm text-slate-400 mt-1">GST-compliant invoice generator</p>
        </div>

        {children}
      </div>
    </div>
  );
}
