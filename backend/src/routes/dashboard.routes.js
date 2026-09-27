const express = require('express');
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

// GET /api/dashboard/summary
router.get('/summary', async (req, res, next) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const [todayBillsCount, todaySalesAggregate, totalCustomersCount, recentBills] = await Promise.all([
      prisma.bill.count({
        where: {
          billDate: { gte: startOfToday, lte: endOfToday },
          status: 'GENERATED',
        },
      }),
      prisma.bill.aggregate({
        where: {
          billDate: { gte: startOfToday, lte: endOfToday },
          status: 'GENERATED',
        },
        _sum: {
          grandTotal: true,
        },
      }),
      prisma.customer.count({
        where: { isActive: true },
      }),
      prisma.bill.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          customer: {
            select: {
              customerCode: true,
              customerName: true,
              businessName: true,
            },
          },
        },
      }),
    ]);

    const todaySales = Number(todaySalesAggregate._sum.grandTotal || 0);

    res.json({
      success: true,
      data: {
        summary: {
          todayBills: todayBillsCount,
          todaySales,
          totalCustomers: totalCustomersCount,
        },
        recentBills,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
