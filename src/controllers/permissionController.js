// src/controllers/permissionController.js
const Permission = require('../models/Permission');
const Role = require('../models/Role');
const { logger } = require('../logger/logger');
const AppError = require('../utils/AppError');

const permissionController = {
  // Get all permissions with filtering and pagination
  getAllPermissions: async (req, res, next) => {
    try {
      const { page = 1, limit = 10, search, resource, action, isActive } = req.query;

      // Build filter object
      const filter = {};
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { resource: { $regex: search, $options: 'i' } }
        ];
      }
      if (resource) filter.resource = resource;
      if (action) filter.action = action;
      if (isActive !== undefined) filter.isActive = isActive === 'true';

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Get permissions with filtering
      const permissions = await Permission.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      // Get total count for pagination
      const total = await Permission.countDocuments(filter);

      res.status(200).json({
        success: true,
        data: permissions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
          hasNext: parseInt(page) * parseInt(limit) < total,
          hasPrev: parseInt(page) > 1
        },
        filters: { search, resource, action, isActive }
      });
    } catch (error) {
      next(error);
    }
  },

  // Get permission by ID
  getPermissionById: async (req, res, next) => {
    try {
      const permission = await Permission.findById(req.params.id);

      if (!permission) {
        return next(new AppError('Permission not found', 404));
      }

      res.status(200).json({
        success: true,
        data: permission
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return next(new AppError('Invalid permission ID format', 400));
      }
      next(error);
    }
  },

  // Create new permission
  createPermission: async (req, res, next) => {
    try {
      const { name, description, resource, action } = req.body;

      // Check if permission with this name already exists
      const existingPermission = await Permission.findOne({ name });
      if (existingPermission) {
        return next(new AppError(`Permission with name '${name}' already exists`, 409));
      }

      const permission = await Permission.create({
        name,
        description,
        resource,
        action
      });

      res.status(201).json({
        success: true,
        data: permission,
        message: 'Permission created successfully'
      });
    } catch (error) {
      if (error.code === 11000) {
        return next(new AppError(`Permission with name '${req.body.name}' already exists`, 409));
      }
      next(error);
    }
  },

  // Update permission
  updatePermission: async (req, res, next) => {
    try {
      const { name, description, resource, action, isActive } = req.body;

      const permission = await Permission.findById(req.params.id);
      if (!permission) {
        return next(new AppError('Permission not found', 404));
      }

      // If updating the name, check uniqueness (but not for the same permission)
      if (name && name !== permission.name) {
        const existingPermission = await Permission.findOne({ 
          name, 
          _id: { $ne: req.params.id } 
        });
        if (existingPermission) {
          return next(new AppError(`Permission with name '${name}' already exists`, 409));
        }
        permission.name = name;
      }

      if (description !== undefined) permission.description = description;
      if (resource !== undefined) permission.resource = resource;
      if (action !== undefined) permission.action = action;
      if (isActive !== undefined) permission.isActive = isActive;

      await permission.save();

      res.status(200).json({
        success: true,
        data: permission,
        message: 'Permission updated successfully'
      });
    } catch (error) {
      if (error.code === 11000) {
        return next(new AppError(`Permission with name '${req.body.name}' already exists`, 409));
      }
      next(error);
    }
  },

  // Delete permission
  deletePermission: async (req, res, next) => {
    try {
      const permission = await Permission.findById(req.params.id);
      if (!permission) {
        return next(new AppError('Permission not found', 404));
      }

      // Check if this permission is assigned to any roles
      const rolesWithPermission = await Role.find({ 
        permissions: permission._id 
      });

      if (rolesWithPermission.length > 0) {
        const roleNames = rolesWithPermission.map(role => role.name);
        return next(new AppError(
          `Cannot delete permission: it is assigned to roles [${roleNames.join(', ')}]`,
          400
        ));
      }

      await Permission.findByIdAndDelete(req.params.id);

      res.status(200).json({
        success: true,
        message: 'Permission deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Search permissions
  searchPermissions: async (req, res, next) => {
    try {
      const { q, resource, action, limit = 20 } = req.query;

      if (!q) {
        return next(new AppError('Search query is required', 400));
      }

      // Build search query
      const searchQuery = {
        name: { $regex: q, $options: 'i' }
      };

      if (resource) searchQuery.resource = resource;
      if (action) searchQuery.action = action;

      const permissions = await Permission.find(searchQuery)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        data: permissions,
        count: permissions.length
      });
    } catch (error) {
      next(error);
    }
  },

  // Get permissions by resource
  getPermissionsByResource: async (req, res, next) => {
    try {
      const { resource } = req.params;

      const permissions = await Permission.find({ 
        resource: { $regex: resource, $options: 'i' },
        isActive: true 
      }).sort({ action: 1 });

      res.status(200).json({
        success: true,
        data: permissions,
        count: permissions.length
      });
    } catch (error) {
      next(error);
    }
  },

  // Get all available resources
  getAvailableResources: async (req, res, next) => {
    try {
      const resources = await Permission.distinct('resource', { isActive: true });

      res.status(200).json({
        success: true,
        data: resources,
        count: resources.length
      });
    } catch (error) {
      next(error);
    }
  },

  // Get all available actions
  getAvailableActions: async (req, res, next) => {
    try {
      const actions = await Permission.distinct('action', { isActive: true });

      res.status(200).json({
        success: true,
        data: actions,
        count: actions.length
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = permissionController;