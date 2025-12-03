// src/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
require('dotenv').config();

// Initialize Passport configuration
const passportConfig = require('./config/passport');

const { logger } = require('./logger/logger');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const sessionRoutes = require('./routes/session');
const roleRoutes = require('./routes/roles');
const permissionRoutes = require('./routes/permissions');
const rbacService = require('./services/RbacService');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// General rate limiting
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

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_session_secret_here',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Set to true in production when using HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Serve static files from frontend/public
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);

// Serve registration page
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/register.html'));
});

// Serve login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/login.html'));
});

// Serve dashboard page
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/dashboard.html'));
});

// Serve session management page
app.get('/sessions', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/session-management.html'));
});

// Serve role management page
app.get('/admin/roles', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/role-management.html'));
});

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
.then(async () => {
  logger.info('Connected to MongoDB');

  try {
    // Initialize default roles and permissions
    await rbacService.createDefaultRolesAndPermissions();
    logger.info('Default roles and permissions initialized');
  } catch (initError) {
    logger.error('Error initializing default roles and permissions:', initError);
  }

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