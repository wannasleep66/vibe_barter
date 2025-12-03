// tests/integration/auth.emailVerification.test.js
const request = require('supertest');
const app = require('../../src/server');
const User = require('../../src/models/User');
const mongoose = require('mongoose');
const crypto = require('crypto');

describe('Email Verification Integration Tests', () => {
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

  describe('Registration with Email Verification', () => {
    it('should register user and send verification email', async () => {
      const userData = {
        email: 'verify@example.com',
        password: 'TestPass123!',
        firstName: 'Verify',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('_id');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.isEmailVerified).toBe(false);

      // Check that the user was created with verification token
      const user = await User.findOne({ email: userData.email });
      expect(user).not.toBeNull();
      expect(user.isEmailVerified).toBe(false);
      expect(user.emailVerificationToken).toBeDefined();
      expect(user.emailVerificationExpires).toBeDefined();
    });

    it('should not allow registering with duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'TestPass123!',
        firstName: 'Duplicate',
        lastName: 'User'
      };

      // First registration should succeed
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Second registration should fail
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('Request Verification Email', () => {
    it('should send verification email for unverified user', async () => {
      // Create an unverified user first
      const user = await User.create({
        email: 'requestverify@example.com',
        password: 'TestPass123!',
        firstName: 'Request',
        lastName: 'Verify'
      });

      // Generate verification token for the user
      const verificationToken = user.createEmailVerificationToken();
      await user.save({ validateBeforeSave: false });

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ email: 'requestverify@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Verification email sent successfully');

      // Check that the token was updated
      const updatedUser = await User.findOne({ email: 'requestverify@example.com' });
      expect(updatedUser.emailVerificationToken).toBeDefined();
    });

    it('should fail for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ email: 'nonexistent@example.com' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No user found with this email address');
    });

    it('should fail for already verified user', async () => {
      await User.create({
        email: 'alreadyverified@example.com',
        password: 'TestPass123!',
        firstName: 'Already',
        lastName: 'Verified',
        isEmailVerified: true
      });

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ email: 'alreadyverified@example.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email is already verified');
    });

    it('should fail with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation error');
    });
  });

  describe('Verify Email with Token', () => {
    it('should verify email with valid token', async () => {
      // Create a user with verification token
      const user = await User.create({
        email: 'verifytoken@example.com',
        password: 'TestPass123!',
        firstName: 'Verify',
        lastName: 'Token'
      });

      // Generate verification token
      const verificationToken = user.createEmailVerificationToken();
      await user.save({ validateBeforeSave: false });

      const response = await request(app)
        .get(`/api/auth/verify-email/${verificationToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Email verified successfully');

      // Check that user is now verified in the database
      const updatedUser = await User.findOne({ email: 'verifytoken@example.com' });
      expect(updatedUser.isEmailVerified).toBe(true);
      expect(updatedUser.emailVerificationToken).toBeUndefined();
      expect(updatedUser.emailVerificationExpires).toBeUndefined();
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify-email/invalidtoken1234567890123456789012345678901234567890')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid verification token format');
    });

    it('should fail with expired token', async () => {
      // Create a user with an expired verification token
      const user = await User.create({
        email: 'expiredtoken@example.com',
        password: 'TestPass123!',
        firstName: 'Expired',
        lastName: 'Token'
      });

      // Generate a token that expires in the past
      const verificationToken = crypto.randomBytes(32).toString('hex');
      user.emailVerificationToken = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');
      user.emailVerificationExpires = Date.now() - 1; // Expired in the past
      await user.save({ validateBeforeSave: false });

      const response = await request(app)
        .get(`/api/auth/verify-email/${verificationToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Token is invalid or has expired');

      // Check that user is still not verified
      const updatedUser = await User.findOne({ email: 'expiredtoken@example.com' });
      expect(updatedUser.isEmailVerified).toBe(false);
    });

    it('should fail with non-existent token', async () => {
      // Use a valid format token but one that doesn't exist in the DB
      const fakeToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(fakeToken).digest('hex');

      // Make sure this exact hash isn't in the DB
      // (which it shouldn't be since it's randomly generated)
      const response = await request(app)
        .get(`/api/auth/verify-email/${fakeToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Token is invalid or has expired');
    });
  });

  describe('Email Verification Security', () => {
    it('should prevent token reuse', async () => {
      // Create a user with verification token
      const user = await User.create({
        email: 'reusetoken@example.com',
        password: 'TestPass123!',
        firstName: 'Reuse',
        lastName: 'Token'
      });

      // Generate verification token
      const verificationToken = user.createEmailVerificationToken();
      await user.save({ validateBeforeSave: false });

      // First verification attempt should succeed
      await request(app)
        .get(`/api/auth/verify-email/${verificationToken}`)
        .expect(200);

      // Second verification attempt with the same token should fail
      const response = await request(app)
        .get(`/api/auth/verify-email/${verificationToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Token is invalid or has expired');
    });

    it('should verify that email is actually verified in the database', async () => {
      // Create a user with verification token
      const user = await User.create({
        email: 'finalcheck@example.com',
        password: 'TestPass123!',
        firstName: 'Final',
        lastName: 'Check'
      });

      // Generate verification token
      const verificationToken = user.createEmailVerificationToken();
      await user.save({ validateBeforeSave: false });

      // Verify the email
      await request(app)
        .get(`/api/auth/verify-email/${verificationToken}`)
        .expect(200);

      // Get the user from database to check if email is verified
      const updatedUser = await User.findOne({ email: 'finalcheck@example.com' });
      expect(updatedUser.isEmailVerified).toBe(true);
      
      // Also make sure the token fields are cleared
      expect(updatedUser.emailVerificationToken).toBeUndefined();
      expect(updatedUser.emailVerificationExpires).toBeUndefined();
    });
  });
});