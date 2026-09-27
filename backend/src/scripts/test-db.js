require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function test() {
  const prisma = new PrismaClient({ log: ['query', 'info', 'warn', 'error'] });
  try {
    console.log('Connecting to:', process.env.DATABASE_URL.replace(/:[^:]*@/, ':***@'));
    await prisma.$connect();
    console.log('SUCCESS! Database connected.');
    const count = await prisma.user.count();
    console.log('User count:', count);
  } catch (err) {
    console.error('CONNECTION ERROR:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
