// src/services/UserService.js
const User = require('../models/User');
const { logger } = require('../logger/logger');
const AppError = require('../utils/AppError');

class UserService {
  // Create a new user
  async createUser(userData) {
    try {
      const user = new User(userData);
      await user.save();
      logger.info(`New user created with ID: ${user._id}`);
      return user;
    } catch (error) {
      logger.error('Error creating user:', error.message);
      if (error.code === 11000) {
        throw new AppError('Email already exists', 409);
      }
      throw new AppError('Error creating user', 500);
    }
  }

  // Find user by email
  async findByEmail(email) {
    try {
      const user = await User.findOne({ email: email }).select('+password');
      return user;
    } catch (error) {
      logger.error('Error finding user by email:', error.message);
      throw new AppError('Error finding user', 500);
    }
  }

  // Find user by ID
  async findById(userId) {
    try {
      const user = await User.findById(userId);
      return user;
    } catch (error) {
      logger.error('Error finding user by ID:', error.message);
      throw new AppError('Error finding user', 500);
    }
  }

  // Update user
  async updateUser(userId, updateData) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      );
      if (!user) {
        throw new AppError('User not found', 404);
      }
      logger.info(`User updated with ID: ${user._id}`);
      return user;
    } catch (error) {
      logger.error('Error updating user:', error.message);
      if (error.name === 'ValidationError') {
        throw new AppError('Validation error: ' + error.message, 400);
      }
      throw new AppError('Error updating user', 500);
    }
  }

  // Delete user
  async deleteUser(userId) {
    try {
      const user = await User.findByIdAndDelete(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }
      logger.info(`User deleted with ID: ${user._id}`);
      return user;
    } catch (error) {
      logger.error('Error deleting user:', error.message);
      throw new AppError('Error deleting user', 500);
    }
  }

  // Get all users with pagination
  async getAllUsers(page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      const users = await User.find()
        .populate('profile')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
      
      const total = await User.countDocuments();
      
      return {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting all users:', error.message);
      throw new AppError('Error retrieving users', 500);
    }
  }
}

module.exports = new UserService();