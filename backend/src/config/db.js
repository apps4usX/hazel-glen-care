// Prisma client singleton. Import { prisma } everywhere instead of new-ing it up,
// so we keep a single connection pool across the app (and across hot reloads in dev).
const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.__hazelPrisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__hazelPrisma = prisma;
}

module.exports = { prisma };
