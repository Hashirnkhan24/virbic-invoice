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

async function main() {
  // Let's find a business that has invoices or clients
  const invoices = await prisma.invoice.findMany({
    take: 5,
    include: { business: true, user: true }
  });
  
  if (invoices.length === 0) {
    console.log("No invoices found to test with.");
    return;
  }
  
  const testInvoice = invoices[0];
  const userId = testInvoice.userId;
  const businessId = testInvoice.businessId;
  const user = testInvoice.user;
  
  console.log(`Testing with User: ${user.name} (${userId}) and Business ID: ${businessId}`);
  
  try {
    const rawClients = await prisma.client.findMany({
      where: {
        userId: userId,
        OR: [
          { businessId: businessId },
          { businessId: null },
          { invoices: { some: { businessId: businessId } } },
        ],
        isDeleted: false,
      },
      include: {
        _count: {
          select: { invoices: true },
        },
        invoices: {
          where: { businessId: businessId },
          take: 5,
          orderBy: { issueDate: 'desc' },
          select: {
            id: true,
            invoiceNumber: true,
            grandTotal: true,
            status: true,
            issueDate: true,
          },
        },
      },
    });

    console.log(`Found ${rawClients.length} raw clients.`);

    let clients = rawClients.map(c => ({
      ...c,
      totalBilled: Number(c.totalBilled),
      totalOutstanding: Number(c.totalOutstanding),
    }));

    console.log("Starting groupBy aggregations...");
    const [paidAgg, outstandingAgg, totalAgg] = await Promise.all([
      prisma.invoice.groupBy({
        by: ['clientId'],
        where: {
          userId: userId,
          businessId: businessId,
          status: 'PAID',
        },
        _sum: { grandTotal: true },
      }),
      prisma.invoice.groupBy({
        by: ['clientId'],
        where: {
          userId: userId,
          businessId: businessId,
          status: { in: ['SENT', 'OVERDUE', 'PARTIAL'] },
        },
        _sum: { grandTotal: true },
      }),
      prisma.invoice.groupBy({
        by: ['clientId'],
        where: {
          userId: userId,
          businessId: businessId,
        },
        _count: { id: true },
        _max: { issueDate: true },
      }),
    ]);

    console.log("Aggregations successful!");
    console.log("paidAgg:", paidAgg);
    console.log("outstandingAgg:", outstandingAgg);
    console.log("totalAgg:", totalAgg);

    const paidMap = new Map(paidAgg.map(item => [item.clientId, Number(item._sum?.grandTotal || 0)]));
    const outstandingMap = new Map(outstandingAgg.map(item => [item.clientId, Number(item._sum?.grandTotal || 0)]));
    const totalMap = new Map(totalAgg.map(item => [item.clientId, {
      count: Number(item._count?.id || item._count?._all || 0),
      lastDate: item._max?.issueDate || null,
    }]));

    clients = clients.map(client => {
      const billed = paidMap.get(client.id) || 0;
      const outstanding = outstandingMap.get(client.id) || 0;
      const totals = totalMap.get(client.id) || { count: 0, lastDate: null };

      return {
        ...client,
        totalBilled: billed,
        totalOutstanding: outstanding,
        invoiceCount: totals.count,
        lastInvoiceDate: totals.lastDate,
      };
    });

    console.log("Successfully processed clients:", clients.length);
  } catch (err) {
    console.error("CRASHED with error:", err);
  }
}

main().catch(console.error).finally(() => {
  prisma.$disconnect();
  pool.end();
});
