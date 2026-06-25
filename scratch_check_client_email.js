const fs = require('fs');
const path = require('path');

// Manually parse .env file to get DATABASE_URL
try {
  const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  const match = envFile.match(/DATABASE_URL=["']?([^"'\s]+)/);
  if (match) {
    process.env.DATABASE_URL = match[1];
  }
} catch (err) {
  console.error('Failed to read .env file:', err.message);
}

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not found in .env');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  try {
    const client = await prisma.client.findFirst({
      where: { name: { contains: 'Elevate Tech', mode: 'insensitive' } }
    });
    console.log('--- CLIENT RECORD ---');
    console.log(JSON.stringify(client, null, 2));
    
    const invoice = await prisma.invoice.findFirst({
      where: { invoiceNumber: { contains: '006' } },
      include: { client: true }
    });
    console.log('--- INVOICE RECORD ---');
    console.log(JSON.stringify(invoice, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
    pool.end();
  }
}

check();
