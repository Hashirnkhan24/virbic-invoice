'use client';

import React, { useState, useRef } from 'react';
import { 
  CheckCircle, 
  Upload, 
  FileText, 
  AlertCircle, 
  Loader2, 
  ArrowLeft,
  Smartphone,
  Printer,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/helpers';

interface VerifyPaymentClientProps {
  invoice: {
    id: string;
    invoiceNumber: string;
    currency: string;
    grandTotal: number;
    amountPaid: number;
    balanceDue: number;
    shareId: string;
    businessName: string;
    clientName: string;
  };
}

export default function VerifyPaymentClient({ invoice }: VerifyPaymentClientProps) {
  // Steps: 'form' | 'success'
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [utr, setUtr] = useState('');
  const [amountPaid, setAmountPaid] = useState(invoice.balanceDue.toString());
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [proofId, setProofId] = useState('');
  const [submittedAt, setSubmittedAt] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  // File handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    processFile(file);
  };

  const processFile = (file: File | undefined) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Only image files (PNG, JPG, JPEG) are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds the 5MB limit.');
      return;
    }

    setScreenshotName(file.name);

    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshotBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    processFile(file);
  };

  const handleRemoveFile = () => {
    setScreenshotBase64(null);
    setScreenshotName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validation
    const cleanUtr = utr.trim();
    if (!/^\d{12}$/.test(cleanUtr)) {
      toast.error('Invalid UTR number. It must be exactly 12 digits.');
      return;
    }

    const parsedAmount = parseFloat(amountPaid);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    if (parsedAmount > invoice.balanceDue + 0.01) {
      toast.error(`Amount cannot exceed the balance due of ${formatCurrency(invoice.balanceDue, invoice.currency)}`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/payment-proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          utr: cleanUtr,
          amountPaid: parsedAmount,
          screenshotBase64,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit payment proof');

      setProofId(data.proofId);
      setSubmittedAt(new Date().toISOString());
      setStep('success');
      toast.success('Payment proof submitted successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 flex flex-col items-center justify-center">
        <div className="max-w-md w-full space-y-6 text-center print:bg-white print:p-0">
          
          {/* Top Success Banner */}
          <div className="space-y-2 select-none print:hidden">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-905 dark:text-slate-50 tracking-tight">
              Payment Proof Submitted!
            </h2>
            <p className="text-xs text-slate-450 leading-relaxed max-w-sm mx-auto">
              Your proof was recorded under reference <strong className="font-mono text-slate-600 dark:text-slate-350">{proofId}</strong>. The business owner will verify and email your official tax receipt shortly.
            </p>
          </div>

          {/* Printable Provisional Receipt */}
          <Card className="relative p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden text-left space-y-5">
            {/* Watermark Diagonal Overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] dark:opacity-[0.03] pointer-events-none select-none">
              <div className="text-slate-900 dark:text-white font-black text-4xl rotate-[-30deg] tracking-widest uppercase border-4 border-dashed border-slate-900 p-4">
                Provisional Receipt
              </div>
            </div>

            {/* Header info */}
            <div className="flex justify-between items-start pb-4 border-b border-slate-100 dark:border-slate-850">
              <div className="space-y-0.5">
                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                  Provisional Receipt
                </span>
                <h3 className="text-sm font-extrabold text-slate-850 dark:text-slate-100">
                  {invoice.businessName}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                  Invoice Number
                </span>
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  #{invoice.invoiceNumber}
                </span>
              </div>
            </div>

            {/* Receipt Details */}
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-450 font-medium">Billed To</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{invoice.clientName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-455 font-medium">UTR / Transaction Ref</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-150">{utr.toUpperCase()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-450 font-medium">Payment Method</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">UPI Transfer</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-450 font-medium">Timestamp</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-150">{formatDate(submittedAt)}</span>
              </div>
              
              <div className="pt-3 border-t border-slate-100 dark:border-slate-850 flex justify-between items-center">
                <span className="text-slate-900 dark:text-slate-100 font-extrabold text-xs">Amount Paid</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-450">
                  {formatCurrency(parseFloat(amountPaid), invoice.currency)}
                </span>
              </div>
            </div>

            {/* Status Footer Inside Receipt */}
            <div className="p-3 bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-[10px] text-amber-700 dark:text-amber-450">
                <p className="font-bold">Awaiting Merchant Clearance</p>
                <p className="leading-relaxed opacity-90">
                  This receipt is provisional. Once the merchant verifies the transfer on their bank statement, an official tax receipt will be issued.
                </p>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2 print:hidden">
            <Button
              onClick={() => window.print()}
              className="flex-1 h-10 font-bold text-xs bg-slate-800 hover:bg-slate-900 text-white cursor-pointer rounded-lg flex items-center justify-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </Button>
            <a href={`/i/${invoice.shareId}`} className="flex-1">
              <Button
                variant="outline"
                className="w-full h-10 font-bold text-xs border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer rounded-lg"
              >
                Return to Invoice
              </Button>
            </a>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 flex flex-col items-center justify-center">
      <div className="max-w-md w-full space-y-6">
        
        {/* Navigation header */}
        <div className="flex justify-between items-center select-none">
          <a
            href={`/i/${invoice.shareId}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-550 hover:text-slate-850 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </a>
          <span className="text-[10px] font-black text-slate-450 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">
            Step 2 of 3
          </span>
        </div>

        {/* Form Card */}
        <Card className="p-6 border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 rounded-2xl shadow-xl text-left space-y-5">
          <div className="space-y-1">
            <h1 className="text-lg font-black text-slate-900 dark:text-slate-50 tracking-tight">
              Submit Payment Proof
            </h1>
            <p className="text-xs text-slate-500">
              Provide transaction details for Invoice #{invoice.invoiceNumber}.
            </p>
          </div>

          {/* Simple step display */}
          <div className="flex items-center gap-2 py-1.5 border-y border-slate-100 dark:border-slate-850 text-[10px] font-bold text-slate-450">
            <span className="text-emerald-500 flex items-center gap-0.5">Pay ✓</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-800 dark:text-slate-100">Submit Proof</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-400">Get Receipt</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Amount Paid field */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Amount Paid (INR)
              </label>
              <Input
                type="number"
                required
                min="0.01"
                step="any"
                max={invoice.balanceDue + 0.01}
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="h-10 text-sm font-mono border-slate-300 dark:border-slate-800 dark:bg-slate-950"
              />
            </div>

            {/* UTR Input field */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                12-Digit UPI Ref No / UTR
              </label>
              <Input
                type="text"
                required
                maxLength={12}
                placeholder="e.g. 614294025184"
                value={utr}
                onChange={(e) => setUtr(e.target.value.replace(/[^0-9]/g, ''))}
                className="h-10 text-sm font-mono border-slate-300 dark:border-slate-800 dark:bg-slate-955"
              />
              <p className="text-[10px] text-slate-450 leading-relaxed">
                Find this 12-digit number under payment details in GPay, PhonePe, or Paytm history.
              </p>
            </div>

            {/* Screenshot Upload field */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Upload Payment Screenshot
              </label>
              
              {!screenshotBase64 ? (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed ${
                    isDragActive 
                      ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-500/5' 
                      : 'border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700'
                  } rounded-xl p-6 text-center cursor-pointer transition-all space-y-2`}
                >
                  <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                  <div className="space-y-0.5 text-xs">
                    <p className="font-extrabold text-slate-700 dark:text-slate-300">Tap to upload screenshot</p>
                    <p className="text-slate-450">PNG, JPG, or JPEG up to 5MB</p>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              ) : (
                /* Preview component */
                <div className="border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      <p className="font-extrabold text-slate-800 dark:text-slate-205 truncate">
                        {screenshotName}
                      </p>
                      <p className="text-[10px] text-emerald-650 dark:text-emerald-450 font-bold">Screenshot attached ✓</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleRemoveFile}
                    className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 cursor-pointer"
                  >
                    ✕
                  </Button>
                </div>
              )}
            </div>

            {/* Action submit button */}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-10 font-black text-xs bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all rounded-lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                  <span>Submitting Verification...</span>
                </>
              ) : (
                <span>Submit Payment Proof</span>
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
