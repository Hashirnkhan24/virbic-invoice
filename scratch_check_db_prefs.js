const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  try {
    const preferences = await prisma.userPreference.findMany();
    console.log('--- DATABASE USER PREFERENCES ---');
    console.log(JSON.stringify(preferences, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
    pool.end();
  }
}

check();
