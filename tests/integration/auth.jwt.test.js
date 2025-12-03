// tests/integration/auth.jwt.test.js
const request = require('supertest');
const app = require('../../src/server');
const User = require('../../src/models/User');
const TokenBlacklist = require('../../src/models/TokenBlacklist');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

describe('JWT Token Authentication Tests', () => {
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
      email: 'jwtuser@example.com',
      password: 'TestPass123!',
      firstName: 'JWT',
      lastName: 'User',
      isEmailVerified: true,
      isActive: true
    });

    // Login to get a token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'jwtuser@example.com',
        password: 'TestPass123!'
      })
      .expect(200);

    authToken = loginResponse.body.token;
  });

  describe('Protected Routes', () => {
    it('should allow access to protected routes with valid JWT', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(testUser.email);
    });

    it('should deny access to protected routes without JWT', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('You are not logged in! Please log in to get access.');
    });

    it('should deny access to protected routes with invalid JWT', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid token. Please log in again.');
    });

    it('should deny access to protected routes with malformed JWT', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer malformed')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid token. Please log in again.');
    });
  });

  describe('Token Blacklisting', () => {
    it('should blacklist token on logout', async () => {
      // Logout to blacklist the token
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);
      expect(logoutResponse.body.message).toBe('Logged out successfully');

      // Verify the token is now blacklisted
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);

      // Check if token exists in blacklist collection
      const blacklistedToken = await TokenBlacklist.findOne({ token: authToken });
      expect(blacklistedToken).toBeDefined();
    });

    it('should deny access with blacklisted token', async () => {
      // First blacklist a token
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Try to use the blacklisted token
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Token has been invalidated. Please log in again.');
    });
  });

  describe('Token Expiration', () => {
    it('should deny access with expired JWT', async () => {
      // Create an expired token manually
      const expiredToken = jwt.sign(
        { id: testUser._id },
        process.env.JWT_SECRET,
        { expiresIn: '1ms' } // Expire in 1 millisecond
      );

      // Wait a moment for the token to expire
      await new Promise(resolve => setTimeout(resolve, 5));

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Token has expired. Please log in again.');
    });
  });

  describe('Password Change Token Invalidations', () => {
    it('should deny access after password change', async () => {
      // Get the original token's issued time
      const decoded = jwt.decode(authToken, { complete: true });
      const originalIssuedAt = decoded.payload.iat;

      // Wait a moment before password change to ensure passwordChangedAt is after token issuance
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Change the user's password
      testUser.password = 'NewPassword123!';
      await testUser.save();

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User recently changed password! Please log in again.');
    });
  });

  describe('Refresh Token Functionality', () => {
    it('should generate new access token with valid refresh token', async () => {
      // Login to get both access and refresh tokens
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'jwtuser@example.com',
          password: 'TestPass123!'
        })
        .expect(200);

      const refreshToken = loginResponse.body.refreshToken;
      expect(refreshToken).toBeDefined();

      // Use refresh token to get new access token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken })
        .expect(200);

      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.body.token).toBeDefined();
      expect(refreshResponse.body.token).not.toBe(loginResponse.body.token);
    });

    it('should deny refresh with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalidRefreshToken' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid refresh token');
    });

    it('should deny refresh without refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Refresh token is required');
    });
  });

  describe('Blacklisted Token Cleanup', () => {
    it('should handle expired blacklisted tokens gracefully', async () => {
      // Create an expired blacklisted token manually
      await TokenBlacklist.create({
        token: 'expiredToken',
        userId: testUser._id,
        type: 'access',
        expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
      });

      // Should be handled gracefully by the system
      const result = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(result.body.success).toBe(true);
    });
  });
});