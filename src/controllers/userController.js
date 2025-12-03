// src/controllers/userController.js
const userService = require('../services/UserService');
const { logger } = require('../logger/logger');

const userController = {
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
      const user = await userService.updateUser(req.params.id, req.body);
      
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