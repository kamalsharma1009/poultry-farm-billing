require('dotenv').config();
const app = require('./app');
const prisma = require('./config/prisma');
const seedAdmin = require('./scripts/seed-admin');
const { getOrCreateFinancialYear } = require('./utils/fy.utils');

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Required for Render/cloud deployment

async function startServer() {
  try {
    console.log('[Server Startup] Initializing database prerequisites...');
    
    // Ensure current financial year exists
    await getOrCreateFinancialYear(prisma, new Date());

    // Ensure business settings exist
    const settingsCount = await prisma.businessSettings.count();
    if (settingsCount === 0) {
      await prisma.businessSettings.create({
        data: {
          id: 'default',
          businessName: 'Broilers Express',
          address: 'Motton Market, Jaysingpur',
          mobile: '9326153310',
          billStartingNumber: 68923,
          billFooter: 'Thank you for your business! - Broilers Express',
        },
      });
      console.log('[Server Startup] Default business settings initialized.');
    }

    // Ensure initial admin user exists if users table is empty
    await seedAdmin();

    app.listen(PORT, HOST, () => {
      console.log(`🚀 Broilers Express Backend running on http://${HOST}:${PORT}`);
    });
  } catch (error) {
    console.error('[Server Startup Error]', error);
    process.exit(1);
  }
}

startServer();
