const express = require('express');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth.middleware');
const { getOrCreateFinancialYear } = require('../utils/fy.utils');
const { generateBillPDF } = require('../utils/pdf.utils');
const { openWhatsAppChat } = require('../services/whatsapp.service');

const router = express.Router();

// GET /api/bills/public/:id/pdf - Public PDF link for WhatsApp customer viewing
router.get('/public/:id/pdf', async (req, res, next) => {
  try {
    const { id } = req.params;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const bill = await prisma.bill.findFirst({
      where: isUuid ? { id } : { billNumber: id },
      include: {
        customer: true,
        items: true,
      },
    });

    if (!bill) {
      return res.status(404).send('Bill not found');
    }

    const settings = await prisma.businessSettings.findFirst();
    const pdfBuffer = await generateBillPDF(bill, bill.customer, settings);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=Bill_${bill.billNumber}_BroilersExpress.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

router.use(authenticate);

const billItemSchema = z.object({
  productName: z.string().min(1, 'Product Name is required').trim(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  weight: z.number().positive('Weight must be greater than 0'),
  rate: z.number().positive('Rate must be greater than 0'),
});

const createBillSchema = z.object({
  customerId: z.string().min(1, 'Customer selection is required'),
  billDate: z.string().optional().default(() => new Date().toISOString()),
  discount: z.number().min(0, 'Discount cannot be negative').optional().default(0),
  otherCharges: z.number().min(0, 'Other charges cannot be negative').optional().default(0),
  previousDue: z.number().min(0, 'Previous due cannot be negative').optional().default(0),
  paidAmount: z.number().min(0, 'Paid amount cannot be negative').optional().default(0),
  items: z.array(billItemSchema).min(1, 'At least one bill item is required'),
});

/**
 * Generates next sequential bill number atomically
 */
async function generateNextBillNumber(prismaClient, startingNumber = 68923) {
  const bills = await prismaClient.bill.findMany({
    select: { billNumber: true },
  });

  let maxNum = startingNumber - 1;
  for (const b of bills) {
    const num = parseInt(b.billNumber, 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  }

  return String(maxNum + 1);
}

// GET /api/bills - List & search bills
router.get('/', async (req, res, next) => {
  try {
    const {
      search,
      customerId,
      financialYearId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (customerId) where.customerId = customerId;
    if (financialYearId) where.financialYearId = financialYearId;
    if (status) where.status = status;

    if (startDate || endDate) {
      where.billDate = {};
      if (startDate) where.billDate.gte = new Date(startDate);
      if (endDate) where.billDate.lte = new Date(endDate);
    }

    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { billNumber: { contains: q, mode: 'insensitive' } },
        { customer: { customerName: { contains: q, mode: 'insensitive' } } },
        { customer: { businessName: { contains: q, mode: 'insensitive' } } },
        { customer: { mobile: { contains: q } } },
        { customer: { customerCode: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [bills, total] = await Promise.all([
      prisma.bill.findMany({
        where,
        orderBy: { billDate: 'desc' },
        skip,
        take: limitNum,
        include: {
          customer: {
            select: {
              id: true,
              customerCode: true,
              customerName: true,
              businessName: true,
              mobile: true,
            },
          },
          financialYear: {
            select: { yearCode: true },
          },
          _count: {
            select: { items: true },
          },
        },
      }),
      prisma.bill.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        bills,
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

// GET /api/bills/:id - Bill details
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const bill = await prisma.bill.findFirst({
      where: isUuid ? { id } : { billNumber: id },
      include: {
        customer: true,
        financialYear: true,
        items: true,
      },
    });

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    const settings = await prisma.businessSettings.findFirst();
    const host = `${req.protocol}://${req.get('host')}`;
    const whatsappInfo = openWhatsAppChat(bill.customer.mobile, bill, bill.customer, settings, host);

    res.json({
      success: true,
      data: {
        bill,
        whatsappInfo,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/bills - Create Bill (Atomic)
router.post('/', async (req, res, next) => {
  try {
    const body = createBillSchema.parse(req.body);

    // 1. Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: body.customerId },
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Selected customer not found' });
    }

    if (!customer.isActive) {
      return res.status(400).json({ success: false, message: 'Cannot create bill for inactive customer' });
    }

    // 2. Get/Create Financial Year
    const billDate = new Date(body.billDate);
    const financialYear = await getOrCreateFinancialYear(prisma, billDate);

    // 3. Recalculate financial amounts on backend (Never trust client)
    let calculatedSubtotal = 0;
    const processedItems = body.items.map(item => {
      const rawAmount = Number(item.weight) * Number(item.rate);
      const itemAmount = Math.round(rawAmount * 100) / 100;
      calculatedSubtotal += itemAmount;

      return {
        productName: item.productName,
        quantity: item.quantity,
        weight: item.weight,
        rate: item.rate,
        amount: itemAmount,
      };
    });

    calculatedSubtotal = Math.round(calculatedSubtotal * 100) / 100;
    const discount = Math.round((body.discount || 0) * 100) / 100;
    const otherCharges = Math.round((body.otherCharges || 0) * 100) / 100;
    const calculatedGrandTotal = Math.round((calculatedSubtotal - discount + otherCharges) * 100) / 100;
    const previousDue = Math.round((body.previousDue || 0) * 100) / 100;
    const paidAmount = Math.round((body.paidAmount || 0) * 100) / 100;

    // 4. Load settings and generate next bill number
    const bizSettings = await prisma.businessSettings.findFirst();
    const startingNumber = bizSettings?.billStartingNumber || 68923;
    const billNumber = await generateNextBillNumber(prisma, startingNumber);

    const newBill = await prisma.$transaction(async (tx) => {
      const bill = await tx.bill.create({
        data: {
          billNumber,
          customerId: customer.id,
          financialYearId: financialYear.id,
          billDate,
          subtotal: calculatedSubtotal,
          discount,
          otherCharges,
          grandTotal: calculatedGrandTotal,
          previousDue,
          paidAmount,
          status: 'GENERATED',
          createdBy: req.user.id,
          items: {
            create: processedItems.map(item => ({
              productName: item.productName,
              quantity: item.quantity,
              weight: item.weight,
              rate: item.rate,
              amount: item.amount,
            })),
          },
        },
        include: {
          customer: true,
          financialYear: true,
          items: true,
        },
      });

      return bill;
    }, { maxWait: 10000, timeout: 30000 });

    const host = `${req.protocol}://${req.get('host')}`;
    const whatsappInfo = openWhatsAppChat(customer.mobile, newBill, customer, bizSettings, host);

    res.status(201).json({
      success: true,
      message: 'Bill generated successfully',
      data: {
        bill: newBill,
        whatsappInfo,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/bills/:id/pdf - Authenticated PDF download
router.get('/:id/pdf', async (req, res, next) => {
  try {
    const { id } = req.params;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const bill = await prisma.bill.findFirst({
      where: isUuid ? { id } : { billNumber: id },
      include: {
        customer: true,
        items: true,
      },
    });

    if (!bill) {
      return res.status(404).send('Bill not found');
    }

    const settings = await prisma.businessSettings.findFirst();
    const pdfBuffer = await generateBillPDF(bill, bill.customer, settings);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename=Bill_${bill.billNumber}_BroilersExpress.pdf`
    );
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/bills/:id/cancel - Cancel Bill
router.patch('/:id/cancel', async (req, res, next) => {
  try {
    const { id } = req.params;

    const existingBill = await prisma.bill.findUnique({ where: { id } });
    if (!existingBill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    if (existingBill.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Bill is already cancelled' });
    }

    const cancelledBill = await prisma.bill.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { customer: true, items: true },
    });

    res.json({
      success: true,
      message: `Bill #${existingBill.billNumber} cancelled successfully`,
      data: { bill: cancelledBill },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
