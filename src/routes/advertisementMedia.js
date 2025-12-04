// src/routes/advertisementMedia.js
const express = require('express');
const advertisementMediaController = require('../controllers/advertisementMediaController');
const { protect } = require('../middleware/auth');
const { 
  requirePermissions,
  isOwnResourceOrAdmin
} = require('../middleware/rbac');
const FileHandler = require('../utils/FileHandler');
const {
  validateCreateAdvertisementMedia,
  validateUpdateAdvertisementMedia,
  validateMediaId,
  validateAdvertisementId,
  validateMediaFile
} = require('../middleware/validation/advertisementMediaValidation');

const router = express.Router();
const fileHandler = new FileHandler('./uploads');

// Apply authentication middleware to all routes
router.use(protect);

// Define allowed file types and sizes for advertisement media
const mediaUploadOptions = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedMimes: [
    'image/jpeg',
    'image/jpg',
    'image/png', 
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/mpeg', 
    'video/quicktime',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  maxCount: 1 // Single file upload
};

// Upload media to advertisement - requires advertisementMedia.create permission
router.post('/',
  requirePermissions('advertisementMedia.create'),
  fileHandler.createUploadMiddleware('file', mediaUploadOptions),
  validateMediaFile,
  validateCreateAdvertisementMedia,
  advertisementMediaController.createAdvertisementMedia
);

// Get all media for an advertisement - requires advertisementMedia.read permission
router.get('/advertisement/:advertisementId',
  requirePermissions('advertisementMedia.read'),
  validateAdvertisementId,
  advertisementMediaController.getAdvertisementMedia
);

// Get primary media for an advertisement - requires advertisementMedia.read permission
router.get('/advertisement/:advertisementId/primary',
  requirePermissions('advertisementMedia.read'),
  validateAdvertisementId,
  advertisementMediaController.getPrimaryMedia
);

// Get media by ID - requires advertisementMedia.read permission
router.get('/:id',
  requirePermissions('advertisementMedia.read'),
  validateMediaId,
  advertisementMediaController.getMediaById
);

// Update media - requires advertisementMedia.update permission
router.patch('/:id',
  requirePermissions('advertisementMedia.update'),
  validateMediaId,
  validateUpdateAdvertisementMedia,
  advertisementMediaController.updateMedia
);

// Set media as primary - requires advertisementMedia.update permission
router.patch('/:id/set-primary',
  requirePermissions('advertisementMedia.update'),
  validateMediaId,
  advertisementMediaController.setAsPrimary
);

// Delete media - requires advertisementMedia.delete permission
router.delete('/:id',
  requirePermissions('advertisementMedia.delete'),
  validateMediaId,
  advertisementMediaController.deleteMedia
);

module.exports = router;