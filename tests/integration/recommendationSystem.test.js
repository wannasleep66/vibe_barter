// Simple integration test to validate the recommendation system functionality
const request = require('supertest');
const app = require('../../src/server'); // assuming your express app is exported from server.js
const User = require('../../src/models/User');
const Advertisement = require('../../src/models/Advertisement');
const UserPreference = require('../../src/models/UserPreference');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

describe('Recommendation System Integration Tests', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear collections before each test
    await User.deleteMany({});
    await Advertisement.deleteMany({});
    await UserPreference.deleteMany({});
  });

  describe('GET /api/advertisements/recommended', () => {
    test('should return recommended advertisements for authenticated user', async () => {
      // Create a user
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        isEmailVerified: true
      });

      // Create user preferences
      await UserPreference.create({
        userId: user._id,
        preferredCategories: [],
        preferredTypes: ['service'],
        minRating: 3,
        preferenceScoreWeights: {
          categoryMatch: 0.3,
          typeMatch: 0.2,
          tagMatch: 0.2,
          locationMatch: 0.15,
          ratingMatch: 0.15
        }
      });

      // Create a test advertisement
      await Advertisement.create({
        title: 'Test Service',
        description: 'Test service description',
        ownerId: user._id,
        categoryId: new mongoose.Types.ObjectId(),
        type: 'service',
        isActive: true,
        isArchived: false
      });

      // Mock authentication by creating a valid JWT token
      // For this test, we'll skip authentication by directly calling the endpoint
      // In a real scenario, you'd need to authenticate first
      const response = await request(app)
        .get('/api/advertisements/recommended')
        .set('Authorization', `Bearer ${user._id}`) // This is a mock, actual JWT needed
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});