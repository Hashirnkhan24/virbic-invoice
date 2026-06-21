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

// Replicate getClientFinancials locally in JS
async function getClientFinancials(clientId, userId) {
  const [paidAgg, outstandingAgg, totalInvoices, lastInvoice] = await Promise.all([
    prisma.invoice.aggregate({
      where: { clientId, userId, status: 'PAID' },
      _sum: { grandTotal: true }
    }),
    prisma.invoice.aggregate({
      where: { 
        clientId, 
        userId, 
        status: { in: ['SENT', 'OVERDUE', 'PARTIAL'] } 
      },
      _sum: { grandTotal: true }
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

  const totalBilled = paidAgg._sum.grandTotal ? Number(paidAgg._sum.grandTotal) : 0;
  const totalOutstanding = outstandingAgg._sum.grandTotal ? Number(outstandingAgg._sum.grandTotal) : 0;

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
