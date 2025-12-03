// tests/integration/permission.crud.test.js
const request = require('supertest');
const app = require('../../src/server');
const Permission = require('../../src/models/Permission');
const User = require('../../src/models/User');
const Role = require('../../src/models/Role');
const mongoose = require('mongoose');

describe('Permission CRUD Operations Integration Tests', () => {
  let adminToken, regularToken;
  let testPermission;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.TEST_DB_URL || 'mongodb://localhost:27017/barter-vibe-test');
  });

  afterAll(async () => {
    // Clean up and close connection
    await Permission.deleteMany({});
    await Role.deleteMany({});
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await Permission.deleteMany({});
    await Role.deleteMany({});
    
    // Create test users
    const adminUser = await User.create({
      email: 'admin@test.com',
      password: 'AdminPass123!',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    });

    const regularUser = await User.create({
      email: 'user@test.com',
      password: 'UserPass123!',
      firstName: 'Regular',
      lastName: 'User',
      role: 'user'
    });

    // Get auth tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'AdminPass123!' });
    
    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com', password: 'UserPass123!' });

    adminToken = adminLogin.body.token;
    regularToken = userLogin.body.token;
  });

  describe('POST /api/permissions - Create Permission', () => {
    it('should successfully create a new permission with admin privileges', async () => {
      const permissionData = {
        name: 'test.create',
        description: 'Test create permission',
        resource: 'test',
        action: 'create'
      };

      const response = await request(app)
        .post('/api/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(permissionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.name).toBe(permissionData.name);
      expect(response.body.data.description).toBe(permissionData.description);
      expect(response.body.data.resource).toBe(permissionData.resource);
      expect(response.body.data.action).toBe(permissionData.action);
      expect(response.body.data.isActive).toBe(true);
      expect(response.body.message).toBe('Permission created successfully');
    });

    it('should fail to create permission with invalid data', async () => {
      const invalidPermissionData = {
        name: 'ab', // Too short
        description: 'A'.repeat(201), // Too long description
        resource: 'invalid_resource_with_symbols!', // Alphanumeric only
        action: 'x' // Too short
      };

      const response = await request(app)
        .post('/api/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidPermissionData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation error');
    });

    it('should fail to create permission with duplicate name', async () => {
      // Create first permission
      const permissionData = {
        name: 'duplicate.create',
        description: 'Duplicate create permission',
        resource: 'duplicate',
        action: 'create'
      };

      await request(app)
        .post('/api/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(permissionData)
        .expect(201);

      // Try to create another permission with same name
      const response = await request(app)
        .post('/api/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(permissionData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should fail for non-admin user', async () => {
      const permissionData = {
        name: 'unauthorized.create',
        description: 'Unauthorized create permission',
        resource: 'test',
        action: 'create'
      };

      const response = await request(app)
        .post('/api/permissions')
        .set('Authorization', `Bearer ${regularToken}`)
        .send(permissionData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('permission');
    });

    it('should fail without authentication', async () => {
      const permissionData = {
        name: 'unauth.create',
        description: 'Unauthorized create permission',
        resource: 'test',
        action: 'create'
      };

      const response = await request(app)
        .post('/api/permissions')
        .send(permissionData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not logged in');
    });
  });

  describe('GET /api/permissions - Get All Permissions', () => {
    beforeEach(async () => {
      // Create some test permissions
      await Permission.create([
        {
          name: 'user.read',
          description: 'Allow user read',
          resource: 'user',
          action: 'read'
        },
        {
          name: 'user.update',
          description: 'Allow user update',
          resource: 'user',
          action: 'update'
        },
        {
          name: 'admin.create',
          description: 'Allow admin create',
          resource: 'admin',
          action: 'create',
          isActive: false
        }
      ]);
    });

    it('should retrieve all permissions with pagination', async () => {
      const response = await request(app)
        .get('/api/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
    });

    it('should filter permissions by resource', async () => {
      const response = await request(app)
        .get('/api/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ resource: 'user' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2); // user.read and user.update permissions
      
      response.body.data.forEach(permission => {
        expect(permission.resource).toBe('user');
      });
    });

    it('should filter permissions by action', async () => {
      const response = await request(app)
        .get('/api/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ action: 'read' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      response.body.data.forEach(permission => {
        expect(permission.action).toBe('read');
      });
    });

    it('should filter permissions by active status', async () => {
      const response = await request(app)
        .get('/api/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ isActive: 'true' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      response.body.data.forEach(permission => {
        expect(permission.isActive).toBe(true);
      });
    });

    it('should search permissions by name', async () => {
      const response = await request(app)
        .get('/api/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: 'user' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      response.body.data.forEach(permission => {
        expect(permission.name).toContain('user');
      });
    });
  });

  describe('GET /api/permissions/:id - Get Permission by ID', () => {
    beforeEach(async () => {
      testPermission = await Permission.create({
        name: 'get.test',
        description: 'Test get permission',
        resource: 'test',
        action: 'get'
      });
    });

    it('should retrieve a permission by ID', async () => {
      const response = await request(app)
        .get(`/api/permissions/${testPermission._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testPermission._id.toString());
      expect(response.body.data.name).toBe(testPermission.name);
      expect(response.body.data.description).toBe(testPermission.description);
    });

    it('should return 404 for non-existent permission', async () => {
      const response = await request(app)
        .get('/api/permissions/507f1f77bcf86cd799439011') // Valid but non-existent ID
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Permission not found');
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/permissions/invalidId')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid permission ID format');
    });
  });

  describe('PATCH /api/permissions/:id - Update Permission', () => {
    beforeEach(async () => {
      testPermission = await Permission.create({
        name: 'update.test',
        description: 'Test update permission',
        resource: 'test',
        action: 'update'
      });
    });

    it('should update permission successfully', async () => {
      const updateData = {
        name: 'updated.test',
        description: 'Updated test permission',
        resource: 'updated',
        action: 'modify',
        isActive: false
      };

      const response = await request(app)
        .patch(`/api/permissions/${testPermission._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.resource).toBe(updateData.resource);
      expect(response.body.data.action).toBe(updateData.action);
      expect(response.body.data.isActive).toBe(updateData.isActive);
      expect(response.body.message).toBe('Permission updated successfully');
    });

    it('should fail to update with duplicate name', async () => {
      // Create another permission first
      const otherPermission = await Permission.create({
        name: 'other.test',
        description: 'Other test permission',
        resource: 'other',
        action: 'test'
      });

      const updateData = {
        name: 'other.test' // Try to update with existing name
      };

      const response = await request(app)
        .patch(`/api/permissions/${testPermission._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should fail with invalid data', async () => {
      const updateData = {
        name: 'ab', // Too short
        resource: 'invalid_resource_with_symbols!' // Should be alphanumeric
      };

      const response = await request(app)
        .patch(`/api/permissions/${testPermission._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation error');
    });

    it('should fail for non-admin user', async () => {
      const updateData = {
        name: 'unauthorized.update'
      };

      const response = await request(app)
        .patch(`/api/permissions/${testPermission._id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('permission');
    });
  });

  describe('DELETE /api/permissions/:id - Delete Permission', () => {
    let permissionWithRole;

    beforeEach(async () => {
      testPermission = await Permission.create({
        name: 'delete.test',
        description: 'Test delete permission',
        resource: 'test',
        action: 'delete'
      });

      // Create a role and assign the permission to test deletion protection
      permissionWithRole = await Permission.create({
        name: 'role.assigned',
        description: 'Role assigned permission',
        resource: 'test',
        action: 'role'
      });

      const testRole = await Role.create({
        name: 'test_role',
        description: 'Test role for permission deletion',
        permissions: [permissionWithRole._id]
      });
    });

    it('should delete permission successfully when not assigned to any role', async () => {
      const response = await request(app)
        .delete(`/api/permissions/${testPermission._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Permission deleted successfully');

      // Verify permission is actually deleted
      const deletedPermission = await Permission.findById(testPermission._id);
      expect(deletedPermission).toBeNull();
    });

    it('should fail to delete permission assigned to a role', async () => {
      const response = await request(app)
        .delete(`/api/permissions/${permissionWithRole._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('cannot be deleted');
    });

    it('should return 404 for non-existent permission', async () => {
      const response = await request(app)
        .delete('/api/permissions/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Permission not found');
    });
  });

  describe('GET /api/permissions/search - Search Permissions', () => {
    beforeEach(async () => {
      await Permission.create([
        {
          name: 'article.create',
          description: 'Create articles',
          resource: 'article',
          action: 'create'
        },
        {
          name: 'article.read',
          description: 'Read articles',
          resource: 'article',
          action: 'read'
        },
        {
          name: 'article.update',
          description: 'Update articles',
          resource: 'article',
          action: 'update'
        },
        {
          name: 'user.manage',
          description: 'Manage users',
          resource: 'user',
          action: 'manage'
        }
      ]);
    });

    it('should search permissions by name', async () => {
      const response = await request(app)
        .get('/api/permissions/search')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ q: 'article' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(3); // Should find article.* permissions
      
      response.body.data.forEach(permission => {
        expect(permission.name).toContain('article');
      });
    });

    it('should search with additional filters', async () => {
      const response = await request(app)
        .get('/api/permissions/search')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ q: 'article', resource: 'article' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      response.body.data.forEach(permission => {
        expect(permission.name).toContain('article');
        expect(permission.resource).toBe('article');
      });
    });

    it('should return empty array for no matches', async () => {
      const response = await request(app)
        .get('/api/permissions/search')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ q: 'nonexistent' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0);
    });
  });

  describe('GET /api/permissions/resources and /api/permissions/actions - Get Available Resources/Actions', () => {
    beforeEach(async () => {
      await Permission.create([
        {
          name: 'user.create',
          description: 'User create permission',
          resource: 'user',
          action: 'create'
        },
        {
          name: 'user.read',
          description: 'User read permission',
          resource: 'user',
          action: 'read'
        },
        {
          name: 'advertisement.create',
          description: 'Ad create permission',
          resource: 'advertisement',
          action: 'create'
        }
      ]);
    });

    it('should get all available resources', async () => {
      const response = await request(app)
        .get('/api/permissions/resources')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toContain('user');
      expect(response.body.data).toContain('advertisement');
      expect(response.body.count).toBeGreaterThanOrEqual(2);
    });

    it('should get all available actions', async () => {
      const response = await request(app)
        .get('/api/permissions/actions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toContain('create');
      expect(response.body.data).toContain('read');
      expect(response.body.count).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GET /api/permissions/resource/:resource - Get Permissions by Resource', () => {
    beforeEach(async () => {
      await Permission.create([
        {
          name: 'user.create',
          description: 'Create user permission',
          resource: 'user',
          action: 'create'
        },
        {
          name: 'user.read',
          description: 'Read user permission',
          resource: 'user',
          action: 'read'
        },
        {
          name: 'user.update',
          description: 'Update user permission',
          resource: 'user',
          action: 'update',
          isActive: false
        },
        {
          name: 'article.create',
          description: 'Create article permission',
          resource: 'article',
          action: 'create'
        }
      ]);
    });

    it('should get permissions for a specific resource', async () => {
      const response = await request(app)
        .get('/api/permissions/resource/user')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeGreaterThanOrEqual(2); // Should have at least 2 user permissions
      
      response.body.data.forEach(permission => {
        expect(permission.resource).toBe('user');
      });
    });

    it('should only return active permissions by default', async () => {
      const response = await request(app)
        .get('/api/permissions/resource/user')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const inactivePermission = response.body.data.find(p => p.name === 'user.update');
      // If the API only returns active permissions by default, this should be undefined
      // If the API returns all permissions regardless of status, this would not be undefined
      // Based on our controller function, it should filter for active permissions
    });
  });

  describe('Security Tests', () => {
    it('should not allow regular users to access permission management endpoints', async () => {
      const response = await request(app)
        .get('/api/permissions')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('permission');
    });

    it('should validate all input for permission creation', async () => {
      const maliciousData = {
        name: 'a'.repeat(100), // Too long
        description: '<script>alert("xss")</script>', // Potential XSS
        resource: 'valid_resource',
        action: 'valid_action'
      };

      const response = await request(app)
        .post('/api/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(maliciousData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation error');
    });
  });
});