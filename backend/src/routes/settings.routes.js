const express = require('express');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

const settingsSchema = z.object({
  businessName: z.string().min(1, 'Business Name is required').trim(),
  address: z.string().min(1, 'Address is required').trim(),
  mobile: z.string().min(1, 'Mobile is required').trim(),
  email: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  gstNumber: z.string().optional().nullable().or(z.literal('')),
  logo: z.string().optional().nullable().or(z.literal('')),
  billStartingNumber: z.number().int().min(1, 'Bill starting number must be at least 1'),
  billFooter: z.string().optional().nullable().or(z.literal('')),
});

// GET /api/settings
router.get('/', async (req, res, next) => {
  try {
    let settings = await prisma.businessSettings.findFirst();

    if (!settings) {
      settings = await prisma.businessSettings.create({
        data: {
          id: 'default',
          businessName: 'Broilers Express',
          address: 'Motton Market, Jaysingpur',
          mobile: '9326153310',
          billStartingNumber: 68923,
          billFooter: 'Thank you for your business! - Broilers Express',
        },
      });
    }

    res.json({
      success: true,
      data: { settings },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings (ADMIN only)
router.put('/', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const data = settingsSchema.parse(req.body);

    let settings = await prisma.businessSettings.findFirst();

    if (!settings) {
      settings = await prisma.businessSettings.create({
        data: {
          id: 'default',
          ...data,
          email: data.email || null,
          gstNumber: data.gstNumber || null,
          logo: data.logo || null,
          billFooter: data.billFooter || 'Thank you for your business! - Broilers Express',
        },
      });
    } else {
      settings = await prisma.businessSettings.update({
        where: { id: settings.id },
        data: {
          ...data,
          email: data.email || null,
          gstNumber: data.gstNumber || null,
          logo: data.logo || null,
          billFooter: data.billFooter || 'Thank you for your business! - Broilers Express',
        },
      });
    }

    res.json({
      success: true,
      message: 'Business settings updated successfully',
      data: { settings },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
