// src/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { logger } = require('./logger/logger');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // Limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(cors({
  origin: process.env.APP_URL || 'http://localhost:3000',
  credentials: true
}));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(errorHandler);

// Connect to MongoDB and start server
mongoose.connect(process.env.DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  logger.info('Connected to MongoDB');
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
  });
})
.catch(err => {
  logger.error('Database connection error:', err);
  process.exit(1);
});

module.exports = app;