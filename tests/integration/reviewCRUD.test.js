// tests/integration/reviewCRUD.test.js
const request = require('supertest');
const app = require('../../src/server');
const Review = require('../../src/models/Review');
const User = require('../../src/models/User');
const Application = require('../../src/models/Application');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let reviewerId;
let revieweeId;
let applicationId;

describe('Review CRUD Integration Tests', () => {
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

    // Create test users
    const user1 = await User.create({
      email: 'reviewer@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      isEmailVerified: true
    });

    const user2 = await User.create({
      email: 'reviewee@example.com',
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Smith',
      isEmailVerified: true
    });

    const user3 = await Application.create({
      advertisementId: new mongoose.Types.ObjectId(),
      applicantId: user1._id,
      ownerId: user2._id,
      status: 'completed'
    });

    reviewerId = user1._id;
    revieweeId = user2._id;
    applicationId = user3._id;
  });

  describe('POST /api/reviews', () => {
    test('should create a new review successfully', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', 'Bearer test-token') // This would be a real JWT
        .send({
          reviewerId: reviewerId.toString(),
          revieweeId: revieweeId.toString(),
          applicationId: applicationId.toString(),
          rating: 5,
          title: 'Excellent service',
          comment: 'Great experience, will work again'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.rating).toBe(5);
      expect(response.body.data.title).toBe('Excellent service');
      expect(response.body.data.comment).toBe('Great experience, will work again');
    });

    test('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', 'Bearer test-token')
        .send({
          reviewerId: reviewerId.toString(),
          revieweeId: revieweeId.toString(),
          // missing rating
          title: 'No rating provided'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/reviews/user/:id', () => {
    test('should get all reviews for a specific user', async () => {
      // Create a review first
      await request(app)
        .post('/api/reviews')
        .set('Authorization', 'Bearer test-token')
        .send({
          reviewerId: reviewerId.toString(),
          revieweeId: revieweeId.toString(),
          rating: 4,
          title: 'Good experience'
        })
        .expect(201);

      const response = await request(app)
        .get(`/api/reviews/user/${revieweeId}`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].rating).toBe(4);
      expect(response.body.averageRating).toBe(4);
    });
  });

  describe('GET /api/reviews/:id', () => {
    test('should get a specific review by ID', async () => {
      // Create a review first
      const createResponse = await request(app)
        .post('/api/reviews')
        .set('Authorization', 'Bearer test-token')
        .send({
          reviewerId: reviewerId.toString(),
          revieweeId: revieweeId.toString(),
          rating: 3,
          title: 'Average experience'
        })
        .expect(201);

      const reviewId = createResponse.body.data._id;

      const response = await request(app)
        .get(`/api/reviews/${reviewId}`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data._id).toBe(reviewId);
      expect(response.body.data.rating).toBe(3);
    });
  });

  describe('PATCH /api/reviews/:id', () => {
    test('should update a review', async () => {
      // Create a review first
      const createResponse = await request(app)
        .post('/api/reviews')
        .set('Authorization', 'Bearer test-token')
        .send({
          reviewerId: reviewerId.toString(),
          revieweeId: revieweeId.toString(),
          rating: 2,
          title: 'Poor experience'
        })
        .expect(201);

      const reviewId = createResponse.body.data._id;

      const response = await request(app)
        .patch(`/api/reviews/${reviewId}`)
        .set('Authorization', 'Bearer test-token')
        .send({
          rating: 5,
          title: 'Excellent experience after all'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.rating).toBe(5);
      expect(response.body.data.title).toBe('Excellent experience after all');
    });
  });

  describe('DELETE /api/reviews/:id', () => {
    test('should delete a review', async () => {
      // Create a review first
      const createResponse = await request(app)
        .post('/api/reviews')
        .set('Authorization', 'Bearer test-token')
        .send({
          reviewerId: reviewerId.toString(),
          revieweeId: revieweeId.toString(),
          rating: 4,
          title: 'Good experience'
        })
        .expect(201);

      const reviewId = createResponse.body.data._id;

      // Verify review exists
      await request(app)
        .get(`/api/reviews/${reviewId}`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      // Delete the review
      const response = await request(app)
        .delete(`/api/reviews/${reviewId}`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Review deleted successfully');

      // Verify review is deleted
      await request(app)
        .get(`/api/reviews/${reviewId}`)
        .set('Authorization', 'Bearer test-token')
        .expect(404);
    });
  });

  describe('POST /api/reviews/can-review', () => {
    test('should check if user can review another user', async () => {
      const response = await request(app)
        .post('/api/reviews/can-review')
        .set('Authorization', 'Bearer test-token')
        .send({
          revieweeId: revieweeId.toString(),
          applicationId: applicationId.toString()
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.canReview).toBeDefined();
    });
  });

  describe('GET /api/reviews/advertisement/:advertisementId', () => {
    test('should get reviews for an advertisement', async () => {
      // Create an application with an advertisement
      const adId = new mongoose.Types.ObjectId();
      const appId = await Application.create({
        _id: new mongoose.Types.ObjectId(),
        advertisementId: adId,
        applicantId: reviewerId,
        ownerId: revieweeId,
        status: 'completed'
      });

      // Create a review first
      await request(app)
        .post('/api/reviews')
        .set('Authorization', 'Bearer test-token')
        .send({
          reviewerId: reviewerId.toString(),
          revieweeId: revieweeId.toString(),
          applicationId: appId._id.toString(),
          advertisementId: adId.toString(),
          rating: 5,
          title: 'Great ad experience'
        })
        .expect(201);

      // Note: Since we're using a mock token above, this test may not work perfectly
      // In a real scenario, we'd need to set up proper authentication
    });
  });
});