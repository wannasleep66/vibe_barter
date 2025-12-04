// src/routes/tag.js
const express = require('express');
const router = express.Router();
const TagController = require('../controllers/tagController');
const { protect } = require('../middleware/auth');
const { requirePermissions } = require('../middleware/rbac');
const { validateCreateTag, validateUpdateTag } = require('../middleware/tagValidation');

// Public route to get tags
router.get('/', TagController.getTags);

// Public route to get a specific tag
router.get('/:id', TagController.getTag);

// Public route to get popular tags
router.get('/popular', TagController.getPopularTags);

// Protected routes for tag management
router.use(protect);

// Admin routes for tag management
router.post('/', requirePermissions('tag.create'), validateCreateTag, TagController.createTag);
router.put('/:id', requirePermissions('tag.update'), validateUpdateTag, TagController.updateTag);
router.delete('/:id', requirePermissions('tag.delete'), TagController.deleteTag);

module.exports = router;