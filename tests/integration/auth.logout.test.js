// tests/integration/auth.logout.test.js
const request = require('supertest');
const app = require('../../src/server');
const User = require('../../src/models/User');
const TokenBlacklist = require('../../src/models/TokenBlacklist');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

describe('Logout Functionality Tests', () => {
  let testUser, authToken;

  beforeAll(async () => {
    // Connect to a test database
    await mongoose.connect(process.env.TEST_DB_URL || 'mongodb://localhost:27017/barter-vibe-test');
  });

  afterAll(async () => {
    // Clean up and close connection
    await User.deleteMany({});
    await TokenBlacklist.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await User.deleteMany({});
    await TokenBlacklist.deleteMany({});
    
    // Create a test user
    testUser = await User.create({
      email: 'logoutuser@example.com',
      password: 'TestPass123!',
      firstName: 'Logout',
      lastName: 'User',
      isEmailVerified: true,
      isActive: true
    });

    // Login to get a token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'logoutuser@example.com',
        password: 'TestPass123!'
      })
      .expect(200);

    authToken = loginResponse.body.token;
  });

  describe('POST /api/auth/logout', () => {
    it('should successfully logout user and blacklist token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');

      // Verify that the token is blacklisted
      const blacklisted = await TokenBlacklist.findOne({ token: authToken });
      expect(blacklisted).toBeDefined();
      expect(blacklisted.token).toBe(authToken);
      expect(blacklisted.userId.toString()).toBe(testUser._id.toString());
    });

    it('should accept logout request without token', async () => {
      // Even if no token is provided, the logout should succeed
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
    });

    it('should reject access with blacklisted token after logout', async () => {
      // First logout to blacklist the token
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Try to access protected route with blacklisted token
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Token has been invalidated. Please log in again.');
    });

    it('should handle logout with invalid token gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
    });

    it('should handle logout with malformed token header', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'InvalidPrefix token123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
    });
  });

  describe('Session Revocation Related Tests', () => {
    it('should properly update lastLoginAt after subsequent login', async () => {
      // Get initial login time
      const initialResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logoutuser@example.com',
          password: 'TestPass123!'
        })
        .expect(200);

      const initialLoginTime = (await User.findById(testUser._id)).lastLoginAt;

      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${initialResponse.body.token}`)
        .expect(200);

      // Wait a bit and login again
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const subsequentResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logoutuser@example.com',
          password: 'TestPass123!'
        })
        .expect(200);

      const subsequentLoginTime = (await User.findById(testUser._id)).lastLoginAt;
      
      expect(subsequentLoginTime.getTime()).toBeGreaterThan(initialLoginTime.getTime());
    });
  });
});