// src/routes/category.js
const express = require('express');
const router = express.Router();
const CategoryController = require('../controllers/categoryController');
const { protect } = require('../middleware/auth');
const { requirePermissions } = require('../middleware/rbac');
const { validateCreateCategory, validateUpdateCategory } = require('../middleware/categoryValidation');

// Public route to get categories
router.get('/', CategoryController.getCategories);

// Public route to get a specific category
router.get('/:id', CategoryController.getCategory);

// Public route to get category tree
router.get('/tree', CategoryController.getCategoryTree);

// Protected routes for category management
router.use(protect);

// Admin routes for category management
router.post('/', requirePermissions('category.create'), validateCreateCategory, CategoryController.createCategory);
router.put('/:id', requirePermissions('category.update'), validateUpdateCategory, CategoryController.updateCategory);
router.delete('/:id', requirePermissions('category.delete'), CategoryController.deleteCategory);

module.exports = router;