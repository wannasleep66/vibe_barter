// tests/unit/ratingCalculation.test.js
const ReviewService = require('../../src/services/ReviewService');
const Review = require('../../src/models/Review');
const User = require('../../src/models/User');
const Advertisement = require('../../src/models/Advertisement');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

describe('Rating Calculation Tests', () => {
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
    await Review.deleteMany({});
    await User.deleteMany({});
    await Advertisement.deleteMany({});
  });

  describe('updateAdvertisementRating', () => {
    test('should calculate correct average rating from advertisement-specific reviews', async () => {
      const ownerId = new mongoose.Types.ObjectId();
      const advertisementId = new mongoose.Types.ObjectId();
      
      // Create user and advertisement
      await User.create({
        _id: ownerId,
        email: 'owner@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      });
      
      const advertisement = await Advertisement.create({
        _id: advertisementId,
        title: 'Test Advertisement',
        description: 'Test description',
        ownerId: ownerId,
        categoryId: new mongoose.Types.ObjectId(),
        type: 'service',
        isActive: true
      });

      // Create reviews for this advertisement
      await Review.create({
        reviewerId: new mongoose.Types.ObjectId(),
        revieweeId: ownerId,
        advertisementId: advertisementId,
        rating: 5,
        title: 'Great service!'
      });

      await Review.create({
        reviewerId: new mongoose.Types.ObjectId(),
        revieweeId: ownerId,
        advertisementId: advertisementId,
        rating: 4,
        title: 'Good service'
      });

      await Review.create({
        reviewerId: new mongoose.Types.ObjectId(),
        revieweeId: ownerId,
        advertisementId: advertisementId,
        rating: 3,
        title: 'Average service'
      });

      // Update the advertisement rating
      const updatedAd = await ReviewService.updateAdvertisementRating(advertisementId);

      // Calculate expected average: (5 + 4 + 3) / 3 = 4.0
      expect(updatedAd.rating.average).toBe(4.0);
      expect(updatedAd.rating.count).toBe(3);
    });

    test('should handle single review correctly', async () => {
      const ownerId = new mongoose.Types.ObjectId();
      const advertisementId = new mongoose.Types.ObjectId();
      
      // Create user and advertisement
      await User.create({
        _id: ownerId,
        email: 'owner@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      });
      
      const advertisement = await Advertisement.create({
        _id: advertisementId,
        title: 'Test Advertisement',
        description: 'Test description',
        ownerId: ownerId,
        categoryId: new mongoose.Types.ObjectId(),
        type: 'service',
        isActive: true
      });

      // Create one review for this advertisement
      await Review.create({
        reviewerId: new mongoose.Types.ObjectId(),
        revieweeId: ownerId,
        advertisementId: advertisementId,
        rating: 5,
        title: 'Excellent service!'
      });

      // Update the advertisement rating
      const updatedAd = await ReviewService.updateAdvertisementRating(advertisementId);

      expect(updatedAd.rating.average).toBe(5.0);
      expect(updatedAd.rating.count).toBe(1);
    });

    test('should handle no reviews case', async () => {
      const ownerId = new mongoose.Types.ObjectId();
      const advertisementId = new mongoose.Types.ObjectId();
      
      // Create user and advertisement
      await User.create({
        _id: ownerId,
        email: 'owner@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      });
      
      const advertisement = await Advertisement.create({
        _id: advertisementId,
        title: 'Test Advertisement',
        description: 'Test description',
        ownerId: ownerId,
        categoryId: new mongoose.Types.ObjectId(),
        type: 'service',
        isActive: true
      });

      // Update the advertisement rating when no reviews exist
      const updatedAd = await ReviewService.updateAdvertisementRating(advertisementId);

      expect(updatedAd.rating.average).toBe(0);
      expect(updatedAd.rating.count).toBe(0);
    });

    test('should handle reviews from different advertisements separately', async () => {
      const ownerId = new mongoose.Types.ObjectId();
      const adId1 = new mongoose.Types.ObjectId();
      const adId2 = new mongoose.Types.ObjectId();
      
      // Create user and advertisements
      await User.create({
        _id: ownerId,
        email: 'owner@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      });
      
      const ad1 = await Advertisement.create({
        _id: adId1,
        title: 'Ad 1',
        description: 'Description 1',
        ownerId: ownerId,
        categoryId: new mongoose.Types.ObjectId(),
        type: 'service',
        isActive: true
      });

      const ad2 = await Advertisement.create({
        _id: adId2,
        title: 'Ad 2',
        description: 'Description 2',
        ownerId: ownerId,
        categoryId: new mongoose.Types.ObjectId(),
        type: 'service',
        isActive: true
      });

      // Create reviews for the first advertisement
      await Review.create({
        reviewerId: new mongoose.Types.ObjectId(),
        revieweeId: ownerId,
        advertisementId: adId1,
        rating: 5
      });

      await Review.create({
        reviewerId: new mongoose.Types.ObjectId(),
        revieweeId: ownerId,
        advertisementId: adId1,
        rating: 3
      });

      // Create reviews for the second advertisement
      await Review.create({
        reviewerId: new mongoose.Types.ObjectId(),
        revieweeId: ownerId,
        advertisementId: adId2,
        rating: 4
      });

      await Review.create({
        reviewerId: new mongoose.Types.ObjectId(),
        revieweeId: ownerId,
        advertisementId: adId2,
        rating: 2
      });

      // Update ratings for both advertisements
      const updatedAd1 = await ReviewService.updateAdvertisementRating(adId1);
      const updatedAd2 = await ReviewService.updateAdvertisementRating(adId2);

      // Ad1: (5 + 3) / 2 = 4.0
      expect(updatedAd1.rating.average).toBe(4.0);
      expect(updatedAd1.rating.count).toBe(2);

      // Ad2: (4 + 2) / 2 = 3.0
      expect(updatedAd2.rating.average).toBe(3.0);
      expect(updatedAd2.rating.count).toBe(2);
    });
  });

  describe('getAdvertisementRatingInfo', () => {
    test('should return correct rating information with distribution', async () => {
      const ownerId = new mongoose.Types.ObjectId();
      const advertisementId = new mongoose.Types.ObjectId();
      
      // Create user and advertisement
      await User.create({
        _id: ownerId,
        email: 'owner@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      });
      
      await Advertisement.create({
        _id: advertisementId,
        title: 'Test Advertisement',
        description: 'Test description',
        ownerId: ownerId,
        categoryId: new mongoose.Types.ObjectId(),
        type: 'service',
        isActive: true
      });

      // Create reviews with different ratings for distribution
      await Review.create([
        {
          reviewerId: new mongoose.Types.ObjectId(),
          revieweeId: ownerId,
          advertisementId: advertisementId,
          rating: 5
        },
        {
          reviewerId: new mongoose.Types.ObjectId(),
          revieweeId: ownerId,
          advertisementId: advertisementId,
          rating: 5
        },
        {
          reviewerId: new mongoose.Types.ObjectId(),
          revieweeId: ownerId,
          advertisementId: advertisementId,
          rating: 4
        },
        {
          reviewerId: new mongoose.Types.ObjectId(),
          revieweeId: ownerId,
          advertisementId: advertisementId,
          rating: 3
        },
        {
          reviewerId: new mongoose.Types.ObjectId(),
          revieweeId: ownerId,
          advertisementId: advertisementId,
          rating: 1
        }
      ]);

      const ratingInfo = await ReviewService.getAdvertisementRatingInfo(advertisementId);

      // Expected average: (5 + 5 + 4 + 3 + 1) / 5 = 18 / 5 = 3.6
      expect(ratingInfo.average).toBe(3.6);
      expect(ratingInfo.count).toBe(5);
      expect(ratingInfo.distribution).toEqual({
        1: 1, // one 1-star review
        2: 0, // no 2-star reviews
        3: 1, // one 3-star review
        4: 1, // one 4-star review
        5: 2  // two 5-star reviews
      });
    });
  });
});