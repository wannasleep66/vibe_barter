// src/controllers/userController.js
const userService = require('../services/UserService');
const { logger } = require('../logger/logger');

const userController = {
  // Create user
  async createUser(req, res, next) {
    try {
      // Exclude sensitive fields from the request body if they exist
      const { password, role, isEmailVerified, ...userData } = req.body;

      // For admin-created users, allow role assignment, otherwise default to 'user'
      const userRole = req.user.role === 'admin' ? (role || 'user') : 'user';

      const newUser = await userService.createUser({
        ...userData,
        password: password || 'TempPass123!', // Generate temporary password if not provided
        role: userRole
      });

      res.status(201).json({
        success: true,
        data: newUser,
        message: 'User created successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Get all users
  async getAllUsers(req, res, next) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const result = await userService.getAllUsers(page, limit);

      res.status(200).json({
        success: true,
        data: result.users,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  },

  // Get user by ID
  async getUserById(req, res, next) {
    try {
      const user = await userService.findById(req.params.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  },

  // Update user
  async updateUser(req, res, next) {
    try {
      // Handle sensitive fields updates based on user permissions
      const { password, role, isEmailVerified, ...updateData } = req.body;
      const updateObj = { ...updateData };

      // Only admins can update role and email verification status
      if (req.user.role === 'admin') {
        if (role) updateObj.role = role;
        if (isEmailVerified !== undefined) updateObj.isEmailVerified = isEmailVerified;
      }

      // Only admins or user themselves can update password
      if (password && (req.user.role === 'admin' || req.user.id === req.params.id)) {
        updateObj.password = password;
      }

      const user = await userService.updateUser(req.params.id, updateObj);

      res.status(200).json({
        success: true,
        data: user,
        message: 'User updated successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Delete user
  async deleteUser(req, res, next) {
    try {
      const user = await userService.deleteUser(req.params.id);

      res.status(200).json({
        success: true,
        data: user,
        message: 'User deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = userController;