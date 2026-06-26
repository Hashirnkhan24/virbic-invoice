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
  const users = await prisma.user.findMany();
  console.log(`Found ${users.length} users in database.`);

  for (const user of users) {
    console.log(`\nTesting user: ${user.name} (${user.id})`);
    try {
      const rawClients = await prisma.client.findMany({
        where: {
          userId: user.id,
          isDeleted: false,
        },
        include: {
          _count: {
            select: { invoices: true },
          },
          invoices: {
            where: {},
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
        orderBy: { name: 'asc' },
      });
      console.log(`SUCCESS: Found ${rawClients.length} clients.`);
      if (rawClients.length > 0) {
        console.log(`First client invoices:`, JSON.stringify(rawClients[0].invoices, null, 2));
      }
    } catch (err) {
      console.error(`ERROR for user ${user.name}:`, err);
    }
  }
}

main().catch(console.error).finally(() => {
  prisma.$disconnect();
  pool.end();
});
