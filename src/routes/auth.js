// src/routes/auth.js
const express = require('express');
const {
  register,
  login,
  protect,
  restrictTo,
  forgotPassword,
  resetPassword,
  updatePassword,
  logout,
  getMe,
  requestVerificationEmail,
  verifyEmail
} = require('../controllers/authController');
const {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateUpdatePassword,
  validateEmailVerificationRequest,
  validateEmailVerificationToken
} = require('../middleware/validation/authValidation');

// Import middleware
const authLimiter = require('../middleware/rateLimit');

const router = express.Router();

router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);
router.post('/logout', logout);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.patch('/reset-password/:token', validateResetPassword, resetPassword);
router.patch('/update-password', protect, validateUpdatePassword, updatePassword);
router.get('/me', protect, getMe);

// Email verification routes
router.post('/verify-email', validateEmailVerificationRequest, requestVerificationEmail);
router.get('/verify-email/:token', validateEmailVerificationToken, verifyEmail);

module.exports = router;