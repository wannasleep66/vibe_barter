const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/server');
const User = require('../../src/models/User');
const Profile = require('../../src/models/Profile');

describe('Profile Languages API', () => {
  let authToken;
  let userId;

  // Create a test user before running tests
  beforeAll(async () => {
    // Clean up any existing test data
    await User.deleteMany({ email: 'testlanguages@example.com' });
    await Profile.deleteMany({});

    // Create test user
    const testUser = await User.create({
      email: 'testlanguages@example.com',
      firstName: 'Test',
      lastName: 'Languages',
      password: 'password123',
      role: 'user'
    });

    userId = testUser._id;

    // Generate a JWT token for testing
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'your_jwt_secret_here';
    authToken = jwt.sign(
      { id: testUser._id, email: testUser.email, role: testUser.role },
      secret,
      { expiresIn: '1h' }
    );

    // Create a profile for the user
    await Profile.create({
      user: userId,
      languages: [] // Start with empty languages
    });
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ email: 'testlanguages@example.com' });
    await Profile.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/profile/languages', () => {
    it('should add a new language to the profile', async () => {
      const response = await request(app)
        .post('/api/profile/languages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ language: 'English', level: 'fluent' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Language added successfully');
      expect(response.body.data.languages).toContainEqual({
        language: 'English',
        level: 'fluent'
      });
    });

    it('should add a language with default level when level is not provided', async () => {
      const response = await request(app)
        .post('/api/profile/languages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ language: 'Spanish' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.languages).toContainEqual({
        language: 'Spanish',
        level: 'intermediate' // default level
      });
    });

    it('should not add a duplicate language', async () => {
      // First add the language
      await request(app)
        .post('/api/profile/languages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ language: 'French', level: 'advanced' })
        .expect(200);

      // Try to add the same language again
      const response = await request(app)
        .post('/api/profile/languages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ language: 'French', level: 'beginner' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Language already exists in profile');
    });

    it('should validate language input', async () => {
      const response = await request(app)
        .post('/api/profile/languages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ language: '', level: 'fluent' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Language is required and must be a non-empty string');
    });

    it('should validate language level', async () => {
      const response = await request(app)
        .post('/api/profile/languages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ language: 'German', level: 'expert' }) // 'expert' is not a valid level
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Level must be one of');
    });
  });

  describe('GET /api/profile/languages', () => {
    it('should retrieve all languages from the profile', async () => {
      // Add a couple of languages first
      await request(app)
        .post('/api/profile/languages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ language: 'Italian', level: 'intermediate' })
        .expect(200);

      await request(app)
        .post('/api/profile/languages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ language: 'Chinese', level: 'beginner' })
        .expect(200);

      const response = await request(app)
        .get('/api/profile/languages')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const languages = response.body.data.languages;
      expect(languages).toContainEqual({ language: 'Italian', level: 'intermediate' });
      expect(languages).toContainEqual({ language: 'Chinese', level: 'beginner' });
    });

    it('should return empty array if no languages exist', async () => {
      // Remove all languages
      await Profile.updateOne({ user: userId }, { languages: [] });

      const response = await request(app)
        .get('/api/profile/languages')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.languages)).toBe(true);
      expect(response.body.data.languages.length).toBe(0);
    });
  });

  describe('PUT /api/profile/languages', () => {
    it('should update a language level', async () => {
      // Add a language first
      await request(app)
        .post('/api/profile/languages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ language: 'Russian', level: 'beginner' })
        .expect(200);

      // Update the language level
      const response = await request(app)
        .put('/api/profile/languages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ language: 'Russian', newLevel: 'intermediate' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Language updated successfully');
      expect(response.body.data.languages).toContainEqual({
        language: 'Russian',
        level: 'intermediate'
      });
    });

    it('should update a language name', async () => {
      // Add a language first
      await request(app)
        .post('/api/profile/languages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ language: 'Japanese', level: 'fluent' })
        .expect(200);

      // Update the language name
      const response = await request(app)
        .put('/api/profile/languages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ language: 'Japanese', newLanguage: 'Japanese (Kanji)' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Language updated successfully');
      const languages = response.body.data.languages;
      const updatedLanguage = languages.find(lang => lang.language === 'Japanese (Kanji)');
      expect(updatedLanguage).toBeDefined();
      expect(updatedLanguage.level).toBe('fluent');
    });

    it('should update both language name and level', async () => {
      // Add a language first
      await request(app)
        .post('/api/profile/languages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ language: 'Korean', level: 'beginner' })
        .expect(200);

      // Update both name and level
      const response = await request(app)
        .put('/api/profile/languages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          language: 'Korean', 
          newLanguage: 'Korean (Advanced)', 
          newLevel: 'advanced' 
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Language updated successfully');
      expect(response.body.data.languages).toContainEqual({
        language: 'Korean (Advanced)',
        level: 'advanced'
      });
    });

    it('should return error if language does not exist', async () => {
      const response = await request(app)
        .put('/api/profile/languages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ language: 'NonExistentLanguage', newLevel: 'fluent' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Language not found in profile');
    });

    it('should not allow updating to an existing language name', async () => {
      // Add two languages
      await request(app)
        .post('/api/profile/languages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ language: 'Arabic', level: 'advanced' })
        .expect(200);

      await request(app)
        .post('/api/profile/languages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ language: 'Portuguese', level: 'intermediate' })
        .expect(200);

      // Try to update Portuguese to Arabic (which already exists)
      const response = await request(app)
        .put('/api/profile/languages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ language: 'Portuguese', newLanguage: 'Arabic' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('New language name already exists in profile');
    });
  });

  describe('DELETE /api/profile/languages/:language', () => {
    it('should remove a language from the profile', async () => {
      // Add a language first
      await request(app)
        .post('/api/profile/languages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ language: 'Dutch', level: 'fluent' })
        .expect(200);

      // Remove the language
      const response = await request(app)
        .delete('/api/profile/languages/Dutch')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Language removed successfully');
      const languages = response.body.data.languages;
      const removedLanguage = languages.find(lang => lang.language === 'Dutch');
      expect(removedLanguage).toBeUndefined();
    });

    it('should return error if language does not exist', async () => {
      const response = await request(app)
        .delete('/api/profile/languages/NonExistentLanguage')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Language not found in profile');
    });

    it('should validate language parameter', async () => {
      const response = await request(app)
        .delete('/api/profile/languages/')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Language is required');
    });
  });
});