// src/routes/advertisementTags.js
const express = require('express');
const router = express.Router();
const advertisementController = require('../controllers/advertisementController');
const { protect } = require('../middleware/auth');
const { validateGetPopularTags, validateSearchTags } = require('../middleware/validation/tagValidation');

// Apply authentication to all routes
router.use(protect);

// Get popular tags for filtering suggestions
router.get('/popular', validateGetPopularTags, advertisementController.getPopularTags);

// Search tags by name for autocomplete
router.get('/search', validateSearchTags, advertisementController.searchTags);

module.exports = router;