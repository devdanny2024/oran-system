// Temporary debug script to inspect Prisma client shape on the server.
// Usage: node scripts/print-prisma-models.cjs
/* eslint-disable no-console */

const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Prisma client top-level keys:');
    console.log(Object.keys(prisma));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

