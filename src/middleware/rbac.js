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

      // Check if user has required permissions
      const userPermissions = userRole.permissions.map(permission => permission.name);
      const hasAllRequiredPermissions = requiredPermissions.every(permission => 
        userPermissions.includes(permission)
      );

      if (!hasAllRequiredPermissions) {
        logger.warn(`User ${req.user.id} attempted to access resource without required permission(s)`);
        return next(new AppError('Insufficient permissions to perform this action', 403));
      }

      // Add permissions to request for use in controllers if needed
      req.userPermissions = userPermissions;
      next();
    } catch (error) {
      logger.error('RBAC middleware error:', error);
      return next(new AppError('Access control error. Please try again later.', 500));
    }
  };
};

/**
 * Resource-based permission check
 * @param {string} resource - The resource to check permissions for (e.g., 'user', 'advertisement')
 * @param {string} action - The action to check permissions for (e.g., 'read', 'create', 'update', 'delete')
 */
exports.checkResourcePermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new AppError('You are not logged in! Please log in to get access.', 401));
      }

      // Get user's role and permissions
      const userRole = await Role.findOne({ name: req.user.role })
        .populate('permissions')
        .exec();

      if (!userRole) {
        return next(new AppError('User role not found.', 401));
      }

      // Check if user has permission for this specific resource-action
      const requiredPermissionName = `${resource}.${action}`;
      const hasPermission = userRole.permissions.some(permission => 
        permission.name === requiredPermissionName || permission.name === '*'
      );

      if (!hasPermission) {
        logger.warn(`User ${req.user.id} attempted to ${action} ${resource} without permission`);
        return next(new AppError(`You do not have permission to ${action} ${resource}(s)`, 403));
      }

      // Check ownership for update/delete operations if needed
      if ((action === 'update' || action === 'delete') && req.params.id) {
        const resourceId = req.params.id;
        
        // Determine if the user owns the resource or has global permissions
        const isOwner = await checkResourceOwnership(req.user.id, resource, resourceId);
        
        // Admins and moderators may have broader permissions
        const isSuperUser = req.user.role === 'admin' || req.user.role === 'moderator';
        
        if (!isOwner && !isSuperUser) {
          return next(new AppError(`You can only ${action} your own ${resource}`, 403));
        }
      }

      next();
    } catch (error) {
      logger.error('Resource permission middleware error:', error);
      return next(new AppError('Access control error. Please try again later.', 500));
    }
  };
};

/**
 * Check if user owns a specific resource
 * @param {string} userId - The ID of the user
 * @param {string} resource - The resource type
 * @param {string} resourceId - The ID of the specific resource
 */
async function checkResourceOwnership(userId, resource, resourceId) {
  try {
    // This is a simplified implementation - in a full system, you'd have specific logic for each resource type
    switch (resource) {
      case 'user':
        return userId === resourceId;
      case 'profile':
        // Check if profile belongs to user
        const Profile = require('../models/Profile');
        const profile = await Profile.findById(resourceId);
        return profile && profile.user.toString() === userId;
      case 'advertisement':
        // Check if advertisement belongs to user
        const Advertisement = require('../models/Advertisement');
        const ad = await Advertisement.findById(resourceId);
        return ad && ad.ownerId.toString() === userId;
      case 'application':
        // Check if application belongs to user
        const Application = require('../models/Application');
        const app = await Application.findById(resourceId);
        return app && app.applicantId.toString() === userId;
      default:
        return false;
    }
  } catch (error) {
    logger.error('Error checking resource ownership:', error);
    return false;
  }
}

/**
 * Middleware to check if current user is an admin
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
 * Middleware to check if current user is a moderator or admin
 */
exports.isModeratorOrAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

    if (!['admin', 'moderator'].includes(req.user.role)) {
      return next(new AppError('Moderation access required', 403));
    }

    next();
  } catch (error) {
    logger.error('Moderator/admin check middleware error:', error);
    return next(new AppError('Access control error. Please try again later.', 500));
  }
};

module.exports = {
  requirePermissions: exports.requirePermissions,
  checkResourcePermission: exports.checkResourcePermission,
  isAdmin: exports.isAdmin,
  isModeratorOrAdmin: exports.isModeratorOrAdmin
};