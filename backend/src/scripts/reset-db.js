const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetDB() {
  console.log('[Reset DB] Wiping test customers and bills...');
  await prisma.billItem.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.customer.deleteMany();
  console.log('[Reset DB] Database reset to clean initial state.');
}

if (require.main === module) {
  resetDB().finally(() => prisma.$disconnect());
}

module.exports = resetDB;
