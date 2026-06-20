import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateInvoicePDF } from '@/lib/pdf-generator';
import { getAuthUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const { id } = await params;

    // Fetch invoice with business, client and line items
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        business: true,
        client: true,
        lineItems: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Map Decimal fields to standard numbers for PDF generator
    const pdfData = {
      invoiceNumber: invoice.invoiceNumber,
      template: invoice.template,
      currency: invoice.currency,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      placeOfSupply: invoice.placeOfSupply,
      isInterState: invoice.isInterState,
      reverseCharge: invoice.reverseCharge,
      notes: invoice.notes,
      terms: invoice.terms,
      customFields: invoice.customFields as any,
      
      business: {
        name: invoice.business.name,
        gstin: invoice.business.gstin,
        pan: invoice.business.pan,
        address: invoice.business.address,
        city: invoice.business.city,
        state: invoice.business.state,
        pincode: invoice.business.pincode,
        phone: invoice.business.phone,
        email: invoice.business.email,
        bankName: invoice.business.bankName,
        accountNumber: invoice.business.accountNumber,
        ifscCode: invoice.business.ifscCode,
        upiId: invoice.business.upiId,
        logo: invoice.business.logo,
        signature: invoice.business.signature,
        brandColor: invoice.business.brandColor,
      },
      
      client: {
        name: invoice.client.name,
        gstin: invoice.client.gstin,
        email: invoice.client.email,
        phone: invoice.client.phone,
        billingAddress: invoice.client.billingAddress,
        billingCity: invoice.client.billingCity,
        billingState: invoice.client.billingState,
        billingPincode: invoice.client.billingPincode,
      },
      
      lineItems: invoice.lineItems.map((item) => ({
        description: item.description,
        hsnCode: item.hsnCode,
        quantity: Number(item.quantity),
        unit: item.unit,
        rate: Number(item.rate),
        discount: Number(item.discount),
        discountType: item.discountType as 'PERCENTAGE' | 'AMOUNT',
        gstRate: Number(item.gstRate),
        cgstAmount: Number(item.cgstAmount),
        sgstAmount: Number(item.sgstAmount),
        igstAmount: Number(item.igstAmount),
        taxableValue: Number(item.taxableValue),
        totalAmount: Number(item.totalAmount),
      })),
      
      totals: {
        subTotal: Number(invoice.subTotal),
        discountTotal: Number(invoice.discountTotal),
        taxableAmount: Number(invoice.taxableAmount),
        cgstTotal: Number(invoice.cgstTotal),
        sgstTotal: Number(invoice.sgstTotal),
        igstTotal: Number(invoice.igstTotal),
        cessTotal: Number(invoice.cessTotal),
        roundOff: Number(invoice.roundOff),
        grandTotal: Number(invoice.grandTotal),
      },
    };

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(pdfData);

    // Clean invoice number for filename
    const cleanInvoiceNum = invoice.invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
    const filename = `Invoice_${cleanInvoiceNum}.pdf`;

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating PDF route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
