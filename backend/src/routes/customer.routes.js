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

// GET /api/customers/:id - Customer details & bill history
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        bills: {
          orderBy: { billDate: 'desc' },
          select: {
            id: true,
            billNumber: true,
            billDate: true,
            grandTotal: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.json({
      success: true,
      data: { customer },
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

module.exports = router;
