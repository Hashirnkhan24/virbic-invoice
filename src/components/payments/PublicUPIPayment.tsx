'use client';

import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  QrCode, 
  Smartphone, 
  Copy, 
  Check, 
  ArrowRight, 
  ShieldCheck, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/helpers';
import { toast } from 'sonner';

interface PublicUPIPaymentProps {
  invoiceId: string;
  invoiceNumber: string;
  balanceDue: number;
  currency: string;
  upiId: string;
  payeeName: string;
  shareId: string;
}

export default function PublicUPIPayment({
  invoiceId,
  invoiceNumber,
  balanceDue,
  currency,
  upiId,
  payeeName,
  shareId,
}: PublicUPIPaymentProps) {
  const [loading, setLoading] = useState(true);
  const [upiData, setUpiData] = useState<{ upiLink: string; qrData: string; transactionRef: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Detect mobile device for UPI intent links
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent || window.navigator.vendor;
      setIsMobile(/android|iphone|ipad|ipod/i.test(userAgent.toLowerCase()));
    }

    // Fetch UPI QR & intent details from route
    const fetchUPIDetails = async () => {
      try {
        const res = await fetch(`/api/invoices/${invoiceId}/upi`);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'Failed to initialize UPI session');
        }
        const data = await res.json();
        setUpiData(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Could not load UPI configuration');
      } finally {
        setLoading(false);
      }
    };

    fetchUPIDetails();
  }, [invoiceId]);

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    toast.success('UPI ID copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePayIntent = () => {
    if (upiData?.upiLink) {
      window.location.href = upiData.upiLink;
    }
  };

  if (loading) {
    return (
      <Card className="p-8 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        <p className="text-xs text-slate-500 font-bold">Initializing secure zero-fee payment session...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 border border-red-200/80 dark:border-red-950/60 bg-red-50/50 dark:bg-red-950/10 rounded-2xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-red-900 dark:text-red-300">UPI Payment Unavailable</h4>
          <p className="text-xs text-red-650 dark:text-red-400">{error}</p>
        </div>
      </Card>
    );
  }

  const formattedAmount = formatCurrency(balanceDue, currency);

  return (
    <Card className="p-6 border border-emerald-500/20 dark:border-emerald-500/10 bg-white dark:bg-slate-900 rounded-2xl shadow-md text-left mt-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-850">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-450 font-bold text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span>Secure Instant UPI Transfer</span>
          </div>
          <h3 className="text-base font-extrabold text-slate-850 dark:text-slate-50">
            Pay Outstanding Balance
          </h3>
        </div>
        <div className="text-right sm:text-right">
          <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">
            Amount Due
          </span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-450">
            {formattedAmount}
          </span>
        </div>
      </div>

      {/* Main Grid: QR Left, Instructions Right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* QR Code Segment */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850 shadow-inner select-none">
          {upiData?.qrData ? (
            <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
              <QRCodeSVG
                value={upiData.qrData}
                size={160}
                level="M"
                includeMargin={false}
              />
            </div>
          ) : null}
          <div className="flex items-center gap-1 mt-3 text-slate-500 text-[10px] font-bold">
            <QrCode className="w-3.5 h-3.5" />
            <span>Scan with any UPI App</span>
          </div>
        </div>

        {/* Instructions / Mobile Click Segment */}
        <div className="md:col-span-8 space-y-4">
          {isMobile ? (
            /* Mobile View: Show Intent Button */
            <div className="space-y-3.5 bg-emerald-500/5 dark:bg-emerald-500/10 p-4 border border-emerald-500/10 rounded-xl">
              <div className="flex gap-2.5 items-start">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-450 shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="space-y-0.5 text-xs text-left">
                  <h4 className="font-extrabold text-slate-800 dark:text-slate-100">Pay directly on your device</h4>
                  <p className="text-slate-450 leading-relaxed">
                    Tap the button below to launch your default UPI app (GPay, PhonePe, Paytm, BHIM) and complete the transfer instantly.
                  </p>
                </div>
              </div>
              <Button
                onClick={handlePayIntent}
                className="w-full h-10 font-black text-xs bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all rounded-lg"
              >
                Pay {formattedAmount} via UPI App
              </Button>
            </div>
          ) : (
            /* Desktop View: Instructions & Manual UPI ID copy */
            <div className="space-y-3 bg-slate-50/50 dark:bg-slate-950/20 p-4 border border-slate-100 dark:border-slate-850 rounded-xl">
              <div className="space-y-2 text-xs leading-relaxed text-slate-550 dark:text-slate-350">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-450 flex items-center justify-center font-bold text-[10px]">1</span>
                  <p className="font-bold">Scan the QR code using Google Pay, PhonePe, Paytm, or BHIM.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-450 flex items-center justify-center font-bold text-[10px]">2</span>
                  <p className="font-bold">Verify that payee name is <span className="font-mono text-slate-800 dark:text-slate-200 underline">{payeeName}</span>.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-450 flex items-center justify-center font-bold text-[10px]">3</span>
                  <p className="font-bold">Transfer exactly <span className="text-emerald-600 dark:text-emerald-450 font-black">{formattedAmount}</span>.</p>
                </div>
              </div>

              {/* UPI ID copy strip */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between text-xs">
                <span className="text-slate-450 font-bold">UPI ID (VPA):</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-700 dark:text-slate-300">
                    {upiId}
                  </span>
                  <button
                    onClick={handleCopyUPI}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded transition-colors cursor-pointer"
                    title="Copy UPI ID"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* UTR Verification Link */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50/50 dark:bg-slate-950/20 p-4 border border-slate-100 dark:border-slate-850 rounded-xl">
            <div className="space-y-0.5">
              <p className="font-extrabold text-slate-800 dark:text-slate-200">Completed the transfer?</p>
              <p className="text-[11px] text-slate-450">Submit your 12-digit UTR to instantly download your receipt.</p>
            </div>
            <a href={`/i/${shareId}/verify`} className="shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-9 font-bold text-xs border-emerald-500/20 text-emerald-600 dark:text-emerald-450 hover:bg-emerald-500/10 cursor-pointer flex items-center gap-1.5"
              >
                <span>I&apos;ve Paid</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </a>
          </div>
        </div>
      </div>
    </Card>
  );
}
