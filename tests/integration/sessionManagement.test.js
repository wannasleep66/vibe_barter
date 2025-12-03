// tests/integration/sessionManagement.test.js
const request = require('supertest');
const app = require('../../src/server');
const User = require('../../src/models/User');
const TokenBlacklist = require('../../src/models/TokenBlacklist');
const mongoose = require('mongoose');

describe('Session Management Integration Tests', () => {
  let testUser, adminUser, userAuthToken, adminAuthToken;

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
    
    // Create a regular user
    testUser = await User.create({
      email: 'sessionuser@example.com',
      password: 'TestPass123!',
      firstName: 'Session',
      lastName: 'User',
      isEmailVerified: true,
      isActive: true
    });

    // Create an admin user
    adminUser = await User.create({
      email: 'admin@example.com',
      password: 'AdminPass123!',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isEmailVerified: true,
      isActive: true
    });

    // Get auth tokens for both users
    const userLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'sessionuser@example.com',
        password: 'TestPass123!'
      })
      .expect(200);
    
    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'AdminPass123!'
      })
      .expect(200);

    userAuthToken = userLoginResponse.body.token;
    adminAuthToken = adminLoginResponse.body.token;
  });

  describe('User Session Management', () => {
    it('should allow user to get their own session information', async () => {
      const response = await request(app)
        .get('/api/sessions/my-sessions')
        .set('Authorization', `Bearer ${userAuthToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.userId).toBe(testUser._id.toString());
    });

    it('should allow user to revoke all other sessions', async () => {
      const response = await request(app)
        .delete('/api/sessions/revoke-current')
        .set('Authorization', `Bearer ${userAuthToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Other sessions have been revoked');
    });

    it('should allow user to revoke a specific token', async () => {
      // First create a new token by logging in again
      const newLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'sessionuser@example.com',
          password: 'TestPass123!'
        })
        .expect(200);

      // Attempt to revoke the original token using the new token
      const response = await request(app)
        .post('/api/sessions/revoke-token')
        .set('Authorization', `Bearer ${newLoginResponse.body.token}`)
        .send({
          token: userAuthToken
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Token has been revoked');
    });

    it('should prevent user from accessing other users sessions', async () => {
      const response = await request(app)
        .get(`/api/sessions/users/${adminUser._id}/sessions`)
        .set('Authorization', `Bearer ${userAuthToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('permission');
    });
  });

  describe('Admin Session Management', () => {
    it('should allow admin to view any user\'s session information', async () => {
      const response = await request(app)
        .get(`/api/sessions/users/${testUser._id}/sessions`)
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.userId).toBe(testUser._id.toString());
    });

    it('should allow admin to revoke all sessions for a user', async () => {
      const response = await request(app)
        .delete(`/api/sessions/users/${testUser._id}/all-sessions`)
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('All user sessions have been revoked');
    });

    it('should allow admin to force password change for a user', async () => {
      const response = await request(app)
        .patch(`/api/sessions/users/${testUser._id}/force-password-change`)
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Password change has been enforced');
    });

    it('should prevent non-admin from accessing admin session management endpoints', async () => {
      const response = await request(app)
        .get(`/api/sessions/users/${adminUser._id}/sessions`)
        .set('Authorization', `Bearer ${userAuthToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('permission');
    });
  });

  describe('Security Tests', () => {
    it('should reject unauthorized access to session endpoints', async () => {
      const response = await request(app)
        .get('/api/sessions/my-sessions')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('You are not logged in! Please log in to get access.');
    });

    it('should handle invalid tokens appropriately', async () => {
      const response = await request(app)
        .get('/api/sessions/my-sessions')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid token');
    });

    it('should not allow user to manipulate other users sessions', async () => {
      // Attempt to revoke another user's sessions using regular user token
      const response = await request(app)
        .delete(`/api/sessions/users/${adminUser._id}/all-sessions`)
        .set('Authorization', `Bearer ${userAuthToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('permission');
    });
  });

  describe('Token Blacklisting Tests', () => {
    it('should properly blacklist revoked tokens', async () => {
      // Revoke the user's token
      await request(app)
        .post('/api/sessions/revoke-token')
        .set('Authorization', `Bearer ${userAuthToken}`)
        .send({
          tokenId: userAuthToken
        })
        .expect(200);

      // Verify the token is blacklisted by trying to use it
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userAuthToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Token has been invalidated');
    });

    it('should handle attempts to revoke already revoked tokens', async () => {
      // Revoke a token first time
      await request(app)
        .post('/api/sessions/revoke-token')
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .send({
          tokenId: userAuthToken
        })
        .expect(200);

      // Try to revoke the same token again - should be handled gracefully
      const response = await request(app)
        .post('/api/sessions/revoke-token')
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .send({
          tokenId: userAuthToken
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Token is already revoked');
    });
  });
});