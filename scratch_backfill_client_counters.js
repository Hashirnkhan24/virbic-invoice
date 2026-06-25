const fs = require('fs');
const dotenv = require('dotenv');
if (fs.existsSync('.env')) {
  const envConfig = dotenv.parse(fs.readFileSync('.env'));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function getClientFinancials(clientId, userId) {
  const [invoices, totalInvoices, lastInvoice] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        clientId,
        userId,
        status: { notIn: ['DRAFT', 'CANCELLED'] }
      },
      select: {
        grandTotal: true,
        amountPaid: true,
        currency: true,
        status: true
      }
    }),
    prisma.invoice.count({
      where: { clientId, userId }
    }),
    prisma.invoice.findFirst({
      where: { clientId, userId },
      orderBy: { issueDate: 'desc' },
      select: { issueDate: true }
    })
  ]);

  const ratesToINR = {
    INR: 1.0,
    USD: 83.5,
    EUR: 90.0,
    GBP: 106.0,
  };

  function convertCurrency(amount, from, to) {
    if (from === to) return amount;
    const amountInINR = amount * (ratesToINR[from] || 1.0);
    const targetRate = ratesToINR[to] || 1.0;
    return amountInINR / targetRate;
  }

  let totalBilled = 0;
  let totalOutstanding = 0;

  for (const inv of invoices) {
    const grandTotalINR = convertCurrency(Number(inv.grandTotal), inv.currency, 'INR');
    const amountPaidINR = convertCurrency(Number(inv.amountPaid), inv.currency, 'INR');
    
    totalBilled += amountPaidINR;

    if (['SENT', 'OVERDUE', 'PARTIAL'].includes(inv.status)) {
      totalOutstanding += Math.max(0, grandTotalINR - amountPaidINR);
    }
  }

  return {
    totalBilled,
    totalOutstanding,
    invoiceCount: totalInvoices,
    lastInvoiceDate: lastInvoice?.issueDate || null,
  };
}

async function main() {
  const clients = await prisma.client.findMany();
  console.log(`Found ${clients.length} clients to sync.`);

  for (const client of clients) {
    console.log(`Syncing client: ${client.name} (${client.id})...`);
    const financials = await getClientFinancials(client.id, client.userId);
    
    await prisma.client.update({
      where: { id: client.id },
      data: {
        totalBilled: financials.totalBilled,
        totalOutstanding: financials.totalOutstanding,
        invoiceCount: financials.invoiceCount,
        lastInvoiceDate: financials.lastInvoiceDate,
      },
    });
    console.log(`Synced: Billed=${financials.totalBilled}, Outstanding=${financials.totalOutstanding}, Count=${financials.invoiceCount}`);
  }

  console.log('All clients successfully synced!');
}

main().catch(console.error).finally(() => {
  prisma.$disconnect();
  pool.end();
});
