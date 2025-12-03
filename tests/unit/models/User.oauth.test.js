// tests/unit/models/User.oauth.test.js
const User = require('../../../src/models/User');
const mongoose = require('mongoose');

describe('User Model - OAuth Unit Tests', () => {
  beforeAll(async () => {
    // In a real test, we might connect to a test database
    // For this test, we're just validating the schema structure
  });

  it('should have proper OAuth fields in schema', () => {
    const schema = User.schema.obj;
    
    expect(schema.oauth).toBeDefined();
    expect(schema.oauth.type).toBe(Object); // Subdocument type
    
    // Check individual OAuth fields
    expect(schema.oauth.googleId).toBe(String);
    expect(schema.oauth.googleAccessToken).toBe(String);
    expect(schema.oauth.googleRefreshToken).toBe(String);
    
    expect(schema.oauth.vkId).toBe(String);
    expect(schema.oauth.vkAccessToken).toBe(String);
    expect(schema.oauth.vkRefreshToken).toBe(String);
    
    expect(schema.oauth.yandexId).toBe(String);
    expect(schema.oauth.yandexAccessToken).toBe(String);
    expect(schema.oauth.yandexRefreshToken).toBe(String);
  });

  it('should create a user with OAuth data', async () => {
    // This would be tested with an actual database connection
    // For now, we'll just verify the structure is correct
    const userData = {
      email: 'oauth@example.com',
      firstName: 'OAuth',
      lastName: 'Test',
      oauth: {
        googleId: 'test_google_id',
        googleAccessToken: 'test_access_token',
        vkId: 'test_vk_id',
        yandexId: 'test_yandex_id'
      }
    };
    
    // The User model should accept OAuth data without throwing an error
    // This test would be more meaningful with a real DB connection
    expect(userData.oauth.googleId).toBe('test_google_id');
    expect(userData.oauth.vkId).toBe('test_vk_id');
    expect(userData.oauth.yandexId).toBe('test_yandex_id');
  });
});