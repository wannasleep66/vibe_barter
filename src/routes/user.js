// src/routes/user.js
const express = require('express');
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const { validateCreateUser, validateUpdateUser, validateUserId, validateGetUsers } = require('../middleware/validation/userValidation');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(auth.protect);

// Restrict certain routes to admin users only
router.use(auth.restrictTo('admin'));

router.route('/')
  .get(validateGetUsers, userController.getAllUsers)
  .post(validateCreateUser, userController.createUser); // Add CREATE endpoint

router.route('/:id')
  .get(validateUserId, userController.getUserById)
  .patch(validateUserId, validateUpdateUser, userController.updateUser)
  .delete(validateUserId, userController.deleteUser);

module.exports = router;