const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/server');
const User = require('../../src/models/User');
const Profile = require('../../src/models/Profile');

describe('Profile API', () => {
  let authToken;
  let userId;
  let profileId;

  // Create a test user before running tests
  beforeAll(async () => {
    // Clean up any existing test data
    await User.deleteMany({ email: 'testprofile@example.com' });
    await Profile.deleteMany({});

    // Create test user
    const testUser = await User.create({
      email: 'testprofile@example.com',
      firstName: 'Test',
      lastName: 'Profile',
      password: 'password123',
      role: 'user'
    });

    userId = testUser._id;

    // Generate a JWT token for testing (you may need to implement this based on your auth system)
    // For now, I'll assume there's a way to generate a test token
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'your_jwt_secret_here';
    authToken = jwt.sign(
      { id: testUser._id, email: testUser.email, role: testUser.role },
      secret,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ email: 'testprofile@example.com' });
    await Profile.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/profile', () => {
    it('should create a new profile', async () => {
      const newProfile = {
        bio: 'I am a test user',
        location: 'Test Location',
        skills: ['JavaScript', 'Node.js'],
        languages: [
          {
            language: 'English',
            level: 'fluent'
          }
        ],
        contacts: [
          {
            type: 'email',
            value: 'test@example.com'
          }
        ],
        portfolio: [
          {
            title: 'Test Project',
            description: 'A sample project',
            url: 'https://example.com'
          }
        ]
      };

      const response = await request(app)
        .post('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newProfile)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user', userId.toString());
      expect(response.body.data.bio).toBe(newProfile.bio);
      expect(response.body.data.location).toBe(newProfile.location);
      expect(response.body.data.skills).toEqual(newProfile.skills);

      profileId = response.body.data._id;
    });

    it('should not create a profile if one already exists', async () => {
      const newProfile = {
        bio: 'This should fail',
        location: 'Another Location'
      };

      const response = await request(app)
        .post('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newProfile)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate profile data on creation', async () => {
      const invalidProfile = {
        bio: 'a'.repeat(501), // Exceeds max length
        skills: ['a'.repeat(51)] // Skill name too long
      };

      const response = await request(app)
        .post('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidProfile)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation error');
    });
  });

  describe('GET /api/profile/me', () => {
    it('should get the authenticated user\'s profile', async () => {
      const response = await request(app)
        .get('/api/profile/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user._id).toBe(userId.toString());
    });

    it('should return 404 if user has no profile', async () => {
      // Create a new user without a profile
      const newUser = await User.create({
        email: 'noprofile@example.com',
        firstName: 'No',
        lastName: 'Profile',
        password: 'password123',
        role: 'user'
      });

      const jwt = require('jsonwebtoken');
      const secret = process.env.JWT_SECRET || 'your_jwt_secret_here';
      const newAuthToken = jwt.sign(
        { id: newUser._id, email: newUser.email, role: newUser.role },
        secret,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/profile/me')
        .set('Authorization', `Bearer ${newAuthToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Profile not found');

      // Clean up
      await User.findByIdAndDelete(newUser._id);
    });
  });

  describe('PUT /api/profile', () => {
    it('should update the user\'s profile', async () => {
      const updatedData = {
        bio: 'Updated bio',
        location: 'Updated Location',
        skills: ['Updated Skill']
      };

      const response = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bio).toBe(updatedData.bio);
      expect(response.body.data.location).toBe(updatedData.location);
      expect(response.body.data.skills).toEqual(updatedData.skills);
    });

    it('should validate profile data on update', async () => {
      const invalidData = {
        bio: 'a'.repeat(501) // Exceeds max length
      };

      const response = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation error');
    });
  });

  describe('DELETE /api/profile', () => {
    it('should delete the user\'s profile', async () => {
      const response = await request(app)
        .delete('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Profile deleted successfully');
    });

    it('should return 404 when trying to delete a non-existent profile', async () => {
      // Try to delete again (should fail since it's already deleted)
      const response = await request(app)
        .delete('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Profile not found');
    });
  });

  describe('GET /api/profile/search', () => {
    it('should search profiles', async () => {
      // First, create a profile again for search testing
      await Profile.create({
        user: userId,
        bio: 'Software developer with experience in Node.js and React',
        location: 'New York',
        skills: ['JavaScript', 'Node.js', 'React']
      });

      const response = await request(app)
        .get('/api/profile/search?skills=JavaScript')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});