// src/routes/user.js
const express = require('express');
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes except get all and get by ID
router.use(auth.protect);

// Restrict certain routes to admin users only
router.use(auth.restrictTo('admin'));

router.route('/')
  .get(userController.getAllUsers);

router.route('/:id')
  .get(userController.getUserById)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;