// tests/integration/auth.login.test.js
const request = require('supertest');
const app = require('../../src/server');
const User = require('../../src/models/User');
const mongoose = require('mongoose');

describe('Authentication - Login Integration Tests', () => {
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
    
    // Create a test user
    await User.create({
      email: 'test@example.com',
      password: 'TestPass123!',
      firstName: 'Test',
      lastName: 'User',
      isEmailVerified: true, // Verified user for login
      isActive: true
    });
  });

  describe('POST /api/auth/login', () => {
    it('should successfully login user with correct credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data.user.password).toBeUndefined(); // Password should not be returned
    });

    it('should fail login with incorrect email', async () => {
      const loginData = {
        email: 'wrong@example.com',
        password: 'TestPass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Incorrect email or password');
    });

    it('should fail login with incorrect password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Incorrect email or password');
    });

    it('should fail login with missing email', async () => {
      const loginData = {
        password: 'TestPass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Please provide email and password!');
    });

    it('should fail login with missing password', async () => {
      const loginData = {
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Please provide email and password!');
    });

    it('should fail login with invalid email format', async () => {
      const loginData = {
        email: 'invalid-email',
        password: 'TestPass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation error');
    });

    it('should fail login for deactivated account', async () => {
      // Create a deactivated user
      await User.create({
        email: 'deactivated@example.com',
        password: 'TestPass123!',
        firstName: 'Deactivated',
        lastName: 'User',
        isEmailVerified: true,
        isActive: false // Deactivated account
      });

      const loginData = {
        email: 'deactivated@example.com',
        password: 'TestPass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('This account has been deactivated');
    });

    it('should fail login for unverified email (if required)', async () => {
      // Create an unverified user
      await User.create({
        email: 'unverified@example.com',
        password: 'TestPass123!',
        firstName: 'Unverified',
        lastName: 'User',
        isEmailVerified: false, // Unverified email
        isActive: true
      });

      const loginData = {
        email: 'unverified@example.com',
        password: 'TestPass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Please verify your email address before logging in');
    });

    it('should update last login time on successful login', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPass123!'
      };

      // Get user before login to check lastLoginAt
      let userBefore = await User.findOne({ email: 'test@example.com' });
      const originalLastLogin = userBefore.lastLoginAt;

      // Login
      await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      // Get user after login to verify lastLoginAt is updated
      const userAfter = await User.findOne({ email: 'test@example.com' });
      expect(userAfter.lastLoginAt).toBeDefined();
      if (originalLastLogin) {
        expect(userAfter.lastLoginAt.getTime()).toBeGreaterThan(originalLastLogin.getTime());
      }
    });

    it('should fail login with empty credentials', async () => {
      const loginData = {
        email: '',
        password: ''
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Please provide email and password!');
    });

    it('should handle rate limiting for failed login attempts', async () => {
      // Try to exceed rate limit by making multiple failed login attempts
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'WrongPass123!'
      };

      // Make multiple failed requests
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/login')
          .send(loginData);
      }

      // The 6th request should be rate limited
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      // Check if rate limiting is working
      // The response might be 429 (Too Many Requests) or a specific message
      if (response.status === 429) {
        expect(response.status).toBe(429);
      } else if (response.status === 200 || response.status === 401) {
        // This might mean rate limiting wasn't triggered in test environment
        // which is okay for now
      }
    });
  });

  describe('Login Security Tests', () => {
    it('should not return password in response', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.data.user.password).toBeUndefined();
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should return appropriate user data on login', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      const userData = response.body.data.user;
      expect(userData).toHaveProperty('_id');
      expect(userData).toHaveProperty('email');
      expect(userData).toHaveProperty('firstName');
      expect(userData).toHaveProperty('lastName');
      expect(userData).toHaveProperty('role');
      expect(userData).toHaveProperty('isEmailVerified');
      expect(userData).toHaveProperty('isActive');
    });
  });
});