'use client';

import React, { useState, useEffect } from 'react';
import { Download, Mail, Link, MessageCircle, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/helpers';

interface DeliveryActionsProps {
  invoice: {
    id: string;
    invoiceNumber: string;
    publicShareId: string | null;
    currency: string;
    grandTotal: number;
    business: {
      name: string;
    };
    client: {
      name: string;
      email?: string | null;
    };
  };
}

export default function DeliveryActions({ invoice }: DeliveryActionsProps) {
  const [origin, setOrigin] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailTo, setEmailTo] = useState(invoice.client.email || '');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const shareUrl = invoice.publicShareId ? `${origin}/i/${invoice.publicShareId}` : '';

  // Initialize email subject & message
  useEffect(() => {
    const amountStr = formatCurrency(invoice.grandTotal, invoice.currency);
    setEmailSubject(`Invoice ${invoice.invoiceNumber} from ${invoice.business.name}`);
    setEmailMessage(
      `Hello ${invoice.client.name},\n\n` +
      `Please find attached our invoice ${invoice.invoiceNumber} for ${amountStr}.\n\n` +
      `You can also view and pay the invoice online here: ${shareUrl}\n\n` +
      `Thank you for your business!\n\n` +
      `Best regards,\n` +
      `${invoice.business.name}`
    );
  }, [invoice, shareUrl]);

  // 1. Download PDF Action
  const handleDownloadPDF = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/pdf`);
      if (!res.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const linkEl = document.createElement('a');
      linkEl.href = blobUrl;
      // Format file name
      const cleanInvoiceNum = invoice.invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
      linkEl.download = `Invoice_${cleanInvoiceNum}.pdf`;
      
      document.body.appendChild(linkEl);
      linkEl.click();
      linkEl.remove();
      window.URL.revokeObjectURL(blobUrl);
      
      toast.success('PDF downloaded successfully!');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Could not download PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // 2. Email Sending Action
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailTo.trim() || !emailSubject.trim() || !emailMessage.trim()) {
      toast.error('All email fields are required.');
      return;
    }
    
    setIsSendingEmail(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailTo.trim(),
          subject: emailSubject.trim(),
          message: emailMessage.replace(/\n/g, '<br />'), // convert newlines to HTML br
        }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send email');
      }
      
      toast.success('Invoice emailed successfully!');
      setIsEmailDialogOpen(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to email invoice.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // 3. Share on WhatsApp Action
  const handleShareWhatsApp = () => {
    if (!shareUrl) {
      toast.error('Public share link is not available.');
      return;
    }
    const amountStr = formatCurrency(invoice.grandTotal, invoice.currency);
    const whatsappMsg = 
      `Hello ${invoice.client.name},\n\n` +
      `Here is invoice *${invoice.invoiceNumber}* for *${amountStr}* from *${invoice.business.name}*.\n\n` +
      `You can view and download the invoice details here:\n${shareUrl}`;
      
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMsg)}`;
    window.open(whatsappUrl, '_blank');
  };

  // 4. Copy Link Action
  const handleCopyLink = () => {
    if (!shareUrl) {
      toast.error('Public share link is not available.');
      return;
    }
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        toast.success('Link copied to clipboard!');
      })
      .catch((err) => {
        console.error('Could not copy text: ', err);
        toast.error('Failed to copy link.');
      });
  };

  return (
    <>
      <div className="flex flex-wrap gap-3 items-center w-full bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200/60 dark:border-slate-800/80 rounded-xl shadow-xs">
        {/* Download PDF */}
        <Button
          onClick={handleDownloadPDF}
          disabled={isDownloading}
          className="flex-1 min-w-[130px] h-10 font-bold text-xs bg-slate-900 hover:bg-slate-850 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 cursor-pointer transition-colors"
        >
          {isDownloading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              <span>Download PDF</span>
            </>
          )}
        </Button>

        {/* Email Invoice */}
        <Button
          variant="outline"
          onClick={() => setIsEmailDialogOpen(true)}
          className="flex-1 min-w-[130px] h-10 font-bold text-xs border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
        >
          <Mail className="w-4 h-4 mr-2 text-blue-500" />
          <span>Email Invoice</span>
        </Button>

        {/* Share on WhatsApp */}
        <Button
          variant="outline"
          onClick={handleShareWhatsApp}
          className="flex-1 min-w-[130px] h-10 font-bold text-xs border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
        >
          <MessageCircle className="w-4 h-4 mr-2 text-emerald-500 fill-emerald-500/10" />
          <span>WhatsApp</span>
        </Button>

        {/* Copy Link */}
        <Button
          variant="outline"
          onClick={handleCopyLink}
          className="flex-1 min-w-[130px] h-10 font-bold text-xs border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
        >
          <Link className="w-4 h-4 mr-2 text-indigo-500" />
          <span>Copy Link</span>
        </Button>
      </div>

      {/* Email Editor Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
              Email Invoice
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Send a professional email with a link to download the print-ready PDF invoice.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendEmail} className="space-y-4 pt-2">
            <div className="space-y-1 text-left">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                To (Recipient Email)
              </label>
              <Input
                type="email"
                required
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="client@example.com"
                className="h-9 text-sm border-slate-300 dark:border-slate-800 dark:bg-slate-950"
              />
            </div>

            <div className="space-y-1 text-left">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                Subject Line
              </label>
              <Input
                type="text"
                required
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Invoice Subject"
                className="h-9 text-sm border-slate-300 dark:border-slate-800 dark:bg-slate-950 font-medium"
              />
            </div>

            <div className="space-y-1 text-left">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                Message Body
              </label>
              <Textarea
                required
                rows={8}
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Write your message here..."
                className="text-sm border-slate-300 dark:border-slate-800 dark:bg-slate-950 leading-relaxed font-mono text-xs"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEmailDialogOpen(false)}
                className="h-9 font-bold text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSendingEmail}
                className="h-9 font-bold text-xs bg-slate-900 hover:bg-slate-850 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white cursor-pointer"
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 mr-2" />
                    <span>Send Email</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
