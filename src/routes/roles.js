// src/routes/roles.js
const express = require('express');
const roleController = require('../controllers/roleController');
const { protect, restrictTo } = require('../middleware/auth');
const { isAdmin } = require('../middleware/rbac');
const {
  validateCreateRole,
  validateUpdateRole,
  validateRoleId,
  validateRoleName,
  validateGetRoles,
  validateAssignRoleToUser,
  validateAddPermissionToRole
} = require('../middleware/validation/roleValidation');

const router = express.Router();

// Apply authentication and admin middleware to all routes
router.use(protect);
router.use(isAdmin); // Only admins can manage roles

// Role management routes
router.get('/', validateGetRoles, roleController.getAllRoles);
router.get('/all-permissions', roleController.getAllPermissions);
router.get('/role-permissions/:roleName', validateRoleName, roleController.getRolePermissions);
router.get('/:id', validateRoleId, roleController.getRoleById);

router.post('/', validateCreateRole, roleController.createRole);
router.patch('/assign-role', validateAssignRoleToUser, roleController.assignRoleToUser);
router.patch('/add-permission', validateAddPermissionToRole, roleController.addPermissionToRole);
router.patch('/:id', validateRoleId, validateUpdateRole, roleController.updateRole);

router.delete('/:id', validateRoleId, roleController.deleteRole);

module.exports = router;