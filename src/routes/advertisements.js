// src/routes/advertisements.js
const express = require('express');
const advertisementController = require('../controllers/advertisementController');
const { protect } = require('../middleware/auth');
const {
  requirePermissions,
  isOwnResourceOrAdmin
} = require('../middleware/rbac');
const {
  validateCreateAdvertisement,
  validateUpdateAdvertisement,
  validateGetAdvertisementsQuery,
  validateAdvertisementId,
  validateUpdateUserAdvertisement,
  validateGetUserAdvertisementsQuery
} = require('../middleware/validation/advertisementValidation');

const router = express.Router();

// Public route to get all advertisements (with optional authentication for personalized results)
router.get('/', validateGetAdvertisementsQuery, advertisementController.getAllAdvertisements);

// Public route to get a specific advertisement
router.get('/:id', validateAdvertisementId, advertisementController.getAdvertisementById);

// Apply authentication middleware to all routes that require it
router.use(protect);

// Create new advertisement - requires advertisement.create permission
router.post('/',
  requirePermissions('advertisement.create'),
  validateCreateAdvertisement,
  advertisementController.createAdvertisement
);

// Update advertisement - user can update their own, admin/moderator can update any
router.patch('/:id',
  validateAdvertisementId,
  isOwnResourceOrAdmin('ownerId'), // Check if user owns the advertisement or is admin
  validateUpdateAdvertisement,
  advertisementController.updateAdvertisement
);

// Delete advertisement - user can delete their own, admin/moderator can delete any
router.delete('/:id',
  validateAdvertisementId,
  isOwnResourceOrAdmin('ownerId'), // Check if user owns the advertisement or is admin
  advertisementController.deleteAdvertisement
);

// Archive advertisement (soft delete) - user can archive their own, admin/moderator can archive any
router.patch('/:id/archive',
  validateAdvertisementId,
  isOwnResourceOrAdmin('ownerId'), // Check if user owns the advertisement or is admin
  advertisementController.archiveAdvertisement
);

// Activate advertisement - user can activate their own archived advertisement
router.patch('/:id/activate',
  validateAdvertisementId,
  isOwnResourceOrAdmin('ownerId'), // Check if user owns the advertisement or is admin
  advertisementController.activateAdvertisement
);

// Get user's own advertisements - requires advertisement.read permission
router.get('/my-advertisements',
  requirePermissions('advertisement.read'),
  validateGetUserAdvertisementsQuery,
  advertisementController.getUserAdvertisements
);

// Get recommended advertisements based on user preferences
router.get('/recommended',
  requirePermissions('advertisement.read'),
  advertisementController.getRecommendedAdvertisements
);

// Get rating information for an advertisement
router.get('/:id/rating',
  validateAdvertisementId,
  advertisementController.getAdvertisementRating
);

module.exports = router;