'use client';

import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface PublicDownloadButtonProps {
  shareId: string;
  password?: string;
  invoiceNumber: string;
}

export default function PublicDownloadButton({
  shareId,
  password,
  invoiceNumber,
}: PublicDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      let url = `/api/invoices/share/${shareId}/pdf`;
      if (password) {
        url += `?password=${encodeURIComponent(password)}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      const cleanNum = invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
      link.download = `Invoice_${cleanNum}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      
      toast.success('PDF downloaded successfully!');
    } catch (error: any) {
      console.error(error);
      toast.error('Could not download PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={isDownloading}
      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 px-5 rounded-lg cursor-pointer flex items-center gap-2 shadow-sm shrink-0"
    >
      {isDownloading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Generating PDF...</span>
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          <span>Download PDF</span>
        </>
      )}
    </Button>
  );
}
