const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/server');
const User = require('../../src/models/User');
const Profile = require('../../src/models/Profile');

describe('Profile Portfolio API', () => {
  let authToken;
  let userId;

  // Create a test user before running tests
  beforeAll(async () => {
    // Clean up any existing test data
    await User.deleteMany({ email: 'testportfolio@example.com' });
    await Profile.deleteMany({});

    // Create test user
    const testUser = await User.create({
      email: 'testportfolio@example.com',
      firstName: 'Test',
      lastName: 'Portfolio',
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
      portfolio: [] // Start with empty portfolio
    });
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ email: 'testportfolio@example.com' });
    await Profile.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/profile/portfolio', () => {
    it('should add a new portfolio item to the profile', async () => {
      const response = await request(app)
        .post('/api/profile/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          title: 'Sample Project',
          description: 'A sample portfolio project',
          url: 'https://example.com/project',
          media: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Portfolio item added successfully');
      expect(response.body.data.portfolio).toContainEqual({
        title: 'Sample Project',
        description: 'A sample portfolio project',
        url: 'https://example.com/project',
        media: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
      });
    });

    it('should add a portfolio item with minimal data', async () => {
      const response = await request(app)
        .post('/api/profile/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          title: 'Simple Project',
          description: ''
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.portfolio).toContainEqual({
        title: 'Simple Project',
        description: '',
        url: null, // Should be null since it was not provided
        media: [] // Should be empty since it was not provided
      });
    });

    it('should not add a duplicate portfolio item (same title)', async () => {
      // First add the portfolio item
      await request(app)
        .post('/api/profile/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          title: 'Duplicate Project',
          description: 'Will be duplicated'
        })
        .expect(200);

      // Try to add the same title again
      const response = await request(app)
        .post('/api/profile/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          title: 'Duplicate Project',
          description: 'Different description but same title'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Portfolio item with this title already exists in profile');
    });

    it('should validate portfolio title', async () => {
      const response = await request(app)
        .post('/api/profile/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          title: '', // Invalid: empty title
          description: 'Some description'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Title is required and must be a non-empty string');
    });

    it('should validate portfolio URL if provided', async () => {
      const response = await request(app)
        .post('/api/profile/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          title: 'Project with Invalid URL',
          url: 'not-a-valid-url'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('URL must be a valid URL');
    });
  });

  describe('GET /api/profile/portfolio', () => {
    it('should retrieve all portfolio items from the profile', async () => {
      // Add a couple of portfolio items first
      await request(app)
        .post('/api/profile/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          title: 'Portfolio Item 1',
          description: 'First portfolio item'
        })
        .expect(200);

      await request(app)
        .post('/api/profile/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          title: 'Portfolio Item 2',
          description: 'Second portfolio item',
          url: 'https://example.com/project2'
        })
        .expect(200);

      const response = await request(app)
        .get('/api/profile/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const portfolio = response.body.data.portfolio;
      expect(portfolio).toContainEqual({
        title: 'Portfolio Item 1',
        description: 'First portfolio item',
        url: null,
        media: []
      });
      expect(portfolio).toContainEqual({
        title: 'Portfolio Item 2', 
        description: 'Second portfolio item',
        url: 'https://example.com/project2',
        media: []
      });
    });

    it('should return empty array if no portfolio items exist', async () => {
      // Remove all portfolio items
      await Profile.updateOne({ user: userId }, { portfolio: [] });

      const response = await request(app)
        .get('/api/profile/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.portfolio)).toBe(true);
      expect(response.body.data.portfolio.length).toBe(0);
    });
  });

  describe('PUT /api/profile/portfolio', () => {
    it('should update a portfolio item description', async () => {
      // Add a portfolio item first
      await request(app)
        .post('/api/profile/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          title: 'Original Title',
          description: 'Original description'
        })
        .expect(200);

      // Update the portfolio item description
      const response = await request(app)
        .put('/api/profile/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          currentTitle: 'Original Title',
          description: 'Updated description'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Portfolio item updated successfully');
      expect(response.body.data.portfolio).toContainEqual({
        title: 'Original Title',
        description: 'Updated description',
        url: null,
        media: []
      });
    });

    it('should update a portfolio item title', async () => {
      // Add a portfolio item first
      await request(app)
        .post('/api/profile/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          title: 'Old Title',
          description: 'Some description'
        })
        .expect(200);

      // Update the portfolio item title
      const response = await request(app)
        .put('/api/profile/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          currentTitle: 'Old Title',
          newTitle: 'New Title'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Portfolio item updated successfully');
      expect(response.body.data.portfolio).toContainEqual({
        title: 'New Title',
        description: 'Some description',
        url: null,
        media: []
      });
      const portfolio = response.body.data.portfolio;
      const oldItem = portfolio.find(item => item.title === 'Old Title');
      expect(oldItem).toBeUndefined();
    });

    it('should update portfolio item URL', async () => {
      // Add a portfolio item first
      await request(app)
        .post('/api/profile/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          title: 'Project with URL',
          description: 'Has a URL'
        })
        .expect(200);

      // Update the portfolio item URL
      const response = await request(app)
        .put('/api/profile/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          currentTitle: 'Project with URL',
          url: 'https://updated-url.com'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Portfolio item updated successfully');
      expect(response.body.data.portfolio).toContainEqual({
        title: 'Project with URL',
        description: 'Has a URL',
        url: 'https://updated-url.com',
        media: []
      });
    });

    it('should update portfolio item media', async () => {
      // Add a portfolio item first
      await request(app)
        .post('/api/profile/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          title: 'Project with Images',
          description: 'Has images'
        })
        .expect(200);

      // Update the portfolio item media
      const response = await request(app)
        .put('/api/profile/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          currentTitle: 'Project with Images',
          media: ['https://new-image.com/img.jpg']
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Portfolio item updated successfully');
      expect(response.body.data.portfolio).toContainEqual({
        title: 'Project with Images',
        description: 'Has images',
        url: null,
        media: ['https://new-image.com/img.jpg']
      });
    });

    it('should return error if portfolio item does not exist', async () => {
      const response = await request(app)
        .put('/api/profile/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          currentTitle: 'NonExistingProject',
          description: 'Trying to update non-existing project'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Portfolio item not found in profile');
    });

    it('should not allow updating to an existing portfolio item title', async () => {
      // Add two portfolio items
      await request(app)
        .post('/api/profile/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          title: 'Existing Project 1',
          description: 'First project'
        })
        .expect(200);

      await request(app)
        .post('/api/profile/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          title: 'Existing Project 2',
          description: 'Second project'
        })
        .expect(200);

      // Try to update the second one to have the same title as the first
      const response = await request(app)
        .put('/api/profile/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          currentTitle: 'Existing Project 2',
          newTitle: 'Existing Project 1'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Portfolio item with this title already exists in profile');
    });
  });

  describe('DELETE /api/profile/portfolio/:title', () => {
    it('should remove a portfolio item from the profile', async () => {
      // Add a portfolio item first
      await request(app)
        .post('/api/profile/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          title: 'To Be Deleted',
          description: 'This will be deleted'
        })
        .expect(200);

      // Remove the portfolio item
      const response = await request(app)
        .delete('/api/profile/portfolio/To Be Deleted')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Portfolio item removed successfully');
      const portfolio = response.body.data.portfolio;
      const removedItem = portfolio.find(item => item.title === 'To Be Deleted');
      expect(removedItem).toBeUndefined();
    });

    it('should return error if portfolio item does not exist', async () => {
      const response = await request(app)
        .delete('/api/profile/portfolio/NonExistingProject')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Portfolio item not found in profile');
    });

    it('should validate portfolio title parameter', async () => {
      const response = await request(app)
        .delete('/api/profile/portfolio/')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Title is required');
    });
  });
});