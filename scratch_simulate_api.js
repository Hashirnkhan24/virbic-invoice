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
  const userId = "cmqm5zv6w0000307k26vu71mh";

  // Simulate API GET parameters for clients
  const paramsList = [
    { label: "1. clients query (sortBy=name)", search: null, businessId: 'all', includeDeleted: false, minOutstanding: false, sortBy: 'name' },
    { label: "2. allClients query (includeDeleted=true)", search: null, businessId: 'all', includeDeleted: true, minOutstanding: false, sortBy: null }
  ];

  for (const params of paramsList) {
    const searchCondition = params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { email: { contains: params.search, mode: 'insensitive' } },
            { gstin: { contains: params.search, mode: 'insensitive' } },
            { billingCity: { contains: params.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const businessCondition = (params.businessId && params.businessId !== 'all')
      ? {
          OR: [
            { businessId: params.businessId },
            { businessId: null },
          ],
        }
      : {};

    const isDeletedCondition = params.includeDeleted ? {} : { isDeleted: false };
    const outstandingCondition = params.minOutstanding ? { totalOutstanding: { gt: 0 } } : {};

    let orderBy = { name: 'asc' };
    if (params.sortBy === 'revenue') {
      orderBy = { totalBilled: 'desc' };
    } else if (params.sortBy === 'outstanding') {
      orderBy = { totalOutstanding: 'desc' };
    } else if (params.sortBy === 'recent') {
      orderBy = { lastInvoiceDate: 'desc' };
    } else if (params.sortBy === 'name') {
      orderBy = { name: 'asc' };
    }

    const where = {
      userId,
      ...businessCondition,
      ...searchCondition,
      ...isDeletedCondition,
      ...outstandingCondition,
    };

    console.log(`\n=== Running ${params.label} ===`);
    console.log(`where: ${JSON.stringify(where, null, 2)}`);
    console.log(`orderBy: ${JSON.stringify(orderBy, null, 2)}`);

    try {
      const clients = await prisma.client.findMany({
        where,
        orderBy
      });
      console.log(`Result count: ${clients.length}`);
      if (clients.length > 0) {
        console.log(`First client name: ${clients[0].name}`);
      }
    } catch (err) {
      console.error('Prisma query failed:', err);
    }
  }
}

main().catch(console.error).finally(() => {
  prisma.$disconnect();
  pool.end();
});
