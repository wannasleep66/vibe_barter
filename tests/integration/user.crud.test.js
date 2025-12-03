// tests/integration/user.crud.test.js
const request = require('supertest');
const app = require('../../src/server');
const User = require('../../src/models/User');
const mongoose = require('mongoose');

describe('User CRUD Operations Integration Tests', () => {
  let adminToken, regularToken, createdUser;

  beforeAll(async () => {
    // Connect to a test database
    await mongoose.connect(process.env.TEST_DB_URL || 'mongodb://localhost:27017/barter-vibe-test');
    
    // Create admin and regular user for testing
    const adminUser = await User.create({
      email: 'admin@example.com',
      password: 'AdminPass123!',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    });
    
    const regularUser = await User.create({
      email: 'regular@example.com',
      password: 'RegularPass123!',
      firstName: 'Regular',
      lastName: 'User',
      role: 'user'
    });
    
    // Get tokens for testing (in a real scenario, we'd use proper JWT generation)
    // For now, we'll focus on testing the routes functionality
    adminToken = 'admin_token_placeholder'; // This would be an actual JWT in real implementation
    regularToken = 'regular_token_placeholder';
  });

  afterAll(async () => {
    // Clean up and close connection
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up any created users before each test
    await User.deleteMany({ email: { $regex: /test\d*@example\.com/ } });
  });

  describe('POST /api/users - Admin User Creation', () => {
    it('should create a new user with admin privileges', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'NewUserPass123!',
        firstName: 'New',
        lastName: 'User',
        role: 'user'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer admin_token_placeholder`)
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User created successfully');
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.firstName).toBe(userData.firstName);
      expect(response.body.data.lastName).toBe(userData.lastName);
      expect(response.body.data.role).toBe(userData.role);
    });

    it('should fail to create user with invalid data', async () => {
      const userData = {
        email: 'invalid-email', // Invalid email format
        password: 'short',      // Too short password
        firstName: 'N',         // Too short name
        lastName: 'U'           // Too short name
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer admin_token_placeholder`)
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation error');
    });

    it('should fail to create user with duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'ValidPass123!',
        firstName: 'Duplicate',
        lastName: 'User'
      };

      // First creation should succeed
      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer admin_token_placeholder`)
        .send(userData)
        .expect(201);

      // Second creation with same email should fail
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer admin_token_placeholder`)
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('GET /api/users - Get All Users', () => {
    beforeEach(async () => {
      // Create multiple users for testing
      await User.create([
        {
          email: 'user1@example.com',
          password: 'Pass123!',
          firstName: 'User1',
          lastName: 'One',
          role: 'user'
        },
        {
          email: 'user2@example.com',
          password: 'Pass123!',
          firstName: 'User2',
          lastName: 'Two',
          role: 'moderator'
        },
        {
          email: 'user3@example.com',
          password: 'Pass123!',
          firstName: 'User3',
          lastName: 'Three',
          role: 'user'
        }
      ]);
    });

    it('should get all users with pagination', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer admin_token_placeholder`)
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('pages');
    });

    it('should filter users by role', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer admin_token_placeholder`)
        .query({ role: 'moderator' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      response.body.data.forEach(user => {
        expect(user.role).toBe('moderator');
      });
    });

    it('should search users by name or email', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer admin_token_placeholder`)
        .query({ search: 'One' }) // Should match 'User1 One'
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach(user => {
        expect(user.firstName + ' ' + user.lastName).toContain('One');
      });
    });
  });

  describe('GET /api/users/:id - Get User By ID', () => {
    it('should get a user by ID', async () => {
      const user = await User.create({
        email: 'getuser@example.com',
        password: 'GetUserPass123!',
        firstName: 'Get',
        lastName: 'User'
      });

      const response = await request(app)
        .get(`/api/users/${user._id}`)
        .set('Authorization', `Bearer admin_token_placeholder`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(String(user._id));
      expect(response.body.data.email).toBe(user.email);
    });

    it('should return 404 for non-existent user ID', async () => {
      const response = await request(app)
        .get('/api/users/507f1f77bcf86cd799439011') // Random valid ObjectID
        .set('Authorization', `Bearer admin_token_placeholder`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });

    it('should return 400 for invalid user ID format', async () => {
      const response = await request(app)
        .get('/api/users/invalidid')
        .set('Authorization', `Bearer admin_token_placeholder`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid user ID format');
    });
  });

  describe('PATCH /api/users/:id - Update User', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'updateuser@example.com',
        password: 'UpdatePass123!',
        firstName: 'Update',
        lastName: 'User',
        role: 'user'
      });
    });

    it('should update user information', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        email: 'updated@example.com'
      };

      const response = await request(app)
        .patch(`/api/users/${testUser._id}`)
        .set('Authorization', `Bearer admin_token_placeholder`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe(updateData.firstName);
      expect(response.body.data.lastName).toBe(updateData.lastName);
      expect(response.body.data.email).toBe(updateData.email);
    });

    it('should fail to update with invalid data', async () => {
      const updateData = {
        firstName: 'A', // Too short
        lastName: 'B'   // Too short
      };

      const response = await request(app)
        .patch(`/api/users/${testUser._id}`)
        .set('Authorization', `Bearer admin_token_placeholder`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation error');
    });

    it('should fail to update with duplicate email', async () => {
      // Create another user first
      await User.create({
        email: 'existing@example.com',
        password: 'ExistingPass123!',
        firstName: 'Existing',
        lastName: 'User'
      });

      const updateData = {
        email: 'existing@example.com' // Duplicate email
      };

      const response = await request(app)
        .patch(`/api/users/${testUser._id}`)
        .set('Authorization', `Bearer admin_token_placeholder`)
        .send(updateData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('DELETE /api/users/:id - Delete User', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'deleteuser@example.com',
        password: 'DeletePass123!',
        firstName: 'Delete',
        lastName: 'User'
      });
    });

    it('should delete a user', async () => {
      const response = await request(app)
        .delete(`/api/users/${testUser._id}`)
        .set('Authorization', `Bearer admin_token_placeholder`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User deleted successfully');
      
      // Verify user was actually deleted
      const deletedUser = await User.findById(testUser._id);
      expect(deletedUser).toBeNull();
    });

    it('should return 404 when trying to delete non-existent user', async () => {
      const response = await request(app)
        .delete('/api/users/507f1f77bcf86cd799439011') // Random valid ObjectID
        .set('Authorization', `Bearer admin_token_placeholder`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });

    it('should return 400 for invalid user ID format', async () => {
      const response = await request(app)
        .delete('/api/users/invalidid')
        .set('Authorization', `Bearer admin_token_placeholder`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid user ID format');
    });
  });
});