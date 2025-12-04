// src/middleware/rbac.js
const User = require('../models/User');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const AppError = require('../utils/AppError');
const { logger } = require('../logger/logger');

/**
 * RBAC Middleware - Check if user has required permissions
 * @param {...string} requiredPermissions - Permissions required to access the resource
 */
exports.requirePermissions = (...requiredPermissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new AppError('You are not logged in! Please log in to get access.', 401));
      }

      // Get user's role
      const userRole = await Role.findOne({ name: req.user.role })
        .populate('permissions')
        .exec();

      if (!userRole) {
        return next(new AppError('User role not found.', 401));
      }

      // Get user's permissions
      const userPermissionNames = userRole.permissions.map(permission => permission.name);

      // Check if user has wildcard permission (admin access to everything)
      if (userPermissionNames.includes('*')) {
        return next();
      }

      // Check if user has all required permissions
      const hasAllPermissions = requiredPermissions.every(permission =>
        userPermissionNames.includes(permission)
      );

      if (!hasAllPermissions) {
        logger.warn(`User ${req.user.id} attempted to access resource without required permission(s)`);
        return next(new AppError('Insufficient permissions to perform this action', 403));
      }

      // Add permissions to request for use in controllers if needed
      req.userPermissions = userPermissionNames;
      next();
    } catch (error) {
      logger.error('RBAC middleware error:', error);
      return next(new AppError('Access control error. Please try again later.', 500));
    }
  };
};

/**
 * Check if user has a specific permission
 * @param {string} requiredPermission - The permission required
 */
exports.hasPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new AppError('You are not logged in! Please log in to get access.', 401));
      }

      // Get user's role and its permissions
      const userRole = await Role.findOne({ name: req.user.role })
        .populate('permissions')
        .exec();

      if (!userRole) {
        return next(new AppError('User role not found.', 401));
      }

      // Get user's permission names
      const userPermissionNames = userRole.permissions.map(permission => permission.name);

      // Check if user has wildcard permission or specific permission
      if (userPermissionNames.includes('*') || userPermissionNames.includes(requiredPermission)) {
        next();
      } else {
        logger.warn(`User ${req.user.id} attempted to access resource without required permission: ${requiredPermission}`);
        return next(new AppError('You do not have permission to perform this action', 403));
      }
    } catch (error) {
      logger.error('Permission check middleware error:', error);
      return next(new AppError('Access control error. Please try again later.', 500));
    }
  };
};


/**
 * Middleware to check if user is an admin
 */
exports.isAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

    if (req.user.role !== 'admin') {
      return next(new AppError('Administrative access required', 403));
    }

    next();
  } catch (error) {
    logger.error('Admin check middleware error:', error);
    return next(new AppError('Access control error. Please try again later.', 500));
  }
};

/**
 * Middleware to check if user is admin or moderator
 */
exports.isAdminOrModerator = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

    if (!['admin', 'moderator'].includes(req.user.role)) {
      return next(new AppError('Moderation access required', 403));
    }

    next();
  } catch (error) {
    logger.error('Admin/Moderator check middleware error:', error);
    return next(new AppError('Access control error. Please try again later.', 500));
  }
};

/**
 * Middleware to check if user has permission for specific resource action
 * @param {string} resource - The resource type (e.g., 'user', 'advertisement')
 * @param {string} action - The action to perform (e.g., 'create', 'read', 'update', 'delete')
 */
exports.checkResourcePermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new AppError('You are not logged in! Please log in to get access.', 401));
      }

      // Get user's role and its permissions
      const userRole = await Role.findOne({ name: req.user.role })
        .populate('permissions')
        .exec();

      if (!userRole) {
        return next(new AppError('User role not found.', 401));
      }

      // Get user's permission names
      const userPermissionNames = userRole.permissions.map(permission => permission.name);

      // Check if user has wildcard permission or specific resource permission
      const requiredPermission = `${resource}.${action}`;

      if (userPermissionNames.includes('*') || userPermissionNames.includes(requiredPermission)) {
        next();
      } else {
        logger.warn(`User ${req.user.id} attempted to ${action} ${resource} without permission`);
        return next(new AppError(`You do not have permission to ${action} ${resource}`, 403));
      }
    } catch (error) {
      logger.error('Resource permission check middleware error:', error);
      return next(new AppError('Access control error. Please try again later.', 500));
    }
  };
};

/**
 * Middleware to check if user is accessing their own resource or has admin privileges
 */
exports.isOwnResourceOrAdmin = (resourceIdField = 'id') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new AppError('You are not logged in! Please log in to get access.', 401));
      }

      const resourceId = req.params[resourceIdField] || req.body[resourceIdField];
      
      // Allow admin users to access any resource
      if (req.user.role === 'admin') {
        return next();
      }

      // Check if user is accessing their own resource
      if (req.user.id === resourceId || req.user._id.toString() === resourceId) {
        return next();
      }

      return next(new AppError('Access denied. You can only access your own resources.', 403));
    } catch (error) {
      logger.error('Own resource check middleware error:', error);
      return next(new AppError('Access control error. Please try again later.', 500));
    }
  };
};