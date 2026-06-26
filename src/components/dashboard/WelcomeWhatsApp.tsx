'use client';

import React from 'react';
import { MessageSquare, ArrowRight, Smartphone, QrCode } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import QRCodeGenerator from '@/components/shared/QRCodeGenerator';

interface WelcomeWhatsAppProps {
  userId: string;
  brandColor?: string;
}

export default function WelcomeWhatsApp({
  userId,
  brandColor = '#10b981',
}: WelcomeWhatsAppProps) {
  // Use public environment variable or fall back to standard Meta Cloud test number
  const botNumber = process.env.NEXT_PUBLIC_WHATSAPP_BOT_NUMBER || '16505553333';
  const cleanBotNumber = botNumber.replace(/\D/g, '');
  const linkText = encodeURIComponent(`Register ${userId}`);
  const whatsappUrl = `https://wa.me/${cleanBotNumber}?text=${linkText}`;

  return (
    <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-lg bg-white dark:bg-slate-900 flex flex-col md:flex-row max-w-2xl mx-auto">
      {/* Visual Accent Bar */}
      <div 
        className="h-2 md:h-auto md:w-2 transition-all flex-shrink-0"
        style={{ backgroundColor: brandColor }}
      />

      <div className="p-6 flex-1 flex flex-col md:flex-row gap-6 items-center">
        {/* Info Area */}
        <div className="flex-1 space-y-4 text-center md:text-left">
          <div className="inline-flex p-2.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-600 dark:text-emerald-400">
            <MessageSquare className="w-6 h-6 animate-pulse" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
              Connect WhatsApp Assistant
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
              Manage your invoicing directly from WhatsApp. Send commands in Hinglish or English to create invoices, check outstanding amounts, and trigger payment reminders.
            </p>
          </div>

          {/* Quick instructions list */}
          <div className="text-[11px] text-slate-550 space-y-1 text-left inline-block md:block px-4 py-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-xl w-full">
            <div className="font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <span>💡</span> Get started in 2 steps:
            </div>
            <div className="flex gap-1.5">
              <span className="font-bold text-emerald-500">1.</span>
              <span>Scan the QR code or click the button below to open chat.</span>
            </div>
            <div className="flex gap-1.5">
              <span className="font-bold text-emerald-500">2.</span>
              <span>Send the pre-filled message starting with <b>&quot;Register...&quot;</b> to link your profile.</span>
            </div>
          </div>

          {/* Mobile Connection Button */}
          <div className="pt-2 md:hidden">
            <Button
              onClick={() => window.open(whatsappUrl, '_blank')}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Smartphone className="w-4 h-4" />
              <span>Connect on WhatsApp</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* QR Code Area (Hidden on mobile by default, shown on desktop) */}
        <div className="hidden md:flex flex-col items-center gap-2.5 flex-shrink-0 bg-slate-50 dark:bg-slate-950/30 p-4 border border-slate-100 dark:border-slate-850 rounded-xl">
          <QRCodeGenerator value={whatsappUrl} size={135} className="bg-white border-0 shadow-none p-0" />
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
            <QrCode className="w-3.5 h-3.5 text-slate-450" />
            <span>Scan to Connect</span>
          </div>
        </div>

        {/* Desktop Connection Button (Fallback to click directly) */}
        <div className="hidden md:block w-full md:w-auto pt-2 text-center md:hidden">
          <Button
            onClick={() => window.open(whatsappUrl, '_blank')}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <Smartphone className="w-4 h-4" />
            <span>Connect on WhatsApp</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Desktop Direct Connect Button backup */}
        <div className="md:hidden w-full flex justify-center pt-2">
          {/* Handled above for mobile */}
        </div>
        
        {/* Desktop fallback trigger for layout responsiveness */}
        <div className="hidden md:block md:w-0 md:h-0 overflow-hidden">
          <Button onClick={() => window.open(whatsappUrl, '_blank')} />
        </div>
      </div>

      {/* Button for desktop layout when QR is not preferred */}
      <div className="hidden md:flex items-center justify-center border-t border-slate-100 dark:border-slate-850 p-4 bg-slate-50/50 dark:bg-slate-950/10 md:hidden">
        <Button
          onClick={() => window.open(whatsappUrl, '_blank')}
          variant="outline"
          className="text-xs font-semibold flex items-center gap-1.5 border-slate-200 dark:border-slate-800 dark:text-slate-300"
        >
          <Smartphone className="w-4 h-4" />
          <span>Connect Direct Link</span>
        </Button>
      </div>

      {/* Actual Direct Link for Desktop */}
      <div className="hidden md:block p-4 border-l border-slate-100 dark:border-slate-850 flex flex-col justify-center items-center gap-2 bg-slate-550/[0.02]">
        <Button
          onClick={() => window.open(whatsappUrl, '_blank')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-4 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm text-xs"
        >
          <Smartphone className="w-4 h-4" />
          <span>Open Direct Link</span>
        </Button>
        <span className="text-[9px] text-slate-400">If QR code scan fails</span>
      </div>
    </Card>
  );
}
