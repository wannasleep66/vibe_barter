// src/routes/permissions.js
const express = require('express');
const permissionController = require('../controllers/permissionController');
const { protect } = require('../middleware/auth');
const { isAdmin } = require('../middleware/rbac');
const { 
  validateCreatePermission,
  validateUpdatePermission,
  validatePermissionId,
  validateGetPermissions,
  validateSearchPermissions
} = require('../middleware/validation/permissionValidation');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Apply admin middleware - only admins can manage permissions
router.use(isAdmin);

// Permission management routes
router.route('/')
  .get(validateGetPermissions, permissionController.getAllPermissions)
  .post(validateCreatePermission, permissionController.createPermission);

router.route('/search')
  .get(validateSearchPermissions, permissionController.searchPermissions);

router.route('/resources')
  .get(permissionController.getAvailableResources);

router.route('/actions')
  .get(permissionController.getAvailableActions);

router.route('/:id')
  .get(validatePermissionId, permissionController.getPermissionById)
  .patch(validatePermissionId, validateUpdatePermission, permissionController.updatePermission)
  .delete(validatePermissionId, permissionController.deletePermission);

router.route('/resource/:resource')
  .get(permissionController.getPermissionsByResource);

module.exports = router;