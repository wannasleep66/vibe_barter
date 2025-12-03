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
  verifyEmail,
  refreshToken,
  googleAuth,
  googleAuthCallback,
  vkAuth,
  vkAuthCallback,
  yandexAuth,
  yandexAuthCallback
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

// Refresh token route
router.post('/refresh-token', refreshToken);

// OAuth routes
// Google
router.get('/google', googleAuth);
router.get('/google/callback', googleAuthCallback);

// VK
router.get('/vk', vkAuth);
router.get('/vk/callback', vkAuthCallback);

// Yandex
router.get('/yandex', yandexAuth);
router.get('/yandex/callback', yandexAuthCallback);

module.exports = router;