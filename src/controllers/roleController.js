// src/controllers/roleController.js
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const User = require('../models/User');
const rbacService = require('../services/RbacService');
const { logger } = require('../logger/logger');

const roleController = {
  // Get all roles
  getAllRoles: async (req, res, next) => {
    try {
      const roles = await Role.find().populate('permissions', 'name description resource action');
      
      res.status(200).json({
        success: true,
        data: roles,
        count: roles.length
      });
    } catch (error) {
      next(error);
    }
  },

  // Get role by ID
  getRoleById: async (req, res, next) => {
    try {
      const role = await Role.findById(req.params.id).populate('permissions', 'name description resource action');
      
      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      res.status(200).json({
        success: true,
        data: role
      });
    } catch (error) {
      next(error);
    }
  },

  // Create new role
  createRole: async (req, res, next) => {
    try {
      const { name, description, permissions = [] } = req.body;

      // Validate role name uniqueness
      const existingRole = await Role.findOne({ name });
      if (existingRole) {
        return res.status(400).json({
          success: false,
          message: 'Role with this name already exists'
        });
      }

      // Validate permissions exist
      if (permissions.length > 0) {
        const existingPerms = await Permission.find({ _id: { $in: permissions } });
        if (existingPerms.length !== permissions.length) {
          return res.status(400).json({
            success: false,
            message: 'Some permissions do not exist'
          });
        }
      }

      const role = await Role.create({
        name,
        description,
        permissions
      });

      res.status(201).json({
        success: true,
        data: role,
        message: 'Role created successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Update role
  updateRole: async (req, res, next) => {
    try {
      const { name, description, permissions } = req.body;

      const role = await Role.findById(req.params.id);
      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      // If updating name, check for uniqueness
      if (name && name !== role.name) {
        const existingRole = await Role.findOne({ name, _id: { $ne: req.params.id } });
        if (existingRole) {
          return res.status(400).json({
            success: false,
            message: 'Role with this name already exists'
          });
        }
        role.name = name;
      }

      if (description) role.description = description;
      if (permissions) role.permissions = permissions;

      await role.save();

      // Populate and return updated role
      const updatedRole = await Role.findById(role._id).populate('permissions', 'name description resource action');

      res.status(200).json({
        success: true,
        data: updatedRole,
        message: 'Role updated successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Delete role
  deleteRole: async (req, res, next) => {
    try {
      const role = await Role.findById(req.params.id);
      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      // Check if role is assigned to any users
      const usersWithRole = await User.find({ role: role.name });
      if (usersWithRole.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete role: it is assigned to existing users'
        });
      }

      await Role.findByIdAndDelete(req.params.id);

      res.status(200).json({
        success: true,
        message: 'Role deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Get all permissions
  getAllPermissions: async (req, res, next) => {
    try {
      const permissions = await Permission.find();
      
      res.status(200).json({
        success: true,
        data: permissions,
        count: permissions.length
      });
    } catch (error) {
      next(error);
    }
  },

  // Assign role to user
  assignRoleToUser: async (req, res, next) => {
    try {
      const { userId, roleName } = req.body;

      const result = await rbacService.assignRoleToUser(userId, roleName);

      res.status(200).json({
        success: true,
        data: result,
        message: `Role ${roleName} assigned to user successfully`
      });
    } catch (error) {
      next(error);
    }
  },

  // Add permission to role
  addPermissionToRole: async (req, res, next) => {
    try {
      const { roleName, permissionName } = req.body;

      const result = await rbacService.addPermissionToRole(roleName, permissionName);

      res.status(200).json({
        success: true,
        data: result,
        message: `Permission ${permissionName} added to role ${roleName} successfully`
      });
    } catch (error) {
      next(error);
    }
  },

  // Get role permissions
  getRolePermissions: async (req, res, next) => {
    try {
      const permissions = await rbacService.getRolePermissions(req.params.roleName);

      res.status(200).json({
        success: true,
        data: permissions,
        count: permissions.length
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = roleController;