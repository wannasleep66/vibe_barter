// tests/unit/tagController.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/server');
const Tag = require('../../src/models/Tag');
const User = require('../../src/models/User');
const Role = require('../../src/models/Role');

describe('Tag API', () => {
  let adminToken;
  let adminUser;
  
  // Create admin user before running tests
  beforeAll(async () => {
    // Clean up any existing test data
    await Tag.deleteMany({});
    await User.deleteMany({ email: 'admin@test.com' });
    await Role.deleteMany({ name: 'admin' });

    // Create admin role if it doesn't exist
    let adminRole = await Role.findOne({ name: 'admin' });
    if (!adminRole) {
      adminRole = await Role.create({
        name: 'admin',
        description: 'Administrator role with full system access',
        permissions: [], // We'll set this to have all permissions
        systemRole: true
      });
    }

    // Create admin user
    adminUser = await User.create({
      email: 'admin@test.com',
      firstName: 'Admin',
      lastName: 'User',
      password: 'password123',
      role: 'admin'
    });

    // Generate a JWT token for admin user
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'your_jwt_secret_here';
    adminToken = jwt.sign(
      { id: adminUser._id, email: adminUser.email, role: adminUser.role },
      secret,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Clean up test data
    await Tag.deleteMany({});
    await User.deleteMany({ email: 'admin@test.com' });
    await Role.deleteMany({ name: 'admin' });
    await mongoose.connection.close();
  });

  describe('POST /api/tags', () => {
    it('should create a new tag', async () => {
      const response = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Electronics',
          description: 'Electronic devices and accessories',
          color: '#FF5733',
          icon: 'fas fa-laptop'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Electronics');
      expect(response.body.data.description).toBe('Electronic devices and accessories');
      expect(response.body.data.color).toBe('#FF5733');
      expect(response.body.data.icon).toBe('fas fa-laptop');
      expect(response.body.data.usageCount).toBe(0);
      expect(response.body.data.isActive).toBe(true);
    });

    it('should return 400 when creating tag with existing name', async () => {
      // Try to create a tag with the same name as an existing one
      const response = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Electronics', // Same name as previously created tag
          description: 'Duplicate tag'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('A tag with this name already exists');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Tag without name'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation error');
    });

    it('should validate color format', async () => {
      const response = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid Color',
          color: 'not-a-color'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation error');
    });
  });

  describe('GET /api/tags', () => {
    beforeAll(async () => {
      // Create some test tags
      await Tag.create([
        { name: 'Books', description: 'Book related items', usageCount: 5 },
        { name: 'Clothing', description: 'Clothing items', usageCount: 3, isActive: false },
        { name: 'Sports', description: 'Sports equipment', usageCount: 8 }
      ]);
    });

    it('should get all tags', async () => {
      const response = await request(app)
        .get('/api/tags')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(4); // Including the ones created in previous tests
      
      // Check that at least the ones created in beforeAll are present
      const names = response.body.data.map(tag => tag.name);
      expect(names).toContain('Books');
      expect(names).toContain('Clothing');
      expect(names).toContain('Sports');
    });

    it('should filter tags by active status', async () => {
      const response = await request(app)
        .get('/api/tags?isActive=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      const inactiveTags = response.body.data.filter(tag => !tag.isActive);
      expect(inactiveTags.length).toBe(0); // Should only return active tags
    });

    it('should search tags by name', async () => {
      const response = await request(app)
        .get('/api/tags?search=Book')
        .expect(200);

      expect(response.body.success).toBe(true);
      const names = response.body.data.map(tag => tag.name);
      expect(names).toContain('Books');
    });

    it('should return paginated results', async () => {
      const response = await request(app)
        .get('/api/tags?page=1&limit=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.itemsPerPage).toBe(2);
    });
  });

  describe('GET /api/tags/:id', () => {
    let testTag;

    beforeAll(async () => {
      testTag = await Tag.create({
        name: 'Test Tag',
        description: 'A test tag'
      });
    });

    it('should get a specific tag', async () => {
      const response = await request(app)
        .get(`/api/tags/${testTag._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Tag');
      expect(response.body.data.description).toBe('A test tag');
    });

    it('should return 404 for non-existent tag', async () => {
      const response = await request(app)
        .get('/api/tags/507f1f77bcf86cd799439011') // Invalid ID
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Tag not found');
    });
  });

  describe('GET /api/tags/popular', () => {
    beforeAll(async () => {
      // Clean and create tags with different usage counts
      await Tag.deleteMany({});
      await Tag.create([
        { name: 'Popular Tag', usageCount: 10 },
        { name: 'Medium Tag', usageCount: 5 },
        { name: 'Less Popular Tag', usageCount: 1 }
      ]);
    });

    it('should get popular tags', async () => {
      const response = await request(app)
        .get('/api/tags/popular?limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      // First tag should be the one with highest usage count
      if (response.body.data.length > 0) {
        expect(response.body.data[0].name).toBe('Popular Tag');
      }
    });
  });

  describe('PUT /api/tags/:id', () => {
    let testTag;

    beforeAll(async () => {
      testTag = await Tag.create({
        name: 'Old Name',
        description: 'Old description'
      });
    });

    it('should update a tag', async () => {
      const response = await request(app)
        .put(`/api/tags/${testTag._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Name',
          description: 'Updated description',
          isActive: false
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Tag updated successfully');
      expect(response.body.data.name).toBe('Updated Name');
      expect(response.body.data.description).toBe('Updated description');
      expect(response.body.data.isActive).toBe(false);
    });

    it('should return 400 when updating to an existing name', async () => {
      // Create another tag first
      const anotherTag = await Tag.create({
        name: 'Another Tag',
        description: 'Another test tag'
      });

      const response = await request(app)
        .put(`/api/tags/${anotherTag._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Name' // Same name as the previously updated tag
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('A tag with this name already exists');
    });

    it('should validate update fields', async () => {
      const response = await request(app)
        .put(`/api/tags/${testTag._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          color: 'invalid-color-format'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation error');
    });
  });

  describe('DELETE /api/tags/:id', () => {
    let testTag;

    beforeAll(async () => {
      testTag = await Tag.create({
        name: 'To Be Deleted',
        description: 'Tag for deletion test'
      });
    });

    it('should delete a tag', async () => {
      const response = await request(app)
        .delete(`/api/tags/${testTag._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Tag deleted successfully');

      // Verify the tag was actually deleted
      const deletedCheck = await request(app)
        .get(`/api/tags/${testTag._id}`)
        .expect(404);

      expect(deletedCheck.body.success).toBe(false);
    });

    it('should return 404 when trying to delete non-existent tag', async () => {
      const response = await request(app)
        .delete('/api/tags/507f1f77bcf86cd799439011') // Invalid ID
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Tag not found');
    });
  });
});