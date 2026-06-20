'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
  className?: string;
}

/**
 * QRCodeGenerator - Render a scannable QR Code using SVG.
 * Designed for web rendering of payment links or share URLs.
 */
export default function QRCodeGenerator({
  value,
  size = 128,
  className = '',
}: QRCodeGeneratorProps) {
  if (!value) {
    return (
      <div className="flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-900 text-slate-400 text-xs p-2 text-center">
        No Data
      </div>
    );
  }

  return (
    <div className={`p-2 bg-white rounded-lg shadow-sm border border-slate-250/60 flex items-center justify-center ${className}`}>
      <QRCodeSVG
        value={value}
        size={size}
        level="M"
        includeMargin={true}
        className="max-w-full h-auto"
      />
    </div>
  );
}
