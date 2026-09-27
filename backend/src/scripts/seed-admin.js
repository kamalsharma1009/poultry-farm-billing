const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedAdmin() {
  console.log('[Seed Admin] Checking existing user accounts...');

  const count = await prisma.user.count();
  if (count > 0) {
    console.log('[Seed Admin] User accounts already exist. Skipping admin creation.');
    return;
  }

  const defaultEmail = process.env.ADMIN_EMAIL || 'admin@broilersexpress.com';
  const defaultPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const admin = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: defaultEmail,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log(`[Seed Admin] Admin user created successfully:`);
  console.log(`  Email: ${admin.email}`);
  console.log(`  Password: ${defaultPassword}`);
}

if (require.main === module) {
  seedAdmin()
    .catch((err) => {
      console.error('[Seed Admin Error]', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = seedAdmin;
