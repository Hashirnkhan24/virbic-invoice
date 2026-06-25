import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet, pdf } from '@react-pdf/renderer';
import { formatCurrency, formatDate } from './helpers';
import { generateUPILink, generateQRCodeDataUrl } from './upi-generator';

/* ── Typings matching src/components/invoice-templates/types.ts ── */
export interface InvoiceLineItemInput {
  description: string;
  hsnCode?: string | null;
  quantity: number | string;
  unit?: string | null;
  rate: number | string;
  discount: number | string;
  discountType: 'PERCENTAGE' | 'AMOUNT';
  gstRate: number | string;
  cgstAmount?: number | string;
  sgstAmount?: number | string;
  igstAmount?: number | string;
  taxableValue?: number | string;
  totalAmount?: number | string;
}

export interface InvoicePDFData {
  invoiceNumber: string;
  template: string;
  currency: string;
  issueDate: Date | string;
  dueDate: Date | string;
  placeOfSupply: string;
  isInterState: boolean;
  reverseCharge: boolean;
  notes?: string | null;
  terms?: string | null;
  customFields?: Array<{ key: string; value: string }> | null;
  lineItems: InvoiceLineItemInput[];
  
  business: {
    name: string;
    gstin?: string | null;
    pan?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    phone?: string | null;
    email?: string | null;
    bankName?: string | null;
    accountNumber?: string | null;
    ifscCode?: string | null;
    upiId?: string | null;
    logo?: string | null;
    signature?: string | null;
    brandColor?: string | null;
  };
  
  client: {
    name: string;
    gstin?: string | null;
    email?: string | null;
    phone?: string | null;
    billingAddress?: string | null;
    billingCity?: string | null;
    billingState?: string | null;
    billingPincode?: string | null;
  };
  
  totals: {
    subTotal: number;
    discountTotal: number;
    taxableAmount: number;
    cgstTotal: number;
    sgstTotal: number;
    igstTotal: number;
    cessTotal: number;
    roundOff: number;
    grandTotal: number;
  };
}

/**
 * Dynamically resolves design colors based on active invoice template.
 */
function getTemplateTheme(template: string, brandColor = '#10b981') {
  const isDark = template === 'dark';
  
  let primary = brandColor || '#10b981';
  let secondary = '#ecfdf5'; // light emerald tint
  let bg = '#ffffff';
  let text = '#1e293b';
  let textSecondary = '#64748b';
  let headerBg: string | undefined = undefined;
  let headerTextColor = '#1e293b';

  switch (template) {
    case 'minimal':
      primary = '#0f172a';
      secondary = '#f8fafc';
      text = '#0f172a';
      textSecondary = '#475569';
      break;
    case 'professional':
      primary = brandColor || '#10b981';
      headerBg = '#0f172a';
      headerTextColor = '#ffffff';
      secondary = '#f1f5f9';
      break;
    case 'creative':
      primary = '#7c3aed'; // violet
      secondary = '#fdf2f8'; // pink tint
      text = '#1e293b';
      textSecondary = '#64748b';
      break;
    case 'dark':
      primary = '#10b981';
      secondary = '#1e293b';
      bg = '#020617';
      text = '#f8fafc';
      textSecondary = '#94a3b8';
      headerTextColor = '#f8fafc';
      break;
    case 'classic':
      primary = '#92400e'; // warm amber
      secondary = '#fffbeb';
      text = '#451a03';
      textSecondary = '#b45309';
      break;
    case 'gradient':
      primary = '#f97316'; // orange
      secondary = '#faf5ff'; // purple tint
      text = '#1e293b';
      textSecondary = '#64748b';
      break;
    case 'bold':
      primary = '#2563eb'; // blue
      secondary = '#eff6ff';
      text = '#0f172a';
      textSecondary = '#475569';
      break;
    case 'elegant':
      primary = '#b45309'; // gold
      secondary = '#fafaf9';
      text = '#1c1917';
      textSecondary = '#78716c';
      break;
    case 'startup':
      primary = '#22d3ee'; // cyan
      headerBg = '#020617'; // black
      headerTextColor = '#ffffff';
      secondary = '#ecfeff';
      text = '#0f172a';
      textSecondary = '#475569';
      break;
    case 'modern':
    default:
      primary = brandColor || '#10b981';
      secondary = '#ecfdf5';
      text = '#1e293b';
      textSecondary = '#64748b';
      break;
  }

  return { primary, secondary, bg, text, textSecondary, headerBg, headerTextColor, isDark };
}

