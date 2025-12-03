// src/routes/auth.js
const express = require('express');
const { register, login, protect, restrictTo, forgotPassword, resetPassword, updatePassword, logout, getMe } = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.patch('/reset-password/:token', resetPassword);
router.patch('/update-password', protect, updatePassword);
router.get('/me', protect, getMe);

module.exports = router;