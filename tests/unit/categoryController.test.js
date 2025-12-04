// tests/unit/categoryController.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/server');
const Category = require('../../src/models/Category');
const User = require('../../src/models/User');
const Role = require('../../src/models/Role');

describe('Category API', () => {
  let adminToken;
  let adminUser;
  
  // Create admin user before running tests
  beforeAll(async () => {
    // Clean up any existing test data
    await Category.deleteMany({});
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
    await Category.deleteMany({});
    await User.deleteMany({ email: 'admin@test.com' });
    await Role.deleteMany({ name: 'admin' });
    await mongoose.connection.close();
  });

  describe('POST /api/categories', () => {
    it('should create a new category', async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Electronics',
          description: 'Electronic devices and accessories',
          sortOrder: 1
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Electronics');
      expect(response.body.data.description).toBe('Electronic devices and accessories');
      expect(response.body.data.sortOrder).toBe(1);
      expect(response.body.data.parentId).toBeNull();
      expect(response.body.data.level).toBe(0); // Root category
    });

    it('should create a subcategory', async () => {
      // First create a parent category
      const parentCategory = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Computers',
          description: 'Computer related items',
          sortOrder: 2
        })
        .expect(201);

      // Create a subcategory
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Laptops',
          description: 'Portable computers',
          parentId: parentCategory.body.data._id,
          sortOrder: 1
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Laptops');
      expect(response.body.data.parentId).toBe(parentCategory.body.data._id);
      expect(response.body.data.level).toBe(1); // Child category
    });

    it('should return 400 when creating category with existing name', async () => {
      // Try to create a category with the same name as an existing one
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Electronics', // Same name as previously created category
          description: 'Duplicate category'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Category with this name already exists');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Category without name'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation error');
    });
  });

  describe('GET /api/categories', () => {
    beforeAll(async () => {
      // Create some test categories
      await Category.create([
        { name: 'Books', description: 'Books category', sortOrder: 3 },
        { name: 'Clothing', description: 'Clothing items', sortOrder: 4, isActive: false },
        { name: 'Sports', description: 'Sports equipment', sortOrder: 5 }
      ]);
    });

    it('should get all categories', async () => {
      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(4); // Including the ones created in previous tests
      
      // Check that at least the ones created in beforeAll are present
      const names = response.body.data.map(cat => cat.name);
      expect(names).toContain('Books');
      expect(names).toContain('Clothing');
      expect(names).toContain('Sports');
    });

    it('should filter categories by active status', async () => {
      const response = await request(app)
        .get('/api/categories?isActive=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      const inactiveCategories = response.body.data.filter(cat => !cat.isActive);
      expect(inactiveCategories.length).toBe(0); // Should only return active categories
    });

    it('should search categories by name', async () => {
      const response = await request(app)
        .get('/api/categories?search=Book')
        .expect(200);

      expect(response.body.success).toBe(true);
      const names = response.body.data.map(cat => cat.name);
      expect(names).toContain('Books');
    });
  });

  describe('GET /api/categories/:id', () => {
    let testCategory;

    beforeAll(async () => {
      testCategory = await Category.create({
        name: 'Test Category',
        description: 'A test category'
      });
    });

    it('should get a specific category', async () => {
      const response = await request(app)
        .get(`/api/categories/${testCategory._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Category');
      expect(response.body.data.description).toBe('A test category');
    });

    it('should return 404 for non-existent category', async () => {
      const response = await request(app)
        .get('/api/categories/507f1f77bcf86cd799439011') // Invalid ID
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Category not found');
    });
  });

  describe('PUT /api/categories/:id', () => {
    let testCategory;

    beforeAll(async () => {
      testCategory = await Category.create({
        name: 'Old Name',
        description: 'Old description'
      });
    });

    it('should update a category', async () => {
      const response = await request(app)
        .put(`/api/categories/${testCategory._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Name',
          description: 'Updated description',
          isActive: false
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Category updated successfully');
      expect(response.body.data.name).toBe('Updated Name');
      expect(response.body.data.description).toBe('Updated description');
      expect(response.body.data.isActive).toBe(false);
    });

    it('should return 400 when updating to an existing name', async () => {
      // Create another category first
      const anotherCategory = await Category.create({
        name: 'Another Category',
        description: 'Another test category'
      });

      const response = await request(app)
        .put(`/api/categories/${anotherCategory._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Name' // Same name as the previously updated category
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Category with this name already exists');
    });

    it('should validate update fields', async () => {
      const response = await request(app)
        .put(`/api/categories/${testCategory._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sortOrder: 'invalid' // Should be a number
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation error');
    });
  });

  describe('DELETE /api/categories/:id', () => {
    let testCategory;

    beforeAll(async () => {
      testCategory = await Category.create({
        name: 'To Be Deleted',
        description: 'Category for deletion test'
      });
    });

    it('should delete a category', async () => {
      const response = await request(app)
        .delete(`/api/categories/${testCategory._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Category deleted successfully');

      // Verify the category was actually deleted
      const deletedCheck = await request(app)
        .get(`/api/categories/${testCategory._id}`)
        .expect(404);

      expect(deletedCheck.body.success).toBe(false);
    });

    it('should return 404 when trying to delete non-existent category', async () => {
      const response = await request(app)
        .delete('/api/categories/507f1f77bcf86cd799439011') // Invalid ID
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Category not found');
    });
  });

  describe('GET /api/categories/tree', () => {
    beforeAll(async () => {
      // Clean up and create a hierarchy for testing
      await Category.deleteMany({});
      
      // Create root category
      const rootCat = await Category.create({
        name: 'Root Category',
        description: 'Root category for hierarchy test'
      });
      
      // Create subcategory
      await Category.create({
        name: 'Sub Category',
        description: 'Sub category',
        parentId: rootCat._id
      });
    });

    it('should return category tree', async () => {
      const response = await request(app)
        .get('/api/categories/tree')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Check that root categories exist and have children if they should
      if (response.body.data.length > 0) {
        const rootWithChildren = response.body.data.find(cat => cat.children && cat.children.length > 0);
        if (rootWithChildren) {
          expect(Array.isArray(rootWithChildren.children)).toBe(true);
        }
      }
    });
  });
});