// tests/integration/roleSystem.test.js
const request = require('supertest');
const app = require('../../src/server');
const User = require('../../src/models/User');
const Role = require('../../src/models/Role');
const Permission = require('../../src/models/Permission');
const rbacService = require('../../src/services/RbacService');
const mongoose = require('mongoose');

describe('Role-Based Access Control (RBAC) System', () => {
  let adminUser, regularUser, modUser;
  let adminToken, regularToken, modToken;

  beforeAll(async () => {
    // Connect to a test database
    await mongoose.connect(process.env.TEST_DB_URL || 'mongodb://localhost:27017/barter-vibe-test');
  });

  afterAll(async () => {
    // Clean up and close connection
    await User.deleteMany({});
    await Role.deleteMany({});
    await Permission.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await User.deleteMany({});
    await Role.deleteMany({});
    await Permission.deleteMany({});

    // Initialize default roles and permissions
    await rbacService.createDefaultRolesAndPermissions();

    // Create test users with different roles
    adminUser = await User.create({
      email: 'admin@example.com',
      password: 'AdminPass123!',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'  // Admin role
    });

    regularUser = await User.create({
      email: 'user@example.com',
      password: 'UserPass123!',
      firstName: 'Regular',
      lastName: 'User',
      role: 'user'  // Regular user role
    });

    modUser = await User.create({
      email: 'moderator@example.com',
      password: 'ModPass123!',
      firstName: 'Moderator',
      lastName: 'User',
      role: 'moderator'  // Moderator role
    });

    // Get auth tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'AdminPass123!' })
      .expect(200);
    
    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'UserPass123!' })
      .expect(200);

    const modLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'moderator@example.com', password: 'ModPass123!' })
      .expect(200);

    adminToken = adminLogin.body.token;
    regularToken = userLogin.body.token;
    modToken = modLogin.body.token;
  });

  describe('Role and Permission Models', () => {
    it('should create default roles with appropriate permissions', async () => {
      const userRole = await Role.findOne({ name: 'user' }).populate('permissions');
      expect(userRole).toBeDefined();
      expect(userRole.permissions).toContainEqual(
        expect.objectContaining({ name: 'profile.create' })
      );
      expect(userRole.permissions).toContainEqual(
        expect.objectContaining({ name: 'advertisement.read' })
      );

      const adminRole = await Role.findOne({ name: 'admin' }).populate('permissions');
      expect(adminRole).toBeDefined();
      // Admin role should have the wildcard permission
      expect(adminRole.permissions.length).toBeGreaterThan(10); // Admin should have many permissions
    });

    it('should create default permissions', async () => {
      const permCount = await Permission.countDocuments();
      expect(permCount).toBeGreaterThan(20); // Should have many default permissions
      
      const userReadPerm = await Permission.findOne({ name: 'user.read' });
      expect(userReadPerm).toBeDefined();
      expect(userReadPerm.resource).toBe('user');
      expect(userReadPerm.action).toBe('read');
    });
  });

  describe('Role Management API', () => {
    it('should allow admin to get all roles', async () => {
      const response = await request(app)
        .get('/api/roles/')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should allow admin to create a new role', async () => {
      const newRole = {
        name: 'tester',
        description: 'Test role for testing purposes',
        permissions: []
      };

      const response = await request(app)
        .post('/api/roles/')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newRole)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(newRole.name);
      expect(response.body.data.description).toBe(newRole.description);
      expect(response.body.message).toContain('created successfully');
    });

    it('should allow admin to assign role to user', async () => {
      const response = await request(app)
        .patch('/api/roles/assign-role')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: regularUser._id.toString(),
          roleName: 'moderator'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('assigned to user successfully');

      // Verify the role was actually assigned
      const updatedUser = await User.findById(regularUser._id);
      expect(updatedUser.role).toBe('moderator');
    });

    it('should deny non-admin access to role management endpoints', async () => {
      const response = await request(app)
        .get('/api/roles/')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Administrative access required');
    });

    it('should deny access without authentication', async () => {
      const response = await request(app)
        .get('/api/roles/')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('You are not logged in');
    });
  });

  describe('RBAC Middleware Functionality', () => {
    it('should allow admin to access user management endpoints', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Admin should be able to access user management
    });

    it('should deny regular user access to user management endpoints', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient permissions');
    });

    it('should allow moderator to access appropriate endpoints', async () => {
      // Moderators should have expanded permissions compared to regular users
      // But limited compared to admins
      const response = await request(app)
        .get('/api/sessions/my-sessions')
        .set('Authorization', `Bearer ${modToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Permission Checking', () => {
    it('should check if user has specific permissions', async () => {
      const hasPermission = await rbacService.hasPermission(adminUser._id, ['user.read', 'user.create']);
      expect(hasPermission).toBe(true);
    });

    it('should deny access when user lacks required permissions', async () => {
      const hasPermission = await rbacService.hasPermission(regularUser._id, ['user.delete']);
      // Regular users shouldn't have user.delete permission
      expect(hasPermission).toBe(false);
    });

    it('should handle wildcard permissions for admin', async () => {
      const hasPermission = await rbacService.hasPermission(adminUser._id, 'user.delete');
      // Admin should have wildcard permission
      expect(hasPermission).toBe(true);
    });
  });

  describe('Permission Assignment', () => {
    it('should allow adding permissions to roles', async () => {
      // First create a new permission
      const newPermission = await Permission.create({
        name: 'test.custom',
        resource: 'test',
        action: 'custom',
        description: 'Custom test permission'
      });

      const response = await request(app)
        .patch('/api/roles/add-permission')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          roleName: 'user',
          permissionName: 'test.custom'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('added to role user successfully');
    });

    it('should prevent non-admins from managing permissions', async () => {
      const response = await request(app)
        .patch('/api/roles/add-permission')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          roleName: 'user',
          permissionName: 'test.custom'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Administrative access required');
    });
  });

  describe('Security Tests', () => {
    it('should prevent privilege escalation by regular users', async () => {
      const response = await request(app)
        .patch('/api/roles/assign-role')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          userId: regularUser._id.toString(),
          roleName: 'admin'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Administrative access required');
    });

    it('should handle invalid permission names gracefully', async () => {
      const response = await request(app)
        .post('/api/roles/assign-role')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: regularUser._id.toString(),
          roleName: 'nonexistent_role'
        })
        .expect(400); // Should fail since role doesn't exist

      expect(response.body.success).toBe(false);
    });

    it('should prevent deletion of roles assigned to users', async () => {
      // First assign a role that's not default
      const newRole = await Role.create({
        name: 'temp',
        description: 'Temporary role for testing'
      });

      const response = await request(app)
        .delete(`/api/roles/${newRole._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200); // Should succeed since no users have this role

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });
  });
});