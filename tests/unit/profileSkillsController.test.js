const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/server');
const User = require('../../src/models/User');
const Profile = require('../../src/models/Profile');

describe('Profile Skills API', () => {
  let authToken;
  let userId;

  // Create a test user before running tests
  beforeAll(async () => {
    // Clean up any existing test data
    await User.deleteMany({ email: 'testskills@example.com' });
    await Profile.deleteMany({});

    // Create test user
    const testUser = await User.create({
      email: 'testskills@example.com',
      firstName: 'Test',
      lastName: 'Skills',
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
      skills: [] // Start with empty skills
    });
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ email: 'testskills@example.com' });
    await Profile.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/profile/skills', () => {
    it('should add a new skill to the profile', async () => {
      const response = await request(app)
        .post('/api/profile/skills')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ skill: 'JavaScript' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Skill added successfully');
      expect(response.body.data.skills).toContain('JavaScript');
    });

    it('should not add a duplicate skill', async () => {
      // First add the skill
      await request(app)
        .post('/api/profile/skills')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ skill: 'React' })
        .expect(200);

      // Try to add the same skill again
      const response = await request(app)
        .post('/api/profile/skills')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ skill: 'React' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Skill already exists in profile');
    });

    it('should validate skill input', async () => {
      const response = await request(app)
        .post('/api/profile/skills')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ skill: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Skill is required and must be a non-empty string');
    });

    it('should validate skill length', async () => {
      const longSkill = 'a'.repeat(51); // More than 50 characters
      const response = await request(app)
        .post('/api/profile/skills')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ skill: longSkill })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Skill name cannot exceed 50 characters');
    });
  });

  describe('GET /api/profile/skills', () => {
    it('should retrieve all skills from the profile', async () => {
      // Add a couple of skills first
      await request(app)
        .post('/api/profile/skills')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ skill: 'Node.js' })
        .expect(200);

      await request(app)
        .post('/api/profile/skills')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ skill: 'MongoDB' })
        .expect(200);

      const response = await request(app)
        .get('/api/profile/skills')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.skills).toContain('Node.js');
      expect(response.body.data.skills).toContain('MongoDB');
    });

    it('should return empty array if no skills exist', async () => {
      // Remove all skills
      await Profile.updateOne({ user: userId }, { skills: [] });

      const response = await request(app)
        .get('/api/profile/skills')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.skills)).toBe(true);
      expect(response.body.data.skills.length).toBe(0);
    });
  });

  describe('PUT /api/profile/skills', () => {
    it('should update a skill name', async () => {
      // Add a skill first
      await request(app)
        .post('/api/profile/skills')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ skill: 'JS' })
        .expect(200);

      // Update the skill name
      const response = await request(app)
        .put('/api/profile/skills')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ oldSkill: 'JS', newSkill: 'JavaScript' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Skill updated successfully');
      expect(response.body.data.skills).toContain('JavaScript');
      expect(response.body.data.skills).not.toContain('JS');
    });

    it('should return error if old skill does not exist', async () => {
      const response = await request(app)
        .put('/api/profile/skills')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ oldSkill: 'NonExistentSkill', newSkill: 'NewSkill' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Skill not found in profile');
    });

    it('should not allow updating to an existing skill name', async () => {
      // Add two skills
      await request(app)
        .post('/api/profile/skills')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ skill: 'React' })
        .expect(200);

      await request(app)
        .post('/api/profile/skills')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ skill: 'Vue' })
        .expect(200);

      // Try to update Vue to React (which already exists)
      const response = await request(app)
        .put('/api/profile/skills')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ oldSkill: 'Vue', newSkill: 'React' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('New skill name already exists in profile');
    });
  });

  describe('DELETE /api/profile/skills/:skill', () => {
    it('should remove a skill from the profile', async () => {
      // Add a skill first
      await request(app)
        .post('/api/profile/skills')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ skill: 'Testing' })
        .expect(200);

      // Remove the skill
      const response = await request(app)
        .delete('/api/profile/skills/Testing')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Skill removed successfully');
      expect(response.body.data.skills).not.toContain('Testing');
    });

    it('should return error if skill does not exist', async () => {
      const response = await request(app)
        .delete('/api/profile/skills/NonExistentSkill')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Skill not found in profile');
    });

    it('should validate skill parameter', async () => {
      const response = await request(app)
        .delete('/api/profile/skills/')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404); // This will likely return a 404 since the route parameter is empty

      // Test with empty string - this would be handled by the controller
    });
  });
});