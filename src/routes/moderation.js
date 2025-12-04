// src/routes/moderation.js
const express = require('express');
const moderationController = require('../controllers/moderationController');
const { protect, restrictTo } = require('../middleware/auth');
const { 
  requirePermissions,
  isOwnResourceOrAdmin 
} = require('../middleware/rbac');
const {
  validateReportAdvertisement,
  validateReviewReport,
  validateModeratorAction,
  validateAppealSubmission
} = require('../middleware/validation/moderationValidation');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Route for regular users to report inappropriate advertisements
router.post('/reports/advertisements/:id', validateReportAdvertisement, moderationController.reportAdvertisement);

// Routes for moderators and admins
router.use(requirePermissions('moderation.read'));

// Get pending reports for moderators
router.get('/reports/pending', moderationController.getPendingReports);

// Get reports for a specific advertisement
router.get('/reports/advertisements/:id', moderationController.getAdvertisementReports);

// Review a report (moderator action)
router.patch('/reports/:id/review', validateReviewReport, 
             requirePermissions('moderation.update'), 
             moderationController.reviewReport);

// Hide an advertisement (moderator action)
router.patch('/advertisements/:id/hide', validateModeratorAction,
             requirePermissions('moderation.update'), 
             moderationController.hideAdvertisement);

// Unhide an advertisement (moderator action)
router.patch('/advertisements/:id/unhide', 
             requirePermissions('moderation.update'), 
             moderationController.unhideAdvertisement);

// Submit an appeal for a hidden advertisement (by ad owner)
router.post('/advertisements/:id/appeal', validateAppealSubmission, 
            moderationController.submitAppeal);

// Resolve an appeal (moderator action)
router.patch('/advertisements/:id/appeal/resolve', validateReviewReport,
             requirePermissions('moderation.update'), 
             moderationController.resolveAppeal);

// Get moderation statistics
router.get('/stats', requirePermissions('moderation.read'), moderationController.getModerationStats);

// Get auto-hide candidates
router.get('/auto-hide-candidates', requirePermissions('moderation.read'), moderationController.getAutoHideCandidates);

module.exports = router;