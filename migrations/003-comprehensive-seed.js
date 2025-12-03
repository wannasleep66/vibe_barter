// migrations/002-seed-data-updated.js

module.exports = {
  description: 'Seed database with comprehensive roles, permissions and super admin account',

  up: async (db, client) => {
    console.log('Starting seed data creation...');

    // Create default permissions first
    const defaultPermissions = [
      // User permissions
      { name: 'user.create', resource: 'user', action: 'create', description: 'Create user accounts' },
      { name: 'user.read', resource: 'user', action: 'read', description: 'View user profiles' },
      { name: 'user.update', resource: 'user', action: 'update', description: 'Update user profiles' },
      { name: 'user.delete', resource: 'user', action: 'delete', description: 'Delete user accounts' },
      { name: 'user.manage', resource: 'user', action: 'manage', description: 'Manage all user accounts' },

      // Advertisement permissions
      { name: 'advertisement.create', resource: 'advertisement', action: 'create', description: 'Create advertisements' },
      { name: 'advertisement.read', resource: 'advertisement', action: 'read', description: 'View advertisements' },
      { name: 'advertisement.update', resource: 'advertisement', action: 'update', description: 'Update advertisements' },
      { name: 'advertisement.delete', resource: 'advertisement', action: 'delete', description: 'Delete advertisements' },
      { name: 'advertisement.moderate', resource: 'advertisement', action: 'moderate', description: 'Moderate advertisements' },

      // Profile permissions
      { name: 'profile.create', resource: 'profile', action: 'create', description: 'Create profiles' },
      { name: 'profile.read', resource: 'profile', action: 'read', description: 'View profiles' },
      { name: 'profile.update', resource: 'profile', action: 'update', description: 'Update profiles' },
      { name: 'profile.delete', resource: 'profile', action: 'delete', description: 'Delete profiles' },

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

    // Insert permissions that don't already exist
    for (const permData of defaultPermissions) {
      const existingPerm = await db.collection('permissions').findOne({ name: permData.name });
      if (!existingPerm) {
        await db.collection('permissions').insertOne({
          ...permData,
          systemPermission: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`Created permission: ${permData.name}`);
      } else {
        console.log(`Permission already exists: ${permData.name}`);
      }
    }

    // Create roles if they don't exist
    const rolesDefinitions = [
      {
        name: 'user',
        description: 'Standard user role with basic permissions',
        systemRole: true,
        permissions: [
          'profile.create', 'profile.read', 'profile.update',
          'advertisement.create', 'advertisement.read', 'advertisement.update',
          'review.create', 'review.read',
          'chat.create', 'chat.read',
          'application.create', 'application.read'
        ]
      },
      {
        name: 'moderator',
        description: 'Moderator role with additional management permissions',
        systemRole: true,
        permissions: [
          'profile.create', 'profile.read', 'profile.update',
          'advertisement.create', 'advertisement.read', 'advertisement.update', 'advertisement.moderate',
          'review.create', 'review.read', 'review.update', 'review.moderate',
          'chat.create', 'chat.read', 'chat.update',
          'application.create', 'application.read', 'application.update',
          'ticket.read', 'ticket.update', 'ticket.moderate',
          'category.create', 'category.read', 'category.update',
          'tag.create', 'tag.read', 'tag.update'
        ]
      },
      {
        name: 'admin',
        description: 'Administrator role with extensive system access',
        systemRole: true,
        permissions: [
          'user.read', 'user.update', 'advertisement.create', 'advertisement.read', 'advertisement.update', 
          'advertisement.delete', 'advertisement.moderate', 'review.read', 'review.update', 
          'review.delete', 'review.moderate', 'chat.create', 'chat.read', 'chat.update', 
          'application.read', 'application.update', 'ticket.read', 'ticket.update', 
          'ticket.moderate', 'category.create', 'category.read', 'category.update', 
          'category.delete', 'tag.create', 'tag.read', 'tag.update', 'tag.delete',
          'session.manage', 'session.read', 'permission.read'
        ]
      },
      {
        name: 'super-admin',
        description: 'Super administrator role with complete system access',
        systemRole: true,
        permissions: ['*'] // Wildcard for all permissions
      }
    ];

    for (const roleData of rolesDefinitions) {
      let role = await db.collection('roles').findOne({ name: roleData.name });
      if (!role) {
        // Get permission IDs for this role
        let permissionIds = [];

        if (roleData.permissions.includes('*')) {
          // If this is the super-admin role with wildcard, assign all permissions
          const allPerms = await db.collection('permissions').find({}).toArray();
          permissionIds = allPerms.map(p => p._id);
        } else {
          // Find specific permissions by name
          const perms = await db.collection('permissions').find({ 
            name: { $in: roleData.permissions } 
          }).toArray();
          permissionIds = perms.map(p => p._id);
        }

        role = await db.collection('roles').insertOne({
          name: roleData.name,
          description: roleData.description,
          permissions: permissionIds,
          systemRole: roleData.systemRole,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        console.log(`Created role: ${roleData.name} with ${permissionIds.length} permissions`);
      } else {
        console.log(`Role already exists: ${roleData.name}`);
      }
    }

    // Create Super Admin User if it doesn't exist
    const superAdmin = await db.collection('users').findOne({ email: 'superadmin@barter-vibe.com' });
    if (!superAdmin) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('SuperAdminPass123!', 12);

      const superAdminUser = {
        email: 'superadmin@barter-vibe.com',
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'super-admin',
        isEmailVerified: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection('users').insertOne(superAdminUser);
      console.log('Created super admin account: superadmin@barter-vibe.com');
      console.log('Default password: SuperAdminPass123!');
    } else {
      console.log('Super admin account already exists');
    }

    // Create default categories
    const categories = [
      { name: 'Services', description: 'Professional and personal services', isActive: true, sortOrder: 1 },
      { name: 'Electronics', description: 'Electronic devices and accessories', isActive: true, sortOrder: 2 },
      { name: 'Clothing', description: 'Apparel and fashion items', isActive: true, sortOrder: 3 },
      { name: 'Home & Garden', description: 'Furniture, decor, and gardening supplies', isActive: true, sortOrder: 4 },
      { name: 'Sports & Recreation', description: 'Sport equipment and recreational items', isActive: true, sortOrder: 5 },
      { name: 'Books', description: 'Books, magazines, and educational materials', isActive: true, sortOrder: 6 },
      { name: 'Vehicles', description: 'Cars, motorcycles, and other vehicles', isActive: true, sortOrder: 7 },
      { name: 'Art & Crafts', description: 'Artwork and crafting materials', isActive: true, sortOrder: 8 }
    ];

    for (const category of categories) {
      const existingCat = await db.collection('categories').findOne({ name: category.name });
      if (!existingCat) {
        await db.collection('categories').insertOne({
          ...category,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`Created category: ${category.name}`);
      } else {
        console.log(`Category already exists: ${category.name}`);
      }
    }

    // Create default tags
    const tags = [
      { name: 'professional', description: 'Professional services or skills', isSystemTag: true },
      { name: 'creative', description: 'Creative services or goods', isSystemTag: true },
      { name: 'technical', description: 'Technical services or goods', isSystemTag: true },
      { name: 'urgent', description: 'Urgent exchange needed', isSystemTag: true },
      { name: 'premium', description: 'Premium services or high-value items', isSystemTag: true },
      { name: 'local', description: 'Local services or pickup only', isSystemTag: true }
    ];

    for (const tag of tags) {
      const existingTag = await db.collection('tags').findOne({ name: tag.name });
      if (!existingTag) {
        await db.collection('tags').insertOne({
          ...tag,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`Created tag: ${tag.name}`);
      } else {
        console.log(`Tag already exists: ${tag.name}`);
      }
    }

    console.log('Seed data insertion completed successfully');
  },

  down: async (db, client) => {
    console.log('Starting seed data removal...');
    
    // Remove seed data that was created
    await db.collection('roles').deleteMany({ systemRole: true });
    await db.collection('permissions').deleteMany({ systemPermission: true });
    await db.collection('categories').deleteMany({});
    await db.collection('tags').deleteMany({ isSystemTag: true });
    await db.collection('users').deleteOne({ email: 'superadmin@barter-vibe.com' });

    console.log('Seed data removal completed successfully');
  }
};