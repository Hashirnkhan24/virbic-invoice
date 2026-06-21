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
  const userId = "cmqm5zv6w0000307k26vu71mh"; // User from DB dump

  console.log('--- TEST 1: isDeleted: false ---');
  const t1 = await prisma.client.findMany({
    where: { userId, isDeleted: false }
  });
  console.log(`Results: ${t1.length}`);

  console.log('--- TEST 2: includeDeleted: true ---');
  const t2 = await prisma.client.findMany({
    where: { userId }
  });
  console.log(`Results: ${t2.length}`);

  console.log('--- TEST 3: businessId: null ---');
  const t3 = await prisma.client.findMany({
    where: { 
      userId,
      isDeleted: false,
      OR: [
        { businessId: null },
      ]
    }
  });
  console.log(`Results: ${t3.length}`);
}

main().catch(console.error).finally(() => {
  prisma.$disconnect();
  pool.end();
});
