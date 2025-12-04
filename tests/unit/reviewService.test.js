// tests/unit/reviewService.test.js
const ReviewService = require('../../src/services/ReviewService');
const Review = require('../../src/models/Review');
const User = require('../../src/models/User');
const Application = require('../../src/models/Application');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

describe('ReviewService', () => {
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
    await Application.deleteMany({});
  });

  describe('createReview', () => {
    test('should create a new review successfully', async () => {
      const reviewerId = new mongoose.Types.ObjectId();
      const revieweeId = new mongoose.Types.ObjectId();
      
      const userData = {
        _id: revieweeId,
        email: 'reviewee@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith'
      };
      await User.create(userData);

      const reviewData = {
        reviewerId: reviewerId,
        revieweeId: revieweeId,
        rating: 5,
        title: 'Great experience',
        comment: 'Very good service, will work again'
      };

      const review = await ReviewService.createReview(reviewData, reviewerId);

      expect(review).toBeDefined();
      expect(review.rating).toBe(5);
      expect(review.title).toBe('Great experience');
      expect(review.comment).toBe('Very good service, will work again');
      expect(review.reviewerId.toString()).toBe(reviewerId.toString());
      expect(review.revieweeId.toString()).toBe(revieweeId.toString());
    });

    test('should throw error if reviewer tries to review themselves', async () => {
      const userId = new mongoose.Types.ObjectId();
      
      const userData = {
        _id: userId,
        email: 'user@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      };
      await User.create(userData);

      const reviewData = {
        reviewerId: userId,
        revieweeId: userId, // same as reviewer
        rating: 5,
        title: 'Self review',
        comment: 'Testing self review'
      };

      await expect(ReviewService.createReview(reviewData, userId))
        .rejects
        .toThrow('You cannot review yourself');
    });

    test('should throw error if review already exists for the same combination', async () => {
      const reviewerId = new mongoose.Types.ObjectId();
      const revieweeId = new mongoose.Types.ObjectId();
      const applicationId = new mongoose.Types.ObjectId();
      
      // Create users
      await User.create({
        _id: reviewerId,
        email: 'reviewer@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      });
      
      await User.create({
        _id: revieweeId,
        email: 'reviewee@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith'
      });
      
      // Create application
      await Application.create({
        _id: applicationId,
        advertisementId: new mongoose.Types.ObjectId(),
        applicantId: reviewerId,
        ownerId: revieweeId,
        status: 'completed'
      });

      // Create first review
      const reviewData = {
        reviewerId: reviewerId,
        revieweeId: revieweeId,
        applicationId: applicationId,
        rating: 5,
        title: 'Great experience',
        comment: 'Very good service'
      };

      await ReviewService.createReview(reviewData, reviewerId);

      // Try to create another review for the same combination
      await expect(ReviewService.createReview(reviewData, reviewerId))
        .rejects
        .toThrow('You have already reviewed this user for this application');
    });
  });

  describe('getUserReviews', () => {
    test('should return reviews for a specific user', async () => {
      const reviewerId = new mongoose.Types.ObjectId();
      const revieweeId = new mongoose.Types.ObjectId();
      
      // Create users
      await User.create({
        _id: reviewerId,
        email: 'reviewer@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      });
      
      await User.create({
        _id: revieweeId,
        email: 'reviewee@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith'
      });

      // Create a review
      await Review.create({
        reviewerId: reviewerId,
        revieweeId: revieweeId,
        rating: 4,
        title: 'Good experience',
        comment: 'Nice service overall'
      });

      const result = await ReviewService.getUserReviews(revieweeId);

      expect(result).toBeDefined();
      expect(result.reviews).toHaveLength(1);
      expect(result.reviews[0].rating).toBe(4);
      expect(result.averageRating).toBe(4);
    });
  });

  describe('updateReview', () => {
    test('should update a review if user is the reviewer', async () => {
      const reviewerId = new mongoose.Types.ObjectId();
      const revieweeId = new mongoose.Types.ObjectId();
      
      // Create users
      await User.create({
        _id: reviewerId,
        email: 'reviewer@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      });
      
      await User.create({
        _id: revieweeId,
        email: 'reviewee@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith'
      });

      // Create a review
      const review = await Review.create({
        reviewerId: reviewerId,
        revieweeId: revieweeId,
        rating: 3,
        title: 'Average experience',
        comment: 'Could be better'
      });

      const updatedReview = await ReviewService.updateReview(
        review._id,
        reviewerId,
        { rating: 5, title: 'Excellent experience' }
      );

      expect(updatedReview.rating).toBe(5);
      expect(updatedReview.title).toBe('Excellent experience');
    });

    test('should throw error if user is not the reviewer', async () => {
      const reviewerId = new mongoose.Types.ObjectId();
      const revieweeId = new mongoose.Types.ObjectId();
      const otherUserId = new mongoose.Types.ObjectId();
      
      // Create users
      await User.create({
        _id: reviewerId,
        email: 'reviewer@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      });
      
      await User.create({
        _id: revieweeId,
        email: 'reviewee@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith'
      });
      
      await User.create({
        _id: otherUserId,
        email: 'other@example.com',
        password: 'password123',
        firstName: 'Other',
        lastName: 'User'
      });

      // Create a review
      const review = await Review.create({
        reviewerId: reviewerId,
        revieweeId: revieweeId,
        rating: 3,
        title: 'Average experience',
        comment: 'Could be better'
      });

      await expect(ReviewService.updateReview(review._id, otherUserId, { rating: 5 }))
        .rejects
        .toThrow('Review not found or you are not the reviewer');
    });
  });

  describe('deleteReview', () => {
    test('should delete a review if user is the reviewer', async () => {
      const reviewerId = new mongoose.Types.ObjectId();
      const revieweeId = new mongoose.Types.ObjectId();
      
      // Create users
      await User.create({
        _id: reviewerId,
        email: 'reviewer@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      });
      
      await User.create({
        _id: revieweeId,
        email: 'reviewee@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith'
      });

      // Create a review
      const review = await Review.create({
        reviewerId: reviewerId,
        revieweeId: revieweeId,
        rating: 4,
        title: 'Good experience',
        comment: 'Nice service'
      });

      // Verify review exists
      let existingReview = await Review.findById(review._id);
      expect(existingReview).not.toBeNull();

      // Delete the review
      const result = await ReviewService.deleteReview(review._id, reviewerId);
      expect(result).toBe(true);

      // Verify review is deleted
      existingReview = await Review.findById(review._id);
      expect(existingReview).toBeNull();
    });
  });

  describe('canReview', () => {
    test('should return true if user can review another user for an application', async () => {
      const applicantId = new mongoose.Types.ObjectId();
      const ownerId = new mongoose.Types.ObjectId();
      const applicationId = new mongoose.Types.ObjectId();
      
      // Create users
      await User.create({
        _id: applicantId,
        email: 'applicant@example.com',
        password: 'password123',
        firstName: 'Applicant',
        lastName: 'User'
      });
      
      await User.create({
        _id: ownerId,
        email: 'owner@example.com',
        password: 'password123',
        firstName: 'Owner',
        lastName: 'User'
      });

      // Create application
      await Application.create({
        _id: applicationId,
        advertisementId: new mongoose.Types.ObjectId(),
        applicantId: applicantId,
        ownerId: ownerId,
        status: 'completed'
      });

      // Applicant should be able to review owner
      const canReview = await ReviewService.canReview(applicantId, ownerId, applicationId);
      expect(canReview).toBe(true);
    });

    test('should return false if user tries to review themselves', async () => {
      const userId = new mongoose.Types.ObjectId();
      const applicationId = new mongoose.Types.ObjectId();
      
      // Create user
      await User.create({
        _id: userId,
        email: 'user@example.com',
        password: 'password123',
        firstName: 'User',
        lastName: 'Person'
      });

      // Create application
      await Application.create({
        _id: applicationId,
        advertisementId: new mongoose.Types.ObjectId(),
        applicantId: userId,
        ownerId: userId,
        status: 'completed'
      });

      // User should not be able to review themselves
      const canReview = await ReviewService.canReview(userId, userId, applicationId);
      expect(canReview).toBe(false);
    });
  });
});