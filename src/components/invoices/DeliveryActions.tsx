'use client';

import React, { useState, useEffect } from 'react';
import { Download, Mail, Link, MessageCircle, Send, Loader2, Coins, Ban, ExternalLink } from 'lucide-react';
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
    status: string;
    razorpayPaymentLinkId?: string | null;
    razorpayPaymentLinkUrl?: string | null;
    razorpayPaymentLinkStatus?: string | null;
    business: {
      name: string;
    };
    client: {
      name: string;
      email?: string | null;
      phone?: string | null;
    };
  };
  onUpdate?: () => void;
}

export default function DeliveryActions({ invoice, onUpdate }: DeliveryActionsProps) {
  const [origin, setOrigin] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailTo, setEmailTo] = useState(invoice.client.email || '');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const [isWhatsAppDialogOpen, setIsWhatsAppDialogOpen] = useState(false);
  const [isSharingWhatsAppAutomated, setIsSharingWhatsAppAutomated] = useState(false);

  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [isCancellingLink, setIsCancellingLink] = useState(false);

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
  const handleShareWhatsAppClick = () => {
    if (!invoice.client.phone) {
      toast.error('Client does not have a phone number configured.');
      return;
    }
    setIsWhatsAppDialogOpen(true);
  };

  const handleSendWhatsAppAutomated = async () => {
    setIsSharingWhatsAppAutomated(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/whatsapp`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send WhatsApp message');

      toast.success(data.message || 'Invoice sent via WhatsApp successfully!');
      setIsWhatsAppDialogOpen(false);
      if (onUpdate) onUpdate();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to send WhatsApp message.');
    } finally {
      setIsSharingWhatsAppAutomated(false);
    }
  };

  const handleSendWhatsAppManual = () => {
    const amountStr = formatCurrency(invoice.grandTotal, invoice.currency);
    const whatsappMsg = 
      `Hello ${invoice.client.name},\n\n` +
      `Here is invoice *${invoice.invoiceNumber}* for *${amountStr}* from *${invoice.business.name}*.\n\n` +
      `You can view and download the invoice details here:\n${shareUrl}`;
      
    const rawPhone = invoice.client.phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(whatsappMsg)}`;
    window.open(whatsappUrl, '_blank');
    setIsWhatsAppDialogOpen(false);
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

  // 5. Razorpay Handlers
  const handleCreatePaymentLink = async () => {
    setIsCreatingLink(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/payment-link`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create payment link');
      }
      toast.success('Razorpay payment link generated successfully!');
      if (onUpdate) onUpdate();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Could not generate payment link.');
    } finally {
      setIsCreatingLink(false);
    }
  };

  const handleCancelPaymentLink = async () => {
    setIsCancellingLink(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/payment-link`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel payment link');
      }
      toast.success('Razorpay payment link cancelled.');
      if (onUpdate) onUpdate();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Could not cancel payment link.');
    } finally {
      setIsCancellingLink(false);
    }
  };

  const handleCopyPaymentLink = () => {
    if (!invoice.razorpayPaymentLinkUrl) {
      toast.error('No payment link available to copy.');
      return;
    }
    navigator.clipboard.writeText(invoice.razorpayPaymentLinkUrl)
      .then(() => {
        toast.success('Payment link copied to clipboard!');
      })
      .catch((err) => {
        console.error('Could not copy text: ', err);
        toast.error('Failed to copy link.');
      });
  };

  const isINR = invoice.currency.toUpperCase() === 'INR';
  const isUnpaid = ['SENT', 'PARTIAL', 'OVERDUE'].includes(invoice.status);

  return (
    <>
      <div className="flex flex-col gap-4 w-full bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200/60 dark:border-slate-800/80 rounded-xl shadow-xs">
        {/* Core Document & Sharing Actions */}
        <div className="flex flex-wrap gap-3 items-center w-full">
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
            onClick={handleShareWhatsAppClick}
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

        {/* Razorpay Online Payment Link Section */}
        {isINR && isUnpaid && (
          <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/80 w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5 text-left">
              <div className="flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-450 uppercase tracking-wider">
                  Razorpay Payments
                </span>
              </div>
              <p className="text-[11px] text-slate-450 dark:text-slate-500">
                {invoice.razorpayPaymentLinkStatus === 'created'
                  ? 'Payment link is active and copyable.'
                  : 'Generate a payment link for clients to pay via Card, UPI, etc.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {invoice.razorpayPaymentLinkId && invoice.razorpayPaymentLinkStatus === 'created' ? (
                <>
                  <Button
                    onClick={handleCopyPaymentLink}
                    className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-colors"
                  >
                    <Link className="w-3.5 h-3.5 mr-1.5" />
                    <span>Copy Payment Link</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => window.open(invoice.razorpayPaymentLinkUrl!, '_blank')}
                    className="h-9 text-xs font-bold border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                    <span>Open</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleCancelPaymentLink}
                    disabled={isCancellingLink}
                    className="h-9 text-xs font-bold border-red-200 hover:border-red-300 text-red-650 hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-950/20 cursor-pointer"
                  >
                    {isCancellingLink ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Ban className="w-3.5 h-3.5 mr-1.5 text-red-500" />
                    )}
                    <span>Cancel</span>
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleCreatePaymentLink}
                  disabled={isCreatingLink}
                  className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-colors"
                >
                  {isCreatingLink ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Coins className="w-3.5 h-3.5 mr-1.5" />
                      <span>Create Payment Link</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
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

      {/* WhatsApp Delivery Choices Dialog */}
      <Dialog open={isWhatsAppDialogOpen} onOpenChange={setIsWhatsAppDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
              Send Invoice via WhatsApp
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Select your delivery channel. Send automatically using the Virbic platform (Twilio Sandbox) or redirect to standard WhatsApp Web.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-left">
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                Recipient Client
              </span>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {invoice.client.name}
              </p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                {invoice.client.phone}
              </p>
            </div>

            <div className="p-4 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-xl border border-emerald-100 dark:border-emerald-950/20">
              <span className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1.5">
                Message Preview
              </span>
              <div className="font-sans text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-medium">
                {`*Invoice from ${invoice.business.name}*\n\nInvoice #: ${invoice.invoiceNumber}\nAmount: *${formatCurrency(invoice.grandTotal, invoice.currency)}*\nDue: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}\n\nView & Pay: ${shareUrl}`}
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={handleSendWhatsAppAutomated}
                disabled={isSharingWhatsAppAutomated}
                className="w-full h-10 font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer"
              >
                {isSharingWhatsAppAutomated ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>Delivering via Twilio...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    <span>Send Automatically (via Twilio API)</span>
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handleSendWhatsAppManual}
                className="w-full h-10 font-bold text-xs border-slate-300 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 mr-2 text-indigo-500" />
                <span>Open Manually (WhatsApp Web/App)</span>
              </Button>

              <Button
                variant="ghost"
                onClick={() => setIsWhatsAppDialogOpen(false)}
                className="w-full h-9 font-bold text-xs text-slate-500 cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
