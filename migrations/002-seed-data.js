// migrations/002-seed-data.js

module.exports = {
  description: 'Seed database with initial data',
  
  up: async (db, client) => {
    // Insert default roles
    await db.collection('roles').insertMany([
      {
        name: 'admin',
        description: 'Administrator with full access',
        isActive: true,
        systemRole: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'moderator',
        description: 'Moderator with administrative privileges',
        isActive: true,
        systemRole: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'user',
        description: 'Regular user',
        isActive: true,
        systemRole: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
    
    // Insert default permissions
    const permissions = [
      {
        name: 'user.create',
        description: 'Create users',
        resource: 'user',
        action: 'create',
        isActive: true,
        systemPermission: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'user.read',
        description: 'Read users',
        resource: 'user',
        action: 'read',
        isActive: true,
        systemPermission: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'user.update',
        description: 'Update users',
        resource: 'user',
        action: 'update',
        isActive: true,
        systemPermission: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'user.delete',
        description: 'Delete users',
        resource: 'user',
        action: 'delete',
        isActive: true,
        systemPermission: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'advertisement.create',
        description: 'Create advertisements',
        resource: 'advertisement',
        action: 'create',
        isActive: true,
        systemPermission: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'advertisement.read',
        description: 'Read advertisements',
        resource: 'advertisement',
        action: 'read',
        isActive: true,
        systemPermission: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'advertisement.update',
        description: 'Update advertisements',
        resource: 'advertisement',
        action: 'update',
        isActive: true,
        systemPermission: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'advertisement.delete',
        description: 'Delete advertisements',
        resource: 'advertisement',
        action: 'delete',
        isActive: true,
        systemPermission: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'review.create',
        description: 'Create reviews',
        resource: 'review',
        action: 'create',
        isActive: true,
        systemPermission: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'review.read',
        description: 'Read reviews',
        resource: 'review',
        action: 'read',
        isActive: true,
        systemPermission: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    await db.collection('permissions').insertMany(permissions);
    
    // Link permissions to admin role (in a real scenario, we'd do this properly)
    const adminRole = await db.collection('roles').findOne({ name: 'admin' });
    const allPermissions = await db.collection('permissions').find({}).toArray();
    const permissionIds = allPermissions.map(p => p._id);
    
    await db.collection('roles').updateOne(
      { _id: adminRole._id },
      { $set: { permissions: permissionIds } }
    );
    
    // Insert default categories
    await db.collection('categories').insertMany([
      {
        name: 'Services',
        description: 'Professional and personal services',
        isActive: true,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Goods',
        description: 'Physical items for exchange',
        isActive: true,
        sortOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Skills',
        description: 'Expertise and abilities',
        isActive: true,
        sortOrder: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Experience',
        description: 'Unique experiences and activities',
        isActive: true,
        sortOrder: 4,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
    
    // Insert default tags
    await db.collection('tags').insertMany([
      {
        name: 'professional',
        description: 'Professional services or skills',
        isActive: true,
        isSystemTag: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'creative',
        description: 'Creative services or goods',
        isActive: true,
        isSystemTag: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'technical',
        description: 'Technical services or goods',
        isActive: true,
        isSystemTag: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'urgent',
        description: 'Urgent exchange needed',
        isActive: true,
        isSystemTag: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
    
    console.log('Seed data inserted successfully');
  },
  
  down: async (db, client) => {
    // Remove seed data
    await db.collection('roles').deleteMany({ systemRole: true });
    await db.collection('permissions').deleteMany({ systemPermission: true });
    await db.collection('categories').deleteMany({});
    await db.collection('tags').deleteMany({ isSystemTag: true });
    
    console.log('Seed data removed successfully');
  }
};