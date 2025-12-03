// src/routes/auth.js
const express = require('express');
const { register, login, protect, restrictTo, forgotPassword, resetPassword, updatePassword, logout, getMe } = require('../controllers/authController');
const { validateRegister, validateLogin, validateForgotPassword, validateResetPassword, validateUpdatePassword } = require('../middleware/validation/authValidation');

const router = express.Router();

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/logout', logout);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.patch('/reset-password/:token', validateResetPassword, resetPassword);
router.patch('/update-password', protect, validateUpdatePassword, updatePassword);
router.get('/me', protect, getMe);

module.exports = router;