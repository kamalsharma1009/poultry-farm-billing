require('dotenv').config();
const app = require('./app');
const prisma = require('./config/prisma');
const seedAdmin = require('./scripts/seed-admin');
const { getOrCreateFinancialYear } = require('./utils/fy.utils');

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Required for Render/cloud deployment

async function initPrerequisites(retries = 5, delay = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Server Startup] Initializing database prerequisites (attempt ${attempt}/${retries})...`);
      
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
      console.log('[Server Startup] Database ready.');
      return;
    } catch (error) {
      console.warn(`[Server Startup Warning] Attempt ${attempt} failed: ${error.message}`);
      if (attempt === retries) throw error;
      console.log(`[Server Startup] Waiting ${delay / 1000}s for Neon database wakeup...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

async function startServer() {
  try {
    const server = app.listen(PORT, HOST, () => {
      console.log(`🚀 Broilers Express Backend running on http://${HOST}:${PORT}`);
    });

    await initPrerequisites();
  } catch (error) {
    console.error('[Server Startup Error]', error);
    process.exit(1);
  }
}

startServer();
