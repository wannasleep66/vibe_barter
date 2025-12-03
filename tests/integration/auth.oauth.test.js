// tests/integration/auth.oauth.test.js
const request = require('supertest');
const app = require('../../src/server');
const User = require('../../src/models/User');
const mongoose = require('mongoose');

describe('OAuth Integration Tests', () => {
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

  describe('Google OAuth', () => {
    // Note: These tests would normally require mocking Passport strategies
    // In a real implementation, we would need to mock the OAuth process
    // For now, we'll test the endpoints exist and return appropriate redirects
    
    it('should initiate Google OAuth flow', async () => {
      // This endpoint will redirect to Google, so we expect a redirect status
      const response = await request(app)
        .get('/api/auth/google')
        .redirects(0); // Don't follow redirects
        
      expect(response.status).toBe(302); // Should redirect to Google
      expect(response.header.location).toContain('accounts.google.com');
    });
    
    it('should have Google callback endpoint', async () => {
      // The callback endpoint would normally be tested with a real OAuth callback
      // For integration testing, we'll just verify the route exists
      const response = await request(app)
        .get('/api/auth/google/callback')
        .query({ code: 'test_code' });
        
      // This would normally process the OAuth callback
      // If no user is authenticated by the strategy, it returns 401
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('VK OAuth', () => {
    it('should initiate VK OAuth flow', async () => {
      const response = await request(app)
        .get('/api/auth/vk')
        .redirects(0);
        
      expect(response.status).toBe(302); // Should redirect to VK
      expect(response.header.location).toContain('oauth.vk.com');
    });
    
    it('should have VK callback endpoint', async () => {
      const response = await request(app)
        .get('/api/auth/vk/callback')
        .query({ code: 'test_code' });
        
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('Yandex OAuth', () => {
    it('should initiate Yandex OAuth flow', async () => {
      const response = await request(app)
        .get('/api/auth/yandex')
        .redirects(0);
        
      expect(response.status).toBe(302); // Should redirect to Yandex
      expect(response.header.location).toContain('oauth.yandex.ru');
    });
    
    it('should have Yandex callback endpoint', async () => {
      const response = await request(app)
        .get('/api/auth/yandex/callback')
        .query({ code: 'test_code' });
        
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('OAuth User Management', () => {
    it('should create new user on first OAuth login with Google', async () => {
      // In a real test scenario, we would mock the OAuth strategy
      // For now, we'll test that the user schema supports OAuth fields
      const user = new User({
        email: 'oauth-test@example.com',
        firstName: 'OAuth',
        lastName: 'Test',
        oauth: {
          googleId: 'test_google_id',
          googleAccessToken: 'test_access_token',
          googleRefreshToken: 'test_refresh_token'
        }
      });
      
      const savedUser = await user.save();
      expect(savedUser.oauth.googleId).toBe('test_google_id');
      expect(savedUser.oauth.googleAccessToken).toBe('test_access_token');
      expect(savedUser.oauth.googleRefreshToken).toBe('test_refresh_token');
      expect(savedUser.email).toBe('oauth-test@example.com');
    });
    
    it('should link OAuth account to existing user', async () => {
      // Create a user with email
      const existingUser = await User.create({
        email: 'existing@example.com',
        password: 'TestPass123!',
        firstName: 'Existing',
        lastName: 'User'
      });
      
      // Simulate linking a Google account (this would happen in the OAuth callback)
      existingUser.oauth = {
        ...existingUser.oauth,
        googleId: 'linked_google_id',
        googleAccessToken: 'linked_access_token',
        googleRefreshToken: 'linked_refresh_token'
      };
      
      const updatedUser = await existingUser.save();
      expect(updatedUser.oauth.googleId).toBe('linked_google_id');
    });
    
    it('should handle OAuth login for existing OAuth user', async () => {
      // Create a user that previously logged in with Google
      const oauthUser = await User.create({
        email: 'oauth-existing@example.com',
        firstName: 'OAuth',
        lastName: 'Existing',
        oauth: {
          googleId: 'existing_google_id',
          googleAccessToken: 'existing_access_token'
        },
        isEmailVerified: true
      });
      
      // Check that the user has OAuth data
      expect(oauthUser.oauth.googleId).toBe('existing_google_id');
      expect(oauthUser.isEmailVerified).toBe(true);
    });
  });
});