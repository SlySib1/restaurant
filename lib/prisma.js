const { PrismaClient } = require('@prisma/client');

// Dùng một PrismaClient dùng chung để không mở quá nhiều connection pool.
const globalForPrisma = globalThis;
const prisma = globalForPrisma.__restaurantPrisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__restaurantPrisma = prisma;
}

module.exports = { prisma };
