const express = require('express');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

const IndianMobileRegex = /^[6-9]\d{9}$/;
const GstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const customerSchema = z.object({
  customerName: z.string().min(1, 'Customer Name is required').trim(),
  businessName: z.string().min(1, 'Business Name is required').trim(),
  mobile: z.string().min(1, 'Mobile number is required').regex(IndianMobileRegex, 'Enter a valid 10-digit Indian mobile number'),
  alternateMobile: z.string().optional().nullable().refine(val => !val || IndianMobileRegex.test(val), 'Invalid alternate mobile number'),
  address: z.string().trim().optional().nullable(),
  gstNumber: z.string().trim().optional().nullable().refine(val => !val || GstRegex.test(val.toUpperCase()), 'Invalid GSTIN format'),
  currentDue: z.coerce.number().min(0, 'Due cannot be negative').optional().default(0),
});

/**
 * Generate next customer code: CUST-00001
 */
async function generateCustomerCode(tx) {
  const lastCustomer = await tx.customer.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { customerCode: true },
  });

  let nextNumber = 1;
  if (lastCustomer && lastCustomer.customerCode) {
    const match = lastCustomer.customerCode.match(/CUST-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  // Count check in case of non-sequential
  const totalCount = await tx.customer.count();
  if (nextNumber <= totalCount) {
    nextNumber = totalCount + 1;
  }

  const codeStr = String(nextNumber).padStart(5, '0');
  return `CUST-${codeStr}`;
}

// GET /api/customers - List & search customers
router.get('/', async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;

    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { customerCode: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { businessName: { contains: q, mode: 'insensitive' } },
        { mobile: { contains: q } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        select: {
          id: true,
          customerCode: true,
          customerName: true,
          businessName: true,
          mobile: true,
          alternateMobile: true,
          address: true,
          gstNumber: true,
          isActive: true,
          currentDue: true,
          createdAt: true,
          _count: {
            select: { bills: true },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        customers,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/customers/reports/monthly-purchases - Cross-customer monthly purchases & weight report
router.get('/reports/monthly-purchases', async (req, res, next) => {
  try {
    const { month } = req.query; // format: 'YYYY-MM' (e.g. '2026-11')

    // Find all distinct months where generated bills exist
    const allBillsDates = await prisma.bill.findMany({
      where: { status: 'GENERATED' },
      select: { billDate: true },
      orderBy: { billDate: 'desc' },
    });

    const monthSet = new Set();
    allBillsDates.forEach((b) => {
      const d = new Date(b.billDate);
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthSet.add(mKey);
    });

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (!monthSet.has(currentMonthKey)) {
      monthSet.add(currentMonthKey);
    }
    const availableMonths = Array.from(monthSet).sort((a, b) => b.localeCompare(a));

    const selectedMonth = month && /^\d{4}-\d{2}$/.test(month) ? month : availableMonths[0] || currentMonthKey;
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);

    const startDate = new Date(year, monthNum - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

    const bills = await prisma.bill.findMany({
      where: {
        billDate: { gte: startDate, lte: endDate },
        status: 'GENERATED',
      },
      include: {
        customer: {
          select: {
            id: true,
            customerCode: true,
            customerName: true,
            businessName: true,
            mobile: true,
            currentDue: true,
          },
        },
        items: true,
      },
    });

    // Aggregate by customer
    const customerMap = new Map();
    let totalMonthWeight = 0;
    let totalMonthQuantity = 0;
    let totalMonthRevenue = 0;

    bills.forEach((bill) => {
      const cust = bill.customer;
      if (!cust) return;

      if (!customerMap.has(cust.id)) {
        customerMap.set(cust.id, {
          customerId: cust.id,
          customerCode: cust.customerCode,
          customerName: cust.customerName,
          businessName: cust.businessName,
          mobile: cust.mobile,
          currentDue: Number(cust.currentDue || 0),
          totalWeight: 0,
          totalQuantity: 0,
          totalAmount: 0,
          billsCount: 0,
          products: {},
        });
      }

      const cData = customerMap.get(cust.id);
      cData.billsCount += 1;
      const bTotal = Number(bill.grandTotal || 0);
      cData.totalAmount += bTotal;
      totalMonthRevenue += bTotal;

      bill.items.forEach((item) => {
        const w = Number(item.weight || 0);
        const q = Number(item.quantity || 0);
        const a = Number(item.amount || 0);

        cData.totalWeight += w;
        cData.totalQuantity += q;
        totalMonthWeight += w;
        totalMonthQuantity += q;

        const pName = item.productName || 'Broiler Chicken';
        if (!cData.products[pName]) {
          cData.products[pName] = { productName: pName, weight: 0, quantity: 0, amount: 0 };
        }
        cData.products[pName].weight += w;
        cData.products[pName].quantity += q;
        cData.products[pName].amount += a;
      });
    });

    const customers = Array.from(customerMap.values())
      .map((c) => {
        const tw = Math.round(c.totalWeight * 1000) / 1000;
        const ta = Math.round(c.totalAmount * 100) / 100;
        return {
          ...c,
          totalWeight: tw,
          totalAmount: ta,
          avgRate: tw > 0 ? Math.round((ta / tw) * 100) / 100 : 0,
          products: Object.values(c.products).map((p) => ({
            ...p,
            weight: Math.round(p.weight * 1000) / 1000,
            amount: Math.round(p.amount * 100) / 100,
          })),
        };
      })
      .sort((a, b) => b.totalWeight - a.totalWeight); // Highest weight purchaser first

    const monthDateObj = new Date(year, monthNum - 1, 1);
    const monthLabel = monthDateObj.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    res.json({
      success: true,
      data: {
        selectedMonth,
        monthLabel,
        availableMonths,
        summary: {
          totalWeight: Math.round(totalMonthWeight * 1000) / 1000,
          totalQuantity: totalMonthQuantity,
          totalRevenue: Math.round(totalMonthRevenue * 100) / 100,
          activeCustomersCount: customers.length,
          totalBillsCount: bills.length,
          avgRateOverall: totalMonthWeight > 0 ? Math.round((totalMonthRevenue / totalMonthWeight) * 100) / 100 : 0,
        },
        customers,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/customers/:id - Customer details, bill history & monthly purchase stats
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        bills: {
          orderBy: { billDate: 'desc' },
          include: {
            items: true,
          },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Calculate Monthly Purchase & Weight Statistics
    const monthlyMap = new Map();
    let totalWeightAllTime = 0;
    let totalQuantityAllTime = 0;
    let totalSpentAllTime = 0;
    let validBillsCount = 0;

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let currentMonthWeight = 0;
    let currentMonthAmount = 0;

    customer.bills.forEach((bill) => {
      // Exclude CANCELLED bills from purchase weight stats
      if (bill.status === 'CANCELLED') return;

      validBillsCount++;
      const bDate = new Date(bill.billDate || bill.createdAt);
      const year = bDate.getFullYear();
      const monthNum = bDate.getMonth() + 1;
      const monthKey = `${year}-${String(monthNum).padStart(2, '0')}`;
      const monthLabel = bDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      const shortMonth = bDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          monthKey,
          monthLabel,
          shortMonth,
          year,
          monthNum,
          totalWeight: 0,
          totalQuantity: 0,
          totalAmount: 0,
          billsCount: 0,
          products: {},
        });
      }

      const mData = monthlyMap.get(monthKey);
      mData.billsCount += 1;
      const bTotal = Number(bill.grandTotal || 0);
      mData.totalAmount += bTotal;
      totalSpentAllTime += bTotal;

      if (monthKey === currentMonthKey) {
        currentMonthAmount += bTotal;
      }

      bill.items.forEach((item) => {
        const w = Number(item.weight || 0);
        const q = Number(item.quantity || 0);
        const a = Number(item.amount || 0);

        mData.totalWeight += w;
        mData.totalQuantity += q;
        totalWeightAllTime += w;
        totalQuantityAllTime += q;

        if (monthKey === currentMonthKey) {
          currentMonthWeight += w;
        }

        const pName = item.productName || 'Broiler Chicken';
        if (!mData.products[pName]) {
          mData.products[pName] = { productName: pName, weight: 0, quantity: 0, amount: 0 };
        }
        mData.products[pName].weight += w;
        mData.products[pName].quantity += q;
        mData.products[pName].amount += a;
      });
    });

    // Convert map to sorted array (newest month first)
    const monthlyStats = Array.from(monthlyMap.values())
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
      .map((m) => ({
        ...m,
        totalWeight: Math.round(m.totalWeight * 1000) / 1000,
        totalAmount: Math.round(m.totalAmount * 100) / 100,
        avgRate: m.totalWeight > 0 ? Math.round((m.totalAmount / m.totalWeight) * 100) / 100 : 0,
        products: Object.values(m.products).map((p) => ({
          ...p,
          weight: Math.round(p.weight * 1000) / 1000,
          amount: Math.round(p.amount * 100) / 100,
        })),
      }));

    const activeMonthsCount = monthlyStats.length || 1;
    const avgMonthlyWeight = Math.round((totalWeightAllTime / activeMonthsCount) * 1000) / 1000;

    // Attach total weight and quantity summary to bills for easy display in history table
    const billsWithSummary = customer.bills.map((b) => {
      const billWeight = b.items?.reduce((sum, it) => sum + Number(it.weight || 0), 0) || 0;
      const billQuantity = b.items?.reduce((sum, it) => sum + Number(it.quantity || 0), 0) || 0;
      return {
        ...b,
        totalWeight: Math.round(billWeight * 1000) / 1000,
        totalQuantity: billQuantity,
      };
    });

    const purchaseStats = {
      totalWeightAllTime: Math.round(totalWeightAllTime * 1000) / 1000,
      totalQuantityAllTime,
      totalSpentAllTime: Math.round(totalSpentAllTime * 100) / 100,
      validBillsCount,
      currentMonthWeight: Math.round(currentMonthWeight * 1000) / 1000,
      currentMonthAmount: Math.round(currentMonthAmount * 100) / 100,
      avgMonthlyWeight,
      monthlyStats,
    };

    res.json({
      success: true,
      data: {
        customer: {
          ...customer,
          bills: billsWithSummary,
        },
        purchaseStats,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/customers - Add Customer
router.post('/', async (req, res, next) => {
  try {
    const validatedData = customerSchema.parse(req.body);

    // Optional check for duplicate mobile
    const existingMobile = await prisma.customer.findFirst({
      where: { mobile: validatedData.mobile },
    });

    if (existingMobile) {
      return res.status(400).json({
        success: false,
        message: `A customer with mobile number ${validatedData.mobile} already exists (${existingMobile.customerName} - ${existingMobile.customerCode})`,
      });
    }

    const newCustomer = await prisma.$transaction(async (tx) => {
      let customerCode = await generateCustomerCode(tx);

      // Re-check uniqueness loop
      let exists = await tx.customer.findUnique({ where: { customerCode } });
      let attempts = 0;
      while (exists && attempts < 10) {
        const num = parseInt(customerCode.split('-')[1], 10) + 1;
        customerCode = `CUST-${String(num).padStart(5, '0')}`;
        exists = await tx.customer.findUnique({ where: { customerCode } });
        attempts++;
      }

      return tx.customer.create({
        data: {
          customerCode,
          customerName: validatedData.customerName,
          businessName: validatedData.businessName,
          mobile: validatedData.mobile,
          alternateMobile: validatedData.alternateMobile || null,
          address: validatedData.address || null,
          gstNumber: validatedData.gstNumber ? validatedData.gstNumber.toUpperCase() : null,
          currentDue: validatedData.currentDue !== undefined ? parseFloat(validatedData.currentDue) : 0,
          createdBy: req.user.id,
        },
      });
    });

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: { customer: newCustomer },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/customers/:id - Update Customer
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const validatedData = customerSchema.parse(req.body);

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (validatedData.mobile !== existing.mobile) {
      const mobileConflict = await prisma.customer.findFirst({
        where: { mobile: validatedData.mobile, NOT: { id } },
      });
      if (mobileConflict) {
        return res.status(400).json({
          success: false,
          message: `Another customer with mobile number ${validatedData.mobile} already exists`,
        });
      }
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        customerName: validatedData.customerName,
        businessName: validatedData.businessName,
        mobile: validatedData.mobile,
        alternateMobile: validatedData.alternateMobile || null,
        address: validatedData.address || null,
        gstNumber: validatedData.gstNumber ? validatedData.gstNumber.toUpperCase() : null,
        currentDue: validatedData.currentDue !== undefined ? parseFloat(validatedData.currentDue) : existing.currentDue,
      },
    });

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: { customer: updatedCustomer },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/customers/:id/status - Toggle active/inactive
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isActive must be a boolean' });
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: { isActive },
    });

    res.json({
      success: true,
      message: `Customer ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: { customer: updated },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/customers/:id - Delete customer and their billing records
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: { bills: true },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    await prisma.$transaction(async (tx) => {
      // Find all bills for this customer
      const bills = await tx.bill.findMany({
        where: { customerId: id },
        select: { id: true },
      });

      const billIds = bills.map((b) => b.id);
      if (billIds.length > 0) {
        // Delete all bill items first
        await tx.billItem.deleteMany({
          where: { billId: { in: billIds } },
        });
        // Delete all bills
        await tx.bill.deleteMany({
          where: { id: { in: billIds } },
        });
      }

      // Delete customer
      await tx.customer.delete({
        where: { id },
      });
    }, { maxWait: 10000, timeout: 30000 });

    res.json({
      success: true,
      message: `Customer "${existing.customerName}" (${existing.customerCode}) and all associated records deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
