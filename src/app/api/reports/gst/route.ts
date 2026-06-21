import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { convertCurrency } from '@/lib/currency';

function getFinancialYearDates() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0 = Jan, 3 = April
  let startYear = year;
  if (month < 3) {
    startYear = year - 1;
  }
  const startDate = new Date(startYear, 3, 1); // April 1st
  const endDate = new Date(startYear + 1, 2, 31, 23, 59, 59, 999); // March 31st
  return { startDate, endDate };
}

export async function GET(request: NextRequest) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;

    const searchParams = request.nextUrl.searchParams;
    let businessId = searchParams.get('businessId');
    if (businessId) {
      businessId = businessId.replace(/^"|"$/g, '');
      if (businessId === 'null' || businessId === 'undefined') {
        businessId = null;
      }
    }
    
    let startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : null;
    let endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : null;

    if (!startDate || !endDate) {
      const defaultDates = getFinancialYearDates();
      if (!startDate) startDate = defaultDates.startDate;
      if (!endDate) endDate = defaultDates.endDate;
    }

    const whereCondition: any = {
      userId: user.id,
      issueDate: {
        gte: startDate,
        lte: endDate,
      },
      status: {
        notIn: ['DRAFT', 'CANCELLED'],
      },
    };

    if (businessId && businessId !== 'all') {
      whereCondition.businessId = businessId;
    }

    const invoices = await prisma.invoice.findMany({
      where: whereCondition,
      include: {
        client: true,
        lineItems: true,
      },
      orderBy: {
        issueDate: 'asc',
      },
    });

    const b2bInvoices: any[] = [];
    const b2cInvoices: any[] = [];

    // GST Slabs Aggregations
    const slabAggregates: Record<number, { rate: number; taxableValue: number; cgst: number; sgst: number; igst: number; cess: number; total: number }> = {};
    
    // HSN Code Aggregations
    const hsnAggregates: Record<string, { hsnCode: string; description: string; quantity: number; unit: string; taxableValue: number; cgst: number; sgst: number; igst: number; total: number }> = {};

    // B2C State-wise Aggregations
    const b2cStateMap: Record<string, { state: string; taxableValue: number; cgst: number; sgst: number; igst: number; total: number }> = {};

    invoices.forEach((inv) => {
      const isB2B = !!(inv.client.gstin && inv.client.gstin.trim().length > 0);
      
      const invData = {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        issueDate: inv.issueDate,
        clientName: inv.client.name,
        clientGstin: inv.client.gstin || '',
        placeOfSupply: inv.placeOfSupply,
        isInterState: inv.isInterState,
        currency: inv.currency,
        
        // Totals (convert to INR for consolidated reports)
        subTotal: convertCurrency(Number(inv.subTotal), inv.currency, 'INR'),
        taxableAmount: convertCurrency(Number(inv.taxableAmount), inv.currency, 'INR'),
        cgstTotal: convertCurrency(Number(inv.cgstTotal), inv.currency, 'INR'),
        sgstTotal: convertCurrency(Number(inv.sgstTotal), inv.currency, 'INR'),
        igstTotal: convertCurrency(Number(inv.igstTotal), inv.currency, 'INR'),
        cessTotal: convertCurrency(Number(inv.cessTotal), inv.currency, 'INR'),
        grandTotal: convertCurrency(Number(inv.grandTotal), inv.currency, 'INR'),
      };

      if (isB2B) {
        b2bInvoices.push(invData);
      } else {
        b2cInvoices.push(invData);
        
        // Group B2C sales by Place of Supply
        const stateKey = inv.placeOfSupply || 'Unknown';
        if (!b2cStateMap[stateKey]) {
          b2cStateMap[stateKey] = {
            state: stateKey,
            taxableValue: 0,
            cgst: 0,
            sgst: 0,
            igst: 0,
            total: 0,
          };
        }
        b2cStateMap[stateKey].taxableValue += invData.taxableAmount;
        b2cStateMap[stateKey].cgst += invData.cgstTotal;
        b2cStateMap[stateKey].sgst += invData.sgstTotal;
        b2cStateMap[stateKey].igst += invData.igstTotal;
        b2cStateMap[stateKey].total += invData.grandTotal;
      }

      // Aggregate line items for Slabs and HSN Code summaries
      inv.lineItems.forEach((item) => {
        const gstRate = Number(item.gstRate);
        const taxableValINR = convertCurrency(Number(item.taxableValue), inv.currency, 'INR');
        const cgstINR = convertCurrency(Number(item.cgstAmount), inv.currency, 'INR');
        const sgstINR = convertCurrency(Number(item.sgstAmount), inv.currency, 'INR');
        const igstINR = convertCurrency(Number(item.igstAmount), inv.currency, 'INR');
        const totalINR = convertCurrency(Number(item.totalAmount), inv.currency, 'INR');

        // 1. Slab aggregation
        if (!slabAggregates[gstRate]) {
          slabAggregates[gstRate] = {
            rate: gstRate,
            taxableValue: 0,
            cgst: 0,
            sgst: 0,
            igst: 0,
            cess: 0,
            total: 0,
          };
        }
        slabAggregates[gstRate].taxableValue += taxableValINR;
        slabAggregates[gstRate].cgst += cgstINR;
        slabAggregates[gstRate].sgst += sgstINR;
        slabAggregates[gstRate].igst += igstINR;
        slabAggregates[gstRate].total += totalINR;

        // 2. HSN aggregation
        const hsn = item.hsnCode || 'NO-HSN';
        if (!hsnAggregates[hsn]) {
          hsnAggregates[hsn] = {
            hsnCode: hsn,
            description: item.description || '',
            quantity: 0,
            unit: item.unit || 'PCS',
            taxableValue: 0,
            cgst: 0,
            sgst: 0,
            igst: 0,
            total: 0,
          };
        }
        hsnAggregates[hsn].quantity += Number(item.quantity);
        hsnAggregates[hsn].taxableValue += taxableValINR;
        hsnAggregates[hsn].cgst += cgstINR;
        hsnAggregates[hsn].sgst += sgstINR;
        hsnAggregates[hsn].igst += igstINR;
        hsnAggregates[hsn].total += totalINR;
      });
    });

    // Formatting totals for response
    const gstSlabs = Object.values(slabAggregates).sort((a, b) => a.rate - b.rate);
    const hsnSummaries = Object.values(hsnAggregates).sort((a, b) => a.hsnCode.localeCompare(b.hsnCode));
    const b2cStateSummaries = Object.values(b2cStateMap).sort((a, b) => a.state.localeCompare(b.state));

    // Consolidated Tax Totals
    let totalTaxable = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;

    gstSlabs.forEach((s) => {
      totalTaxable += s.taxableValue;
      totalCGST += s.cgst;
      totalSGST += s.sgst;
      totalIGST += s.igst;
    });

    return NextResponse.json({
      summary: {
        totalTaxable: Math.round(totalTaxable),
        totalCGST: Math.round(totalCGST),
        totalSGST: Math.round(totalSGST),
        totalIGST: Math.round(totalIGST),
        totalTaxCollected: Math.round(totalCGST + totalSGST + totalIGST),
      },
      b2b: b2bInvoices,
      b2c: b2cInvoices,
      b2cStateSummaries,
      gstSlabs,
      hsnSummaries,
    });
  } catch (err: any) {
    console.error('[API_REPORTS_GST] Error:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