/**
 * PDF Styling Factory
 */
const createStyles = (theme: ReturnType<typeof getTemplateTheme>) =>
  StyleSheet.create({
    page: {
      padding: 40,
      fontSize: 9,
      fontFamily: 'Helvetica',
      color: theme.text,
      backgroundColor: theme.bg,
      flexDirection: 'column',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 20,
      paddingBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: theme.isDark ? '#1e293b' : '#e2e8f0',
    },
    headerBanner: {
      margin: -40,
      marginBottom: 20,
      padding: 40,
      backgroundColor: theme.headerBg || theme.primary,
      color: theme.headerTextColor,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    headerLeft: {
      flexDirection: 'row',
      gap: 12,
    },
    logo: {
      width: 42,
      height: 42,
      borderRadius: 8,
      objectFit: 'contain',
    },
    logoPlaceholder: {
      width: 42,
      height: 42,
      borderRadius: 8,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoPlaceholderText: {
      color: '#ffffff',
      fontWeight: 'bold',
      fontSize: 16,
    },
    businessName: {
      fontSize: 13,
      fontWeight: 'bold',
      color: theme.headerBg ? '#ffffff' : theme.text,
      marginBottom: 3,
    },
    businessDetails: {
      fontSize: 8,
      color: theme.headerBg ? '#cbd5e1' : theme.textSecondary,
      lineHeight: 1.3,
    },
    headerRight: {
      alignItems: 'flex-end',
    },
    invoiceBadge: {
      fontSize: 9,
      fontWeight: 'bold',
      backgroundColor: theme.isDark ? '#064e3b' : theme.secondary,
      color: theme.primary,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
      marginBottom: 6,
      textTransform: 'uppercase',
    },
    invoiceMetaText: {
      fontSize: 8,
      color: theme.headerBg ? '#cbd5e1' : theme.textSecondary,
      marginBottom: 2,
    },
    clientSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    clientCol: {
      width: '60%',
    },
    supplyCol: {
      width: '35%',
      alignItems: 'flex-end',
    },
    sectionTitle: {
      fontSize: 8,
      fontWeight: 'bold',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      marginBottom: 4,
      letterSpacing: 0.5,
    },
    clientName: {
      fontSize: 11,
      fontWeight: 'bold',
      marginBottom: 3,
      color: theme.text,
    },
    clientDetails: {
      fontSize: 8,
      color: theme.textSecondary,
      lineHeight: 1.3,
    },
    reverseChargeBadge: {
      marginTop: 6,
      fontSize: 7,
      fontWeight: 'bold',
      backgroundColor: theme.isDark ? '#78350f' : '#fef3c7',
      color: '#b45309',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    table: {
      marginTop: 10,
      borderWidth: 1,
      borderColor: theme.isDark ? '#1e293b' : '#e2e8f0',
      borderRadius: 6,
      overflow: 'hidden',
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: theme.isDark ? '#0f172a' : '#f8fafc',
      borderBottomWidth: 1,
      borderBottomColor: theme.isDark ? '#1e293b' : '#e2e8f0',
      paddingVertical: 6,
      paddingHorizontal: 8,
      fontWeight: 'bold',
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.isDark ? '#1e293b' : '#f1f5f9',
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    tableRowEven: {
      backgroundColor: theme.isDark ? '#020617' : '#ffffff',
    },
    tableRowOdd: {
      backgroundColor: theme.isDark ? '#0b0f19' : '#f8fafc',
    },
    colNo: { width: '5%', fontSize: 8, color: theme.textSecondary },
    colDesc: { width: '38%', fontSize: 8 },
    colHsn: { width: '12%', fontSize: 8, textAlign: 'center' },
    colQty: { width: '10%', fontSize: 8, textAlign: 'right' },
    colRate: { width: '15%', fontSize: 8, textAlign: 'right' },
    colGst: { width: '10%', fontSize: 8, textAlign: 'right' },
    colAmount: { width: '15%', fontSize: 8, textAlign: 'right', fontWeight: 'bold' },
    discountText: {
      fontSize: 7,
      color: '#ef4444',
      marginTop: 1,
    },
    summarySection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
    },
    summaryLeft: {
      width: '55%',
    },
    summaryRight: {
      width: '40%',
    },
    bankBox: {
      backgroundColor: theme.isDark ? '#0b0f19' : '#f8fafc',
      borderWidth: 1,
      borderColor: theme.isDark ? '#1e293b' : '#f1f5f9',
      borderRadius: 6,
      padding: 8,
      marginBottom: 10,
    },
    bankTitle: {
      fontSize: 8,
      fontWeight: 'bold',
      color: theme.textSecondary,
      marginBottom: 4,
      textTransform: 'uppercase',
    },
    bankText: {
      fontSize: 8,
      color: theme.textSecondary,
      marginBottom: 2,
    },
    notesBox: {
      marginBottom: 10,
    },
    notesTitle: {
      fontSize: 8,
      fontWeight: 'bold',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    notesText: {
      fontSize: 8,
      color: theme.textSecondary,
      lineHeight: 1.3,
    },
    totalsTable: {
      flexDirection: 'column',
      gap: 4,
    },
    totalsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 2,
    },
    totalsLabel: {
      fontSize: 8,
      color: theme.textSecondary,
    },
    totalsValue: {
      fontSize: 8,
      fontWeight: 'bold',
      color: theme.text,
    },
    grandTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: theme.isDark ? '#064e3b' : theme.secondary,
      color: theme.primary,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 4,
      marginTop: 6,
      borderWidth: 1,
      borderColor: theme.isDark ? '#065f46' : '#a7f3d0',
    },
    grandTotalLabel: {
      fontSize: 9,
      fontWeight: 'bold',
      color: theme.isDark ? '#34d399' : theme.primary,
    },
    grandTotalValue: {
      fontSize: 10,
      fontWeight: 'bold',
      color: theme.isDark ? '#34d399' : theme.primary,
    },
    footer: {
      marginTop: 'auto',
      paddingTop: 15,
      borderTopWidth: 1,
      borderTopColor: theme.isDark ? '#1e293b' : '#e2e8f0',
    },
    footerCols: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    termsCol: {
      width: '55%',
    },
    signatureCol: {
      width: '40%',
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    signatureImg: {
      height: 35,
      width: 100,
      objectFit: 'contain',
      marginBottom: 3,
    },
    signatureLine: {
      width: 120,
      borderTopWidth: 1,
      borderTopColor: theme.isDark ? '#334155' : '#cbd5e1',
      marginTop: 4,
      marginBottom: 2,
    },
    signatureLabel: {
      fontSize: 7,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    signatureBusiness: {
      fontSize: 8,
      fontWeight: 'bold',
      color: theme.text,
      textAlign: 'center',
    },
    qrContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 6,
    },
    qrImg: {
      width: 50,
      height: 50,
      borderRadius: 4,
    },
    qrTextCol: {
      flexDirection: 'column',
      justifyContent: 'center',
    },
    qrTextTitle: {
      fontSize: 7,
      fontWeight: 'bold',
      color: theme.text,
    },
    qrTextSub: {
      fontSize: 6,
      color: theme.textSecondary,
    },
    paidStampContainer: {
      position: 'absolute',
      top: 130,
      right: 40,
      borderWidth: 2,
      borderColor: '#10b981',
      borderRadius: 4,
      padding: '4 8',
      transform: 'rotate(-12deg)',
      alignItems: 'center',
      opacity: 0.8,
    },
    paidStampText: {
      color: '#10b981',
      fontSize: 14,
      fontFamily: 'Helvetica-Bold',
      fontWeight: 'bold',
      letterSpacing: 1,
    },
    paidStampSubtext: {
      color: '#10b981',
      fontSize: 8,
      fontFamily: 'Helvetica-Bold',
      fontWeight: 'bold',
      marginTop: 2,
    },
  });

/* ── React-PDF Document Component ── */
interface InvoicePDFDocumentProps {
  data: InvoicePDFData;
  qrCodeDataUrl?: string;
  logoBase64?: string;
  signatureBase64?: string;
  asReceipt?: boolean;
}

export function InvoicePDFDocument({
  data,
  qrCodeDataUrl,
  logoBase64,
  signatureBase64,
  asReceipt = false,
}: InvoicePDFDocumentProps) {
  const theme = getTemplateTheme(data.template, data.business.brandColor || undefined);
  const styles = createStyles(theme);

  const businessInitial = data.business.name.charAt(0).toUpperCase() || 'B';
  const showHeaderBanner = theme.headerBg !== undefined;
  
  // Format line items row calculations
  const computeRow = (item: InvoiceLineItemInput) => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const discountVal = Number(item.discount) || 0;
    const rowSub = qty * rate;
    let itemDiscount = 0;
    if (item.discountType === 'PERCENTAGE') {
      itemDiscount = rowSub * (discountVal / 100);
    } else {
      itemDiscount = Math.min(discountVal, rowSub);
    }
    const finalAmount = rowSub - itemDiscount;
    return { qty, rate, discountAmount: itemDiscount, finalAmount };
  };

  const businessInfo = (
    <View>
      <Text style={styles.businessName}>{data.business.name}</Text>
      {data.business.gstin && (
        <Text style={styles.businessDetails}>GSTIN: {data.business.gstin}</Text>
      )}
      {data.business.pan && (
        <Text style={styles.businessDetails}>PAN: {data.business.pan}</Text>
      )}
      {(data.business.address || data.business.city || data.business.state) && (
        <Text style={styles.businessDetails}>
          {[
            data.business.address,
            data.business.city,
            data.business.state,
            data.business.pincode,
          ]
            .filter(Boolean)
            .join(', ')}
        </Text>
      )}
      {data.business.phone && (
        <Text style={styles.businessDetails}>Ph: {data.business.phone}</Text>
      )}
      {data.business.email && (
        <Text style={styles.businessDetails}>{data.business.email}</Text>
      )}
    </View>
  );

  const invoiceMeta = (
    <View style={styles.headerRight}>
      <Text style={styles.invoiceBadge}>{asReceipt ? 'RECEIPT' : 'Tax Invoice'}</Text>
      <Text style={styles.invoiceMetaText}>
        {asReceipt ? 'Receipt' : 'Invoice'} #: <Text style={{ fontWeight: 'bold' }}>{asReceipt ? `RCT-${data.invoiceNumber}` : data.invoiceNumber}</Text>
      </Text>
      <Text style={styles.invoiceMetaText}>
        Issue Date: {formatDate(data.issueDate)}
      </Text>
      {asReceipt ? (
        <Text style={styles.invoiceMetaText}>
          Paid on: {formatDate((data as any).paymentDate || data.issueDate)}
        </Text>
      ) : (
        <Text style={styles.invoiceMetaText}>
          Due Date: {formatDate(data.dueDate)}
        </Text>
      )}
      {asReceipt && (
        <Text style={styles.invoiceMetaText}>
          Original Invoice: {data.invoiceNumber}
        </Text>
      )}
    </View>
  );

  return (
    <Document title={asReceipt ? `Receipt_${data.invoiceNumber}` : `Invoice_${data.invoiceNumber}`}>
      <Page size="A4" style={styles.page}>
        {/* PAID Watermark/Stamp */}
        {asReceipt && (
          <View style={styles.paidStampContainer}>
            <Text style={styles.paidStampText}>PAID IN FULL</Text>
            <Text style={styles.paidStampSubtext}>
              {formatCurrency(data.totals.grandTotal, data.currency)}
            </Text>
          </View>
        )}
        {/* ── HEADER ── */}
        {showHeaderBanner ? (
          <View style={styles.headerBanner}>
            <View style={styles.headerLeft}>
              {logoBase64 ? (
                <Image src={logoBase64} style={styles.logo} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Text style={styles.logoPlaceholderText}>{businessInitial}</Text>
                </View>
              )}
              {businessInfo}
            </View>
            {invoiceMeta}
          </View>
        ) : (
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {logoBase64 ? (
                <Image src={logoBase64} style={styles.logo} />
              ) : (
                <View style={[styles.logoPlaceholder, { backgroundColor: theme.primary }]}>
                  <Text style={styles.logoPlaceholderText}>{businessInitial}</Text>
                </View>
              )}
              {businessInfo}
            </View>
            {invoiceMeta}
          </View>
        )}

        {/* ── CLIENT & SUPPLY SECTION ── */}
        <View style={styles.clientSection}>
          <View style={styles.clientCol}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <Text style={styles.clientName}>{data.client.name}</Text>
            {data.client.gstin && (
              <Text style={styles.clientDetails}>GSTIN: {data.client.gstin}</Text>
            )}
            {(data.client.billingAddress || data.client.billingCity || data.client.billingState) && (
              <Text style={styles.clientDetails}>
                {[
                  data.client.billingAddress,
                  data.client.billingCity,
                  data.client.billingState,
                  data.client.billingPincode,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </Text>
            )}
            {data.client.phone && (
              <Text style={styles.clientDetails}>Ph: {data.client.phone}</Text>
            )}
            {data.client.email && (
              <Text style={styles.clientDetails}>{data.client.email}</Text>
            )}
          </View>
          <View style={styles.supplyCol}>
            {data.placeOfSupply && (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.sectionTitle}>Place of Supply</Text>
                <Text style={[styles.clientName, { fontSize: 9 }]}>{data.placeOfSupply}</Text>
              </View>
            )}
            {data.reverseCharge && (
              <Text style={styles.reverseChargeBadge}>Reverse Charge Applicable</Text>
            )}
          </View>
        </View>

        {/* ── LINE ITEMS TABLE ── */}
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableHeader}>
            <Text style={styles.colNo}>#</Text>
            <Text style={styles.colDesc}>Item Description</Text>
            <Text style={styles.colHsn}>HSN/SAC</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colRate}>Rate</Text>
            <Text style={styles.colGst}>GST</Text>
            <Text style={styles.colAmount}>Amount</Text>
          </View>
          
          {/* Rows */}
          {data.lineItems.map((item, idx) => {
            const calculations = computeRow(item);
            const isEven = idx % 2 === 0;
            return (
              <View
                key={idx}
                style={[
                  styles.tableRow,
                  isEven ? styles.tableRowEven : styles.tableRowOdd,
                ]}
              >
                <Text style={styles.colNo}>{idx + 1}</Text>
                
                <View style={styles.colDesc}>
                  <Text style={{ fontWeight: 'bold' }}>{item.description || '—'}</Text>
                  {item.unit && (
                    <Text style={{ fontSize: 7, color: theme.textSecondary }}>Unit: {item.unit}</Text>
                  )}
                </View>
                
                <Text style={styles.colHsn}>{item.hsnCode || '—'}</Text>
                <Text style={styles.colQty}>{calculations.qty}</Text>
                
                <View style={styles.colRate}>
                  <Text>{formatCurrency(calculations.rate, data.currency)}</Text>
                  {calculations.discountAmount > 0 && (
                    <Text style={styles.discountText}>
                      -{' '}
                      {item.discountType === 'PERCENTAGE'
                        ? `${Number(item.discount)}%`
                        : formatCurrency(calculations.discountAmount, data.currency)}
                    </Text>
                  )}
                </View>
                
                <Text style={styles.colGst}>{Number(item.gstRate) || 0}%</Text>
                <Text style={styles.colAmount}>
                  {formatCurrency(calculations.finalAmount, data.currency)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* ── SUMMARY SECTION ── */}
        <View style={styles.summarySection}>
          {/* Left Column: Bank Details & QR & Notes */}
          <View style={styles.summaryLeft}>
            {/* Bank Details */}
            {(data.business.bankName || data.business.accountNumber || data.business.ifscCode || data.business.upiId) && (
              <View style={styles.bankBox}>
                <Text style={styles.bankTitle}>Bank Details</Text>
                {data.business.bankName && (
                  <Text style={styles.bankText}>Bank: {data.business.bankName}</Text>
                )}
                {data.business.accountNumber && (
                  <Text style={styles.bankText}>A/c No: {data.business.accountNumber}</Text>
                )}
                {data.business.ifscCode && (
                  <Text style={styles.bankText}>IFSC: {data.business.ifscCode}</Text>
                )}
                {data.business.upiId && (
                  <Text style={styles.bankText}>UPI ID: {data.business.upiId}</Text>
                )}
              </View>
            )}
            
            {/* Notes */}
            {data.notes && (
              <View style={styles.notesBox}>
                <Text style={styles.notesTitle}>Notes</Text>
                <Text style={styles.notesText}>{data.notes}</Text>
              </View>
            )}
          </View>
          
          {/* Right Column: Totals */}
          <View style={styles.summaryRight}>
            <View style={styles.totalsTable}>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Subtotal</Text>
                <Text style={styles.totalsValue}>
                  {formatCurrency(data.totals.subTotal, data.currency)}
                </Text>
              </View>
              
              {data.totals.discountTotal > 0 && (
                <View style={styles.totalsRow}>
                  <Text style={[styles.totalsLabel, { color: '#ef4444' }]}>Discount</Text>
                  <Text style={[styles.totalsValue, { color: '#ef4444' }]}>
                    -{formatCurrency(data.totals.discountTotal, data.currency)}
                  </Text>
                </View>
              )}
              
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Taxable Value</Text>
                <Text style={styles.totalsValue}>
                  {formatCurrency(data.totals.taxableAmount, data.currency)}
                </Text>
              </View>
              
              {data.currency === 'INR' ? (
                <>
                  {data.totals.cgstTotal > 0 && (
                    <View style={styles.totalsRow}>
                      <Text style={styles.totalsLabel}>CGST</Text>
                      <Text style={styles.totalsValue}>
                        {formatCurrency(data.totals.cgstTotal, data.currency)}
                      </Text>
                    </View>
                  )}
                  
                  {data.totals.sgstTotal > 0 && (
                    <View style={styles.totalsRow}>
                      <Text style={styles.totalsLabel}>SGST</Text>
                      <Text style={styles.totalsValue}>
                        {formatCurrency(data.totals.sgstTotal, data.currency)}
                      </Text>
                    </View>
                  )}
                  
                  {data.totals.igstTotal > 0 && (
                    <View style={styles.totalsRow}>
                      <Text style={styles.totalsLabel}>IGST</Text>
                      <Text style={styles.totalsValue}>
                        {formatCurrency(data.totals.igstTotal, data.currency)}
                      </Text>
                    </View>
                  )}
                  
                  {data.totals.cessTotal > 0 && (
                    <View style={styles.totalsRow}>
                      <Text style={styles.totalsLabel}>Cess</Text>
                      <Text style={styles.totalsValue}>
                        {formatCurrency(data.totals.cessTotal, data.currency)}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <>
                  {(data.totals.cgstTotal + data.totals.sgstTotal + data.totals.igstTotal + data.totals.cessTotal) > 0 && (
                    <View style={styles.totalsRow}>
                      <Text style={styles.totalsLabel}>Tax</Text>
                      <Text style={styles.totalsValue}>
                        {formatCurrency(
                          data.totals.cgstTotal + data.totals.sgstTotal + data.totals.igstTotal + data.totals.cessTotal,
                          data.currency
                        )}
                      </Text>
                    </View>
                  )}
                </>
              )}
              
              {data.totals.roundOff !== 0 && (
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>Round Off</Text>
                  <Text style={styles.totalsValue}>
                    {data.totals.roundOff > 0 ? '+' : ''}
                    {formatCurrency(data.totals.roundOff, data.currency)}
                  </Text>
                </View>
              )}
              
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                <Text style={styles.grandTotalValue}>
                  {formatCurrency(data.totals.grandTotal, data.currency)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── FOOTER ── */}
        <View style={styles.footer}>
          <View style={styles.footerCols}>
            {/* Terms and Conditions / QR Code */}
            <View style={styles.termsCol}>
              {data.terms && (
                <View style={{ marginBottom: 10 }}>
                  <Text style={styles.notesTitle}>Terms & Conditions</Text>
                  <Text style={styles.notesText}>{data.terms}</Text>
                </View>
              )}
              
              {/* Payment QR Code */}
              {qrCodeDataUrl && (
                <View style={styles.qrContainer}>
                  <Image src={qrCodeDataUrl} style={styles.qrImg} />
                  <View style={styles.qrTextCol}>
                    <Text style={styles.qrTextTitle}>Scan to Pay via UPI</Text>
                    <Text style={styles.qrTextSub}>Supports all BHIM/UPI apps</Text>
                  </View>
                </View>
              )}
            </View>
            
            {/* Signature Box */}
            <View style={styles.signatureCol}>
              {signatureBase64 ? (
                <Image src={signatureBase64} style={styles.signatureImg} />
              ) : (
                <View style={{ height: 35 }} />
              )}
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Authorized Signatory</Text>
              <Text style={styles.signatureBusiness}>{data.business.name}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

/**
 * Cross-platform helper to convert a image URL to a base64 string.
 * Resolves images for both Server-side Node and Client-side Browser PDF compilation.
 */
export async function fetchImageAsBase64(url?: string | null): Promise<string | undefined> {
  if (!url) return undefined;
  if (url.startsWith('data:')) return url;
  try {
    // If relative path, prepend APP URL
    let absoluteUrl = url;
    if (url.startsWith('/')) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      absoluteUrl = `${appUrl}${url}`;
    }

    const res = await fetch(absoluteUrl);
    if (!res.ok) throw new Error(`Fetch failed with status ${res.status}`);
    
    if (typeof window === 'undefined') {
      // Server-side
      const arrayBuffer = await res.arrayBuffer();
      const contentType = res.headers.get('content-type') || 'image/png';
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      return `data:${contentType};base64,${base64}`;
    } else {
      // Client-side
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(undefined);
        reader.readAsDataURL(blob);
      });
    }
  } catch (error) {
    console.error('Failed to convert image to base64 for PDF rendering:', error);
    return undefined;
  }
}

/**
 * Primary visual entrypoint for PDF Generation.
 * Returns either a Node Buffer (Server-side) or a Blob (Client-side).
 */
export async function generateInvoicePDF(
  invoiceData: InvoicePDFData,
  options?: { asReceipt?: boolean }
): Promise<any> {
  // 1. Prefetch logo and signature images to Base64
  const [logoBase64, signatureBase64] = await Promise.all([
    fetchImageAsBase64(invoiceData.business.logo),
    fetchImageAsBase64(invoiceData.business.signature),
  ]);

  // 2. Generate UPI QR code data URL if UPI ID is present and currency is INR
  let qrCodeDataUrl: string | undefined = undefined;
  if (invoiceData.business.upiId && invoiceData.currency === 'INR') {
    const upiLink = generateUPILink({
      upiId: invoiceData.business.upiId,
      amount: invoiceData.totals.grandTotal,
      payeeName: invoiceData.business.name,
      invoiceNumber: invoiceData.invoiceNumber,
    });
    qrCodeDataUrl = await generateQRCodeDataUrl(upiLink, 120);
  }

  // 3. Compile PDF document
  const doc = React.createElement(InvoicePDFDocument, {
    data: invoiceData,
    qrCodeDataUrl,
    logoBase64,
    signatureBase64,
    asReceipt: options?.asReceipt,
  });

  const pdfInstance = pdf(doc as any);

  if (typeof window === 'undefined') {
    // Node.js environment - consume the PDFDocument stream to return a Buffer
    const stream = await pdfInstance.toBuffer();
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: any) => chunks.push(Buffer.from(chunk)));
      stream.on('error', (err: any) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  } else {
    // Browser environment
    return await pdfInstance.toBlob();
  }
}
