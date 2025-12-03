// src/routes/user.js
const express = require('express');
const userController = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/auth');
const { validateCreateUser, validateUpdateUser, validateUserId, validateGetUsers } = require('../middleware/validation/userValidation');
const { requirePermissions } = require('../middleware/rbac');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Apply RBAC middleware for user management - only admins can manage users
router.use(requirePermissions('user.read', 'user.create', 'user.update', 'user.delete'));

router.route('/')
  .get(validateGetUsers, userController.getAllUsers)
  .post(validateCreateUser, userController.createUser);

router.route('/:id')
  .get(validateUserId, userController.getUserById)
  .patch(validateUserId, validateUpdateUser, userController.updateUser)
  .delete(validateUserId, userController.deleteUser);

module.exports = router;