// src/routes/roles.js
const express = require('express');
const roleController = require('../controllers/roleController');
const { protect, restrictTo } = require('../middleware/auth');
const { isAdmin } = require('../middleware/rbac');

const router = express.Router();

// Apply authentication and admin middleware to all routes
router.use(protect);
router.use(isAdmin); // Only admins can manage roles

// Role management routes
router.get('/', roleController.getAllRoles);
router.get('/all-permissions', roleController.getAllPermissions);
router.get('/role-permissions/:roleName', roleController.getRolePermissions);
router.get('/:id', roleController.getRoleById);

router.post('/', roleController.createRole);
router.patch('/assign-role', roleController.assignRoleToUser);
router.patch('/add-permission', roleController.addPermissionToRole);
router.patch('/:id', roleController.updateRole);

router.delete('/:id', roleController.deleteRole);

module.exports = router;