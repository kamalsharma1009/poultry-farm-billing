const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth.routes');
const customerRoutes = require('./routes/customer.routes');
const billRoutes = require('./routes/bill.routes');
const settingsRoutes = require('./routes/settings.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const errorHandler = require('./middleware/error.middleware');

const app = express();

// Security and middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allows streaming inline PDFs
}));
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Healthcheck route
app.get('/health', (req, res) => {
  res.json({ success: true, status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
