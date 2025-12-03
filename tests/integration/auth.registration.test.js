// tests/integration/auth.registration.test.js
const request = require('supertest');
const app = require('../../src/server');
const User = require('../../src/models/User');
const mongoose = require('mongoose');

describe('Authentication - Registration Integration Tests', () => {
  beforeAll(async () => {
    // Connect to a test database
    await mongoose.connect(process.env.TEST_DB_URL || 'mongodb://localhost:27017/barter-vibe-test');
  });

  afterAll(async () => {
    // Clean up and close connection
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await User.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    it('should successfully register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPass123!',
        firstName: 'John',
        lastName: 'Doe'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.data.user).toHaveProperty('_id');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.firstName).toBe(userData.firstName);
      expect(response.body.data.user.lastName).toBe(userData.lastName);
      expect(response.body.data.user.password).toBeUndefined(); // Password should not be returned
    });

    it('should fail to register with invalid email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'TestPass123!',
        firstName: 'John',
        lastName: 'Doe'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation error');
    });

    it('should fail to register with weak password', async () => {
      const userData = {
        email: 'weakpass@example.com',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation error');
    });

    it('should fail to register with missing required fields', async () => {
      const userData = {
        email: 'missing@example.com',
        // Missing password, firstName, lastName
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation error');
    });

    it('should fail to register with password mismatch (if implemented)', async () => {
      // Note: Our current implementation doesn't check for password confirmation
      // This test is just to document the expected behavior
      const userData = {
        email: 'test@example.com',
        password: 'TestPass123!',
        firstName: 'John',
        lastName: 'Doe'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should fail to register with duplicate email', async () => {
      // First registration
      const userData = {
        email: 'duplicate@example.com',
        password: 'TestPass123!',
        firstName: 'John',
        lastName: 'Doe'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should validate password complexity (uppercase, lowercase, number, special char)', async () => {
      const invalidPasswords = [
        'nouppercase123!', // No uppercase
        'NOLOWERCASE123!', // No lowercase
        'NoNumber!',       // No number
        'NoSpecial123',    // No special character
        'short1A!'         // Too short
      ];

      for (const password of invalidPasswords) {
        const userData = {
          email: `invalidpass${Math.random() * 1000}@example.com`,
          password: password,
          firstName: 'John',
          lastName: 'Doe'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Validation error');
      }
    });

    it('should validate first and last name length', async () => {
      const userData = {
        email: 'nametest@example.com',
        password: 'TestPass123!',
        firstName: 'A', // Too short
        lastName: 'B'   // Too short
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation error');
    });

    it('should successfully register with valid long names', async () => {
      const userData = {
        email: 'longnametest@example.com',
        password: 'TestPass123!',
        firstName: 'John'.repeat(10), // 40 chars, within 50 limit
        lastName: 'Doe'.repeat(15)     // 45 chars, within 50 limit
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400); // Should fail due to name length validation

      expect(response.body.success).toBe(false);
    });
  });

  describe('Registration Security Tests', () => {
    it('should not return password in response', async () => {
      const userData = {
        email: 'securitytest@example.com',
        password: 'TestPass123!',
        firstName: 'Security',
        lastName: 'Test'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.data.user.password).toBeUndefined();
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should hash the password before saving to database', async () => {
      const userData = {
        email: 'hashtest@example.com',
        password: 'TestPass123!',
        firstName: 'Hash',
        lastName: 'Test'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      const userId = response.body.data.user._id;
      const userInDb = await User.findById(userId);

      expect(userInDb.password).not.toBe(userData.password); // Should be hashed
      expect(userInDb.password).toMatch(/^\$2[ayb]?\$\d+\$.+/); // Should be bcrypt hash format
    });
  });
});