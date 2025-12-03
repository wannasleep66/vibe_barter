// scripts/seed-db.js
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
const Permission = require('../src/models/Permission');
const { logger } = require('../src/logger/logger');
require('dotenv').config();

async function seedDatabase() {
  try {
    // Connect to database
    await mongoose.connect(process.env.DB_URL || process.env.MONGODB_URL || 'mongodb://localhost:27017/barter-vibe');

    logger.info('Connected to database');

    // Define default permissions
    const defaultPermissions = [
      // User permissions
      { name: 'user.create', resource: 'user', action: 'create', description: 'Create user accounts' },
      { name: 'user.read', resource: 'user', action: 'read', description: 'View user profiles' },
      { name: 'user.update', resource: 'user', action: 'update', description: 'Update user profiles' },
      { name: 'user.delete', resource: 'user', action: 'delete', description: 'Delete user accounts' },
      { name: 'user.manage', resource: 'user', action: 'manage', description: 'Manage all user accounts' },

      // Profile permissions
      { name: 'profile.create', resource: 'profile', action: 'create', description: 'Create profiles' },
      { name: 'profile.read', resource: 'profile', action: 'read', description: 'View profiles' },
      { name: 'profile.update', resource: 'profile', action: 'update', description: 'Update profiles' },
      { name: 'profile.delete', resource: 'profile', action: 'delete', description: 'Delete profiles' },

      // Advertisement permissions
      { name: 'advertisement.create', resource: 'advertisement', action: 'create', description: 'Create advertisements' },
      { name: 'advertisement.read', resource: 'advertisement', action: 'read', description: 'View advertisements' },
      { name: 'advertisement.update', resource: 'advertisement', action: 'update', description: 'Update advertisements' },
      { name: 'advertisement.delete', resource: 'advertisement', action: 'delete', description: 'Delete advertisements' },
      { name: 'advertisement.moderate', resource: 'advertisement', action: 'moderate', description: 'Moderate advertisements' },

      // Review permissions
      { name: 'review.create', resource: 'review', action: 'create', description: 'Create reviews' },
      { name: 'review.read', resource: 'review', action: 'read', description: 'View reviews' },
      { name: 'review.update', resource: 'review', action: 'update', description: 'Update reviews' },
      { name: 'review.delete', resource: 'review', action: 'delete', description: 'Delete reviews' },
      { name: 'review.moderate', resource: 'review', action: 'moderate', description: 'Moderate reviews' },

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
      { name: 'ticket.moderate', resource: 'ticket', action: 'moderate', description: 'Moderate tickets' },

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

      // Role permissions
      { name: 'role.create', resource: 'role', action: 'create', description: 'Create roles' },
      { name: 'role.read', resource: 'role', action: 'read', description: 'View roles' },
      { name: 'role.update', resource: 'role', action: 'update', description: 'Update roles' },
      { name: 'role.delete', resource: 'role', action: 'delete', description: 'Delete roles' },
      { name: 'role.assign', resource: 'role', action: 'assign', description: 'Assign roles to users' },

      // Permission permissions
      { name: 'permission.create', resource: 'permission', action: 'create', description: 'Create permissions' },
      { name: 'permission.read', resource: 'permission', action: 'read', description: 'View permissions' },
      { name: 'permission.update', resource: 'permission', action: 'update', description: 'Update permissions' },
      { name: 'permission.delete', resource: 'permission', action: 'delete', description: 'Delete permissions' },
    ];

    // Create permissions (only if they don't exist)
    for (const permData of defaultPermissions) {
      const existingPerm = await Permission.findOne({ name: permData.name });
      if (!existingPerm) {
        await Permission.create({
          ...permData,
          systemPermission: true,
          isActive: true
        });
        logger.info(`Created permission: ${permData.name}`);
      } else {
        logger.info(`Permission already exists: ${permData.name}`);
      }
    }

    // Define roles with permissions
    const rolesDefinitions = [
      {
        name: 'user',
        description: 'Standard user role with basic permissions',
        permissions: [
          'profile.create', 'profile.read', 'profile.update',
          'advertisement.create', 'advertisement.read', 'advertisement.update',
          'review.create', 'review.read', 'review.update',
          'chat.create', 'chat.read',
          'application.create', 'application.read',
          'ticket.create', 'ticket.read',
          'category.read',
          'tag.read'
        ],
        systemRole: true
      },
      {
        name: 'moderator',
        description: 'Moderator role with additional management permissions',
        permissions: [
          'profile.create', 'profile.read', 'profile.update',
          'advertisement.create', 'advertisement.read', 'advertisement.update', 'advertisement.moderate',
          'review.create', 'review.read', 'review.update', 'review.moderate',
          'chat.create', 'chat.read', 'chat.update',
          'application.create', 'application.read', 'application.update',
          'ticket.create', 'ticket.read', 'ticket.update', 'ticket.moderate',
          'category.create', 'category.read', 'category.update',
          'tag.create', 'tag.read', 'tag.update',
          'session.read'
        ],
        systemRole: true
      },
      {
        name: 'admin',
        description: 'Administrator role with extensive system access',
        permissions: [
          'user.read', 'user.update', 'user.manage',
          'profile.create', 'profile.read', 'profile.update', 'profile.delete',
          'advertisement.create', 'advertisement.read', 'advertisement.update', 'advertisement.delete', 'advertisement.moderate',
          'review.create', 'review.read', 'review.update', 'review.delete', 'review.moderate',
          'chat.create', 'chat.read', 'chat.update', 'chat.delete',
          'application.create', 'application.read', 'application.update', 'application.delete',
          'ticket.create', 'ticket.read', 'ticket.update', 'ticket.delete', 'ticket.moderate',
          'category.create', 'category.read', 'category.update', 'category.delete',
          'tag.create', 'tag.read', 'tag.update', 'tag.delete',
          'session.manage', 'session.read',
          'role.read', 'role.assign',
          'permission.read'
        ],
        systemRole: true
      },
      {
        name: 'super-admin',
        description: 'Super administrator role with complete system access',
        permissions: ['*'], // Wildcard for all permissions
        systemRole: true
      }
    ];

    // Create roles (only if they don't exist)
    for (const roleData of rolesDefinitions) {
      let role = await Role.findOne({ name: roleData.name });
      if (!role) {
        let permissionIds = [];

        if (roleData.permissions.includes('*')) {
          // If this is the super-admin role with wildcard, assign all permissions
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
          systemRole: roleData.systemRole,
          isActive: true
        });

        logger.info(`Created role: ${roleData.name} with ${permissionIds.length} permissions`);
      } else {
        logger.info(`Role already exists: ${roleData.name}`);

        // If role exists but doesn't have all permissions, add them
        const permDocs = await Permission.find({ name: { $in: roleData.permissions } });
        const permIds = permDocs.map(p => p._id);

        const currentPermIds = role.permissions.map(p => p.toString());
        const missingPermIds = permIds.filter(permId =>
          !currentPermIds.includes(permId.toString())
        );

        if (missingPermIds.length > 0) {
          role.permissions.push(...missingPermIds);
          await role.save();
          logger.info(`Added ${missingPermIds.length} permissions to existing role ${roleData.name}`);
        }
      }
    }

    // Create super admin user if it doesn't exist
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@barter-vibe.com';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdminPass123!';

    let superAdmin = await User.findOne({ email: superAdminEmail });
    if (!superAdmin) {
      const hashedPassword = require('bcryptjs').hashSync(superAdminPassword, 12);

      superAdmin = await User.create({
        email: superAdminEmail,
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'admin', // Using 'admin' role since we don't have 'super-admin' defined in enum
        isEmailVerified: true,
        isActive: true
      });

      logger.info(`Created super admin account: ${superAdminEmail}`);
      logger.info('Super admin account created successfully (password has been hashed)');
    } else {
      logger.info(`Super admin account already exists: ${superAdminEmail}`);
    }

    logger.info('Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Error during database seeding:', error);
    process.exit(1);
  }
}

seedDatabase();