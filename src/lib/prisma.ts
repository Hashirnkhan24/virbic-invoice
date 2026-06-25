import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Detect and discard outdated cached Prisma client instances from before schema push
let cachedPrisma = globalForPrisma.prisma;
if (cachedPrisma && !('userPreference' in cachedPrisma)) {
  console.warn('[PRISMA CLIENT] Discarding outdated cached PrismaClient instance.');
  cachedPrisma = undefined as any;
}

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/postgres';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma =
  cachedPrisma ||
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
