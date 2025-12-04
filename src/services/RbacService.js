// src/services/RbacService.js
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const { logger } = require('../logger/logger');

class RbacService {
  /**
   * Create default roles and permissions
   */
  async createDefaultRolesAndPermissions() {
    try {
      // Define default permissions for each resource
      const defaultPermissions = [
        // User permissions
        { name: 'user.create', resource: 'user', action: 'create', description: 'Create user accounts' },
        { name: 'user.read', resource: 'user', action: 'read', description: 'View user profiles' },
        { name: 'user.update', resource: 'user', action: 'update', description: 'Update user profiles' },
        { name: 'user.delete', resource: 'user', action: 'delete', description: 'Delete user accounts' },
        
        // Advertisement permissions
        { name: 'advertisement.create', resource: 'advertisement', action: 'create', description: 'Create advertisements' },
        { name: 'advertisement.read', resource: 'advertisement', action: 'read', description: 'View advertisements' },
        { name: 'advertisement.update', resource: 'advertisement', action: 'update', description: 'Update advertisements' },
        { name: 'advertisement.delete', resource: 'advertisement', action: 'delete', description: 'Delete advertisements' },

        // Advertisement Media permissions
        { name: 'advertisementMedia.create', resource: 'advertisementMedia', action: 'create', description: 'Upload advertisement media' },
        { name: 'advertisementMedia.read', resource: 'advertisementMedia', action: 'read', description: 'View advertisement media' },
        { name: 'advertisementMedia.update', resource: 'advertisementMedia', action: 'update', description: 'Update advertisement media' },
        { name: 'advertisementMedia.delete', resource: 'advertisementMedia', action: 'delete', description: 'Delete advertisement media' },
        
        // Profile permissions
        { name: 'profile.create', resource: 'profile', action: 'create', description: 'Create profiles' },
        { name: 'profile.read', resource: 'profile', action: 'read', description: 'View profiles' },
        { name: 'profile.update', resource: 'profile', action: 'update', description: 'Update profiles' },
        { name: 'profile.delete', resource: 'profile', action: 'delete', description: 'Delete profiles' },
        // File permissions
        { name: 'file.upload', resource: 'file', action: 'create', description: 'Upload files' },
        { name: 'file.read', resource: 'file', action: 'read', description: 'Access files' },
        { name: 'file.delete', resource: 'file', action: 'delete', description: 'Delete files' },
        
        // Review permissions
        { name: 'review.create', resource: 'review', action: 'create', description: 'Create reviews' },
        { name: 'review.read', resource: 'review', action: 'read', description: 'View reviews' },
        { name: 'review.update', resource: 'review', action: 'update', description: 'Update reviews' },
        { name: 'review.delete', resource: 'review', action: 'delete', description: 'Delete reviews' },
        
        // Chat permissions
        { name: 'chat.create', resource: 'chat', action: 'create', description: 'Create chats' },
        { name: 'chat.read', resource: 'chat', action: 'read', description: 'View chats' },
        { name: 'chat.update', resource: 'chat', action: 'update', description: 'Update chats' },
        { name: 'chat.delete', resource: 'chat', action: 'delete', description: 'Delete chats' },
        
        // Application permissions
        { name: 'application.create', resource: 'application', action: 'create', description: 'Create applications' },
        { name: 'application.read', resource: 'application', action: 'read', description: 'View applications' },
        { name: 'application.update', resource: 'application', action: 'update', description: 'Update applications' },
        { name: 'application.delete', resource: 'application', action: 'delete', description: 'Delete applications' },
        
        // Ticket permissions
        { name: 'ticket.create', resource: 'ticket', action: 'create', description: 'Create tickets' },
        { name: 'ticket.read', resource: 'ticket', action: 'read', description: 'View tickets' },
        { name: 'ticket.update', resource: 'ticket', action: 'update', description: 'Update tickets' },
        { name: 'ticket.delete', resource: 'ticket', action: 'delete', description: 'Delete tickets' },
        
        // Category permissions
        { name: 'category.create', resource: 'category', action: 'create', description: 'Create categories' },
        { name: 'category.read', resource: 'category', action: 'read', description: 'View categories' },
        { name: 'category.update', resource: 'category', action: 'update', description: 'Update categories' },
        { name: 'category.delete', resource: 'category', action: 'delete', description: 'Delete categories' },
        
        // Tag permissions
        { name: 'tag.create', resource: 'tag', action: 'create', description: 'Create tags' },
        { name: 'tag.read', resource: 'tag', action: 'read', description: 'View tags' },
        { name: 'tag.update', resource: 'tag', action: 'update', description: 'Update tags' },
        { name: 'tag.delete', resource: 'tag', action: 'delete', description: 'Delete tags' },
        
        // Session permissions
        { name: 'session.manage', resource: 'session', action: 'manage', description: 'Manage sessions' },
        { name: 'session.read', resource: 'session', action: 'read', description: 'View sessions' },
      ];

      // Create permissions if they don't exist
      for (const permData of defaultPermissions) {
        const existingPerm = await Permission.findOne({ name: permData.name });
        if (!existingPerm) {
          await Permission.create({
            ...permData,
            systemPermission: true
          });
          logger.info(`Created permission: ${permData.name}`);
        }
      }

      // Define default roles
      const rolesDefinitions = [
        {
          name: 'user',
          description: 'Standard user role with basic permissions',
          permissions: [
            'profile.create', 'profile.read', 'profile.update', 'profile.delete',
            'advertisement.create', 'advertisement.read', 'advertisement.update', 'advertisement.delete',
            'advertisementMedia.create', 'advertisementMedia.read', 'advertisementMedia.update', 'advertisementMedia.delete',
            'review.create', 'review.read', 'review.update', 'review.delete',
            'chat.create', 'chat.read',
            'application.create', 'application.read',
            'ticket.create', 'ticket.read',
            'category.read',
            'tag.read',
            'file.upload', 'file.read'
          ],
          systemRole: true
        },
        {
          name: 'moderator',
          description: 'Moderator role with additional management permissions',
          permissions: [
            'profile.create', 'profile.read', 'profile.update', 'profile.delete',
            'advertisement.create', 'advertisement.read', 'advertisement.update', 'advertisement.delete',
            'advertisementMedia.create', 'advertisementMedia.read', 'advertisementMedia.update', 'advertisementMedia.delete',
            'review.create', 'review.read', 'review.update', 'review.delete',
            'chat.create', 'chat.read', 'chat.update',
            'application.create', 'application.read', 'application.update',
            'ticket.read', 'ticket.update',
            'category.create', 'category.read', 'category.update',
            'tag.create', 'tag.read', 'tag.update',
            'session.manage', 'session.read',
            'file.upload', 'file.read', 'file.delete'
          ],
          systemRole: true
        },
        {
          name: 'admin',
          description: 'Administrator role with full system access',
          permissions: ['*'], // Wildcard for all permissions
          systemRole: true
        }
      ];

      // Create roles if they don't exist
      for (const roleData of rolesDefinitions) {
        let role = await Role.findOne({ name: roleData.name });
        if (!role) {
          // Get permission IDs
          let permissionIds = [];

          if (roleData.permissions.includes('*')) {
            // If this is the admin role with wildcard, assign all permissions
            const allPerms = await Permission.find({});
            permissionIds = allPerms.map(p => p._id);
          } else {
            // Find specific permissions by name
            const perms = await Permission.find({
              name: { $in: roleData.permissions }
            });
            permissionIds = perms.map(p => p._id);
          }

          role = await Role.create({
            name: roleData.name,
            description: roleData.description,
            permissions: permissionIds,
            systemRole: roleData.systemRole
          });

          logger.info(`Created role: ${roleData.name} with ${permissionIds.length} permissions`);
        } else {
          // If role exists but lacks some permissions, add them
          const permDocs = await Permission.find({ name: { $in: roleData.permissions } });
          const permIds = permDocs.map(p => p._id);

          role.permissions.push(...permIds.filter(permId =>
            !role.permissions.some(existingPermId => existingPermId.toString() === permId.toString())
          ));

          await role.save();
          logger.info(`Updated role: ${roleData.name} with additional permissions`);
        }
      }

      logger.info('Default roles and permissions created successfully');
    } catch (error) {
      logger.error('Error creating default roles and permissions:', error);
      throw error;
    }
  }

