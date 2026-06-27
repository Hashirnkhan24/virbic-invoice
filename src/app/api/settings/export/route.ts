import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';



// Simple robust CSV parser
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          cell += '"';
          i++; // Skip escape quote
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(cell.trim());
        cell = '';
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(cell.trim());
        lines.push(row);
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }
  }

  if (cell || row.length > 0) {
    row.push(cell.trim());
    lines.push(row);
  }

  return lines.filter(line => line.length > 0 && line.some(c => c !== ''));
}

// Helper to format values for CSV (escaping quotes/commas)
function formatCSVCell(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val).replace(/"/g, '""');
  if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
    return `"${str}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'invoices_json') {
      const invoices = await prisma.invoice.findMany({
        where: { userId: user.id },
        include: { client: true, lineItems: true },
      });
      return new NextResponse(JSON.stringify(invoices, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename=invoices_export.json',
        },
      });
    }

    if (type === 'invoices_excel' || type === 'invoices_csv') {
      const invoices = await prisma.invoice.findMany({
        where: { userId: user.id },
        include: { client: true },
      });

      const headers = ['Invoice Number', 'Client Name', 'Client Email', 'Issue Date', 'Due Date', 'Status', 'Currency', 'Sub Total', 'Discount Total', 'Taxable Amount', 'CGST Total', 'SGST Total', 'IGST Total', 'CESS Total', 'Round Off', 'Grand Total', 'Amount Paid'];
      const rows = invoices.map(inv => [
        inv.invoiceNumber,
        inv.client.name,
        inv.client.email || '',
        inv.issueDate.toISOString().split('T')[0],
        inv.dueDate.toISOString().split('T')[0],
        inv.status,
        inv.currency,
        Number(inv.subTotal),
        Number(inv.discountTotal),
        Number(inv.taxableAmount),
        Number(inv.cgstTotal),
        Number(inv.sgstTotal),
        Number(inv.igstTotal),
        Number(inv.cessTotal),
        Number(inv.roundOff),
        Number(inv.grandTotal),
        Number(inv.amountPaid),
      ]);

      const csvContent = [headers, ...rows].map(r => r.map(formatCSVCell).join(',')).join('\n');
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=invoices_export.csv',
        },
      });
    }

    if (type === 'clients_csv') {
      const clients = await prisma.client.findMany({
        where: { userId: user.id },
      });

      const headers = ['Name', 'GSTIN', 'Email', 'Phone', 'Billing Address', 'Billing City', 'Billing State', 'Billing Pincode'];
      const rows = clients.map(c => [
        c.name,
        c.gstin || '',
        c.email || '',
        c.phone || '',
        c.billingAddress || '',
        c.billingCity || '',
        c.billingState || '',
        c.billingPincode || '',
      ]);

      const csvContent = [headers, ...rows].map(r => r.map(formatCSVCell).join(',')).join('\n');
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=clients_export.csv',
        },
      });
    }

    return NextResponse.json({ error: 'Invalid export type specified' }, { status: 400 });
  } catch (error: any) {
    console.error('Error exporting data:', error);
    return NextResponse.json({ error: error.message || 'Export failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const importType = formData.get('importType') as string; // 'clients' or 'items'

    if (!file || !importType) {
      return NextResponse.json({ error: 'File and importType are required' }, { status: 400 });
    }

    const text = await file.text();
    const csvData = parseCSV(text);

    if (csvData.length < 2) {
      return NextResponse.json({ error: 'CSV file is empty or missing data rows' }, { status: 400 });
    }

    const headers = csvData[0].map(h => h.toLowerCase().trim());
    const dataRows = csvData.slice(1);
    let count = 0;

    // Get default business (for item references if businessId is needed)
    const defaultBusiness = await prisma.business.findFirst({
      where: { userId: user.id, isDefault: true },
    });

    if (importType === 'clients') {
      const nameIndex = headers.indexOf('name');
      if (nameIndex === -1) {
        return NextResponse.json({ error: 'CSV must contain a "Name" column' }, { status: 400 });
      }

      const gstinIndex = headers.indexOf('gstin');
      const emailIndex = headers.indexOf('email');
      const phoneIndex = headers.indexOf('phone');
      const addressIndex = headers.indexOf('billing address') !== -1 ? headers.indexOf('billing address') : headers.indexOf('address');
      const cityIndex = headers.indexOf('billing city') !== -1 ? headers.indexOf('billing city') : headers.indexOf('city');
      const stateIndex = headers.indexOf('billing state') !== -1 ? headers.indexOf('billing state') : headers.indexOf('state');
      const pincodeIndex = headers.indexOf('billing pincode') !== -1 ? headers.indexOf('billing pincode') : headers.indexOf('pincode');

      for (const row of dataRows) {
        const name = row[nameIndex];
        if (!name) continue;

        await prisma.client.create({
          data: {
            userId: user.id,
            businessId: defaultBusiness?.id || null,
            name,
            gstin: gstinIndex !== -1 ? row[gstinIndex] || null : null,
            email: emailIndex !== -1 ? row[emailIndex] || null : null,
            phone: phoneIndex !== -1 ? row[phoneIndex] || null : null,
            billingAddress: addressIndex !== -1 ? row[addressIndex] || null : null,
            billingCity: cityIndex !== -1 ? row[cityIndex] || null : null,
            billingState: stateIndex !== -1 ? row[stateIndex] || null : null,
            billingPincode: pincodeIndex !== -1 ? row[pincodeIndex] || null : null,
          },
        });
        count++;
      }
    } else if (importType === 'items') {
      const nameIndex = headers.indexOf('name');
      const rateIndex = headers.indexOf('rate');

      if (nameIndex === -1 || rateIndex === -1) {
        return NextResponse.json({ error: 'CSV must contain "Name" and "Rate" columns' }, { status: 400 });
      }

      const descIndex = headers.indexOf('description');
      const hsnIndex = headers.indexOf('hsncode') !== -1 ? headers.indexOf('hsncode') : headers.indexOf('hsn');
      const gstIndex = headers.indexOf('gstrate') !== -1 ? headers.indexOf('gstrate') : headers.indexOf('gst');
      const unitIndex = headers.indexOf('unit');
      
      // Look for type column aliases
      const typeAliases = ['type', 'item type', 'category', 'product/service', 'product or service', 'isservice', 'is_service'];
      let serviceIndex = -1;
      for (const alias of typeAliases) {
        const idx = headers.indexOf(alias);
        if (idx !== -1) {
          serviceIndex = idx;
          break;
        }
      }

      for (const row of dataRows) {
        const name = row[nameIndex];
        const rateVal = parseFloat(row[rateIndex]);
        if (!name || isNaN(rateVal)) continue;

        const gstRateVal = gstIndex !== -1 ? parseFloat(row[gstIndex]) : 18.00;
        
        let isService = true;
        const hsnCode = (hsnIndex !== -1 && row[hsnIndex]) ? row[hsnIndex].trim() : '';
        const unit = (unitIndex !== -1 && row[unitIndex]) ? row[unitIndex].toLowerCase().trim() : '';
        const typeStr = (serviceIndex !== -1 && row[serviceIndex]) ? row[serviceIndex].toLowerCase().trim() : '';

        if (typeStr) {
          const isServiceTerm = ['service', 'services', 'serv', 's', 'yes', 'true', '1'].includes(typeStr);
          const isProductTerm = ['product', 'products', 'goods', 'good', 'prod', 'p', 'g', 'no', 'false', '0'].includes(typeStr);

          if (isServiceTerm) {
            isService = true;
          } else if (isProductTerm) {
            isService = false;
          } else {
            // Unrecognized term: Fallback to HSN/SAC detection
            if (hsnCode.startsWith('99')) {
              isService = true;
            } else if (unit && ['hrs', 'hr', 'day', 'days', 'mth', 'months', 'week', 'weeks'].includes(unit)) {
              isService = true;
            } else {
              isService = false;
            }
          }
        } else {
          // Missing type mapping or value: Fallback to HSN/SAC detection
          if (hsnCode.startsWith('99')) {
            isService = true;
          } else if (unit && ['hrs', 'hr', 'day', 'days', 'mth', 'months', 'week', 'weeks'].includes(unit)) {
            isService = true;
          } else {
            isService = false; // Safe default
          }
        }

        await prisma.item.create({
          data: {
            userId: user.id,
            businessId: defaultBusiness?.id || null,
            name,
            description: descIndex !== -1 ? row[descIndex] || null : null,
            hsnCode: hsnIndex !== -1 ? row[hsnIndex] || null : null,
            rate: rateVal,
            gstRate: isNaN(gstRateVal) ? 18.00 : gstRateVal,
            unit: unitIndex !== -1 && row[unitIndex] ? row[unitIndex] : 'PCS',
            isService,
          },
        });
        count++;
      }
    } else {
      return NextResponse.json({ error: 'Invalid import type' }, { status: 400 });
    }

    return NextResponse.json({ success: true, imported: count }, { status: 200 });
  } catch (error: any) {
    console.error('Error importing data:', error);
    return NextResponse.json({ error: error.message || 'Import failed' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'deleteAllData') {
      // Wipe invoices (cascade deletes line items due to foreign key onDelete: Cascade)
      await prisma.invoice.deleteMany({ where: { userId: user.id } });
      // Wipe clients
      await prisma.client.deleteMany({ where: { userId: user.id } });
      // Wipe catalog items
      await prisma.item.deleteMany({ where: { userId: user.id } });

      return NextResponse.json({ success: true, message: 'All transactions, clients, and items catalog cleared.' }, { status: 200 });
    }

    if (action === 'deleteAccount') {
      // Wipe all models associated with the user
      await prisma.invoice.deleteMany({ where: { userId: user.id } });
      await prisma.client.deleteMany({ where: { userId: user.id } });
      await prisma.item.deleteMany({ where: { userId: user.id } });
      await prisma.business.deleteMany({ where: { userId: user.id } });
      await prisma.subscription.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });

      return NextResponse.json({ success: true, message: 'Account and all related assets deleted successfully.' }, { status: 200 });
    }

    return NextResponse.json({ error: 'Invalid delete action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error erasing data:', error);
    return NextResponse.json({ error: error.message || 'Data erasure failed' }, { status: 500 });
  }
}
