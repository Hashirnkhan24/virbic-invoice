'use client';

import React, { lazy, Suspense } from 'react';
import { InvoiceTemplateProps, TemplateName } from './types';

// Lazy-load all template components for code splitting
const ModernTemplate = lazy(() => import('./ModernTemplate'));
const MinimalTemplate = lazy(() => import('./MinimalTemplate'));
const ProfessionalTemplate = lazy(() => import('./ProfessionalTemplate'));
const CreativeTemplate = lazy(() => import('./CreativeTemplate'));
const DarkTemplate = lazy(() => import('./DarkTemplate'));
const ClassicTemplate = lazy(() => import('./ClassicTemplate'));
const GradientTemplate = lazy(() => import('./GradientTemplate'));
const BoldTemplate = lazy(() => import('./BoldTemplate'));
const ElegantTemplate = lazy(() => import('./ElegantTemplate'));
const StartupTemplate = lazy(() => import('./StartupTemplate'));

/** Registry mapping template names to their lazy-loaded components */
const TEMPLATE_REGISTRY: Record<TemplateName, React.LazyExoticComponent<React.ComponentType<InvoiceTemplateProps>>> = {
  modern: ModernTemplate,
  minimal: MinimalTemplate,
  professional: ProfessionalTemplate,
  creative: CreativeTemplate,
  dark: DarkTemplate,
  classic: ClassicTemplate,
  gradient: GradientTemplate,
  bold: BoldTemplate,
  elegant: ElegantTemplate,
  startup: StartupTemplate,
};

/** Template metadata for the template selector UI */
export const TEMPLATE_META: Record<TemplateName, { label: string; description: string; colors: string[] }> = {
  modern: {
    label: 'Modern',
    description: 'Clean emerald design with rounded cards',
    colors: ['#10b981', '#ecfdf5', '#f8fafc'],
  },
  minimal: {
    label: 'Minimal',
    description: 'Swiss-style with maximum whitespace',
    colors: ['#0f172a', '#f8fafc', '#ffffff'],
  },
  professional: {
    label: 'Professional',
    description: 'Corporate navy header for enterprises',
    colors: ['#0f172a', '#f1f5f9', '#10b981'],
  },
  creative: {
    label: 'Creative',
    description: 'Vibrant violet-pink gradient accents',
    colors: ['#7c3aed', '#ec4899', '#10b981'],
  },
  dark: {
    label: 'Dark',
    description: 'Sleek dark mode with emerald glow',
    colors: ['#020617', '#10b981', '#334155'],
  },
  classic: {
    label: 'Classic',
    description: 'Traditional serif with warm amber tones',
    colors: ['#92400e', '#fef3c7', '#fffbeb'],
  },
  gradient: {
    label: 'Gradient',
    description: 'Warm orange-to-purple gradient header',
    colors: ['#f97316', '#e11d48', '#9333ea'],
  },
  bold: {
    label: 'Bold',
    description: 'Oversized editorial typography',
    colors: ['#2563eb', '#eff6ff', '#0f172a'],
  },
  elegant: {
    label: 'Elegant',
    description: 'Luxury gold and champagne aesthetic',
    colors: ['#b45309', '#fef3c7', '#292524'],
  },
  startup: {
    label: 'Startup',
    description: 'Neon cyan tech / SaaS style',
    colors: ['#22d3ee', '#020617', '#0e7490'],
  },
};

/** Loading fallback skeleton for lazy-loaded templates */
function TemplateSkeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-3 w-48 bg-slate-100 dark:bg-slate-850 rounded" />
        </div>
        <div className="space-y-2 text-right">
          <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded ml-auto" />
          <div className="h-3 w-36 bg-slate-100 dark:bg-slate-850 rounded ml-auto" />
        </div>
      </div>
      <div className="h-px bg-slate-200 dark:bg-slate-800" />
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-3 w-28 bg-slate-100 dark:bg-slate-850 rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-3 w-28 bg-slate-100 dark:bg-slate-850 rounded" />
        </div>
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 bg-slate-100 dark:bg-slate-850 rounded" />
        ))}
      </div>
    </div>
  );
}

interface TemplateRendererProps extends InvoiceTemplateProps {
  /** Template name to render */
  template: TemplateName | string;
}

/**
 * TemplateRenderer — Maps a template name string to its corresponding
 * lazy-loaded React component and renders it with the invoice data.
 *
 * Falls back to ModernTemplate if the template name is not recognized.
 */
export default function TemplateRenderer({
  template,
  ...props
}: TemplateRendererProps) {
  const templateName = (template in TEMPLATE_REGISTRY ? template : 'modern') as TemplateName;
  const TemplateComponent = TEMPLATE_REGISTRY[templateName];

  return (
    <Suspense fallback={<TemplateSkeleton />}>
      <TemplateComponent {...props} />
    </Suspense>
  );
}