  /**
   * Check if a user has specific permissions
   */
  async hasPermission(userId, requiredPermissions) {
    try {
      // Get user with role
      const user = await require('../models/User').findById(userId).populate('role');
      if (!user) {
        throw new Error('User not found');
      }

      // Get user's role and its permissions
      const userRole = await Role.findOne({ name: user.role })
        .populate('permissions');
      
      if (!userRole) {
        throw new Error('User role not found');
      }

      // Check if user has all required permissions
      const userPermissionNames = userRole.permissions.map(perm => perm.name);
      
      if (userPermissionNames.includes('*')) {
        // If user has wildcard permission, they have all permissions
        return true;
      }
      
      if (Array.isArray(requiredPermissions)) {
        return requiredPermissions.every(perm => userPermissionNames.includes(perm));
      } else {
        return userPermissionNames.includes(requiredPermissions);
      }
    } catch (error) {
      logger.error('Error checking user permissions:', error);
      throw error;
    }
  }

  /**
   * Assign role to user
   */
  async assignRoleToUser(userId, roleName) {
    try {
      // Verify role exists
      const role = await Role.findOne({ name: roleName });
      if (!role) {
        throw new Error('Role not found');
      }

      const User = require('../models/User');
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.role = roleName;
      await user.save();

      logger.info(`Role ${roleName} assigned to user ${userId}`);

      return user;
    } catch (error) {
      logger.error('Error assigning role to user:', error);
      throw error;
    }
  }

  /**
   * Add permission to role
   */
  async addPermissionToRole(roleName, permissionName) {
    try {
      // Find permission
      const permission = await Permission.findOne({ name: permissionName });
      if (!permission) {
        throw new Error('Permission not found');
      }

      // Find role
      const role = await Role.findOne({ name: roleName }).populate('permissions');
      if (!role) {
        throw new Error('Role not found');
      }

      // Check if permission is already assigned
      if (role.permissions.some(perm => perm.name === permissionName)) {
        logger.warn(`Permission ${permissionName} is already assigned to role ${roleName}`);
        return role;
      }

      // Add permission to role
      role.permissions.push(permission._id);
      await role.save();

      logger.info(`Permission ${permissionName} added to role ${roleName}`);

      return role;
    } catch (error) {
      logger.error('Error adding permission to role:', error);
      throw error;
    }
  }

  /**
   * Get all permissions for a role
   */
  async getRolePermissions(roleName) {
    try {
      const role = await Role.findOne({ name: roleName }).populate('permissions');
      if (!role) {
        throw new Error('Role not found');
      }

      return role.permissions;
    } catch (error) {
      logger.error('Error getting role permissions:', error);
      throw error;
    }
  }
}

module.exports = new RbacService();