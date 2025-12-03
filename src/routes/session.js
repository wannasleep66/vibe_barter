// src/routes/session.js
const express = require('express');
const sessionController = require('../controllers/sessionController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// User routes (can access own session info)
router.get('/my-sessions', sessionController.getActiveSessions);
router.delete('/revoke-current', sessionController.revokeOtherSessions); // Revoke all except current
router.delete('/revoke-token/:tokenId', sessionController.revokeSpecificToken); // Revoke specific token by ID
router.post('/revoke-token', sessionController.revokeSpecificToken); // Revoke specific token

// Admin routes (can manage any user's sessions)
router.get('/users/:userId/sessions', restrictTo('admin'), sessionController.getActiveSessions);
router.delete('/users/:userId/all-sessions', restrictTo('admin'), sessionController.revokeAllUserSessions);
router.patch('/users/:userId/force-password-change', restrictTo('admin'), sessionController.forcePasswordChange);

module.exports = router;