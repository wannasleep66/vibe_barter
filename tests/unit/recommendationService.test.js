// Comprehensive test for the recommendation service
const RecommendationService = require('../../src/services/RecommendationService');
const UserPreference = require('../../src/models/UserPreference');
const Advertisement = require('../../src/models/Advertisement');
const InteractionHistory = require('../../src/models/InteractionHistory');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

describe('RecommendationService', () => {
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
    await UserPreference.deleteMany({});
    await Advertisement.deleteMany({});
    await InteractionHistory.deleteMany({});
  });

  describe('getRecommendedAdvertisements', () => {
    test('should return general recommendations when no user preferences exist', async () => {
      const userId = new mongoose.Types.ObjectId();
      const result = await RecommendationService.getRecommendedAdvertisements(userId);
      
      expect(result).toHaveProperty('advertisements');
      expect(result).toHaveProperty('pagination');
      expect(Array.isArray(result.advertisements)).toBe(true);
    });

    test('should return personalized recommendations when user preferences exist', async () => {
      const userId = new mongoose.Types.ObjectId();
      
      // Create user preferences
      await UserPreference.create({
        userId: userId,
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

      const result = await RecommendationService.getRecommendedAdvertisements(userId);
      
      expect(result).toHaveProperty('advertisements');
      expect(result).toHaveProperty('pagination');
    });
  });

  describe('calculateRelevanceScores', () => {
    test('should calculate relevance scores for advertisements', async () => {
      const userId = new mongoose.Types.ObjectId();
      const mockAdvertisements = [{
        _id: new mongoose.Types.ObjectId(),
        title: 'Test Ad',
        type: 'service',
        rating: { average: 4.5 },
        views: 10,
        createdAt: new Date(),
        ownerId: userId,
        categoryId: { _id: new mongoose.Types.ObjectId() },
        tags: []
      }];
      
      const mockPreferences = {
        preferredTypes: ['service'],
        preferenceScoreWeights: {
          categoryMatch: 0.3,
          typeMatch: 0.2,
          tagMatch: 0.2,
          locationMatch: 0.15,
          ratingMatch: 0.15
        }
      };

      const result = await RecommendationService.calculateRelevanceScores(
        mockAdvertisements,
        mockPreferences,
        userId
      );
      
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('relevanceScore');
      expect(typeof result[0].relevanceScore).toBe('number');
      expect(result[0].relevanceScore).toBeGreaterThanOrEqual(0);
      expect(result[0].relevanceScore).toBeLessThanOrEqual(1);
    });
  });

  describe('recordUserInteraction', () => {
    test('should record user interaction successfully', async () => {
      const userId = new mongoose.Types.ObjectId();
      const advertisementId = new mongoose.Types.ObjectId();
      
      const interaction = await RecommendationService.recordUserInteraction(
        userId,
        advertisementId,
        'view'
      );

      expect(interaction).toHaveProperty('userId', userId);
      expect(interaction).toHaveProperty('advertisementId', advertisementId);
      expect(interaction).toHaveProperty('type', 'view');
    });
  });

  describe('getUserInteractionHistory', () => {
    test('should get user interaction history', async () => {
      const userId = new mongoose.Types.ObjectId();
      const advertisementId = new mongoose.Types.ObjectId();
      
      // Create an interaction first
      await RecommendationService.recordUserInteraction(userId, advertisementId, 'view');
      
      const history = await RecommendationService.getUserInteractionHistory(userId);
      
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('clearUserCache', () => {
    test('should clear user cache without error', () => {
      const userId = new mongoose.Types.ObjectId();
      expect(() => {
        RecommendationService.clearUserCache(userId);
      }).not.toThrow();
    });
  });
});