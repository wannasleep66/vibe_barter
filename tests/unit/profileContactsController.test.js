const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/server');
const User = require('../../src/models/User');
const Profile = require('../../src/models/Profile');

describe('Profile Contacts API', () => {
  let authToken;
  let userId;

  // Create a test user before running tests
  beforeAll(async () => {
    // Clean up any existing test data
    await User.deleteMany({ email: 'testcontacts@example.com' });
    await Profile.deleteMany({});

    // Create test user
    const testUser = await User.create({
      email: 'testcontacts@example.com',
      firstName: 'Test',
      lastName: 'Contacts',
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
      contacts: [] // Start with empty contacts
    });
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ email: 'testcontacts@example.com' });
    await Profile.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/profile/contacts', () => {
    it('should add a new contact to the profile', async () => {
      const response = await request(app)
        .post('/api/profile/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'email', value: 'test@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Contact added successfully');
      expect(response.body.data.contacts).toContainEqual({
        type: 'email',
        value: 'test@example.com'
      });
    });

    it('should add a contact with different types', async () => {
      const response = await request(app)
        .post('/api/profile/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'phone', value: '+1234567890' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.contacts).toContainEqual({
        type: 'phone',
        value: '+1234567890'
      });
    });

    it('should not add a duplicate contact', async () => {
      // First add the contact
      await request(app)
        .post('/api/profile/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'website', value: 'https://example.com' })
        .expect(200);

      // Try to add the same contact again
      const response = await request(app)
        .post('/api/profile/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'website', value: 'https://example.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Contact with this type and value already exists in profile');
    });

    it('should validate contact type', async () => {
      const response = await request(app)
        .post('/api/profile/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'invalid', value: 'test@example.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Contact type is required');
    });

    it('should validate contact value', async () => {
      const response = await request(app)
        .post('/api/profile/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'email', value: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Contact value is required and must be a non-empty string');
    });
  });

  describe('GET /api/profile/contacts', () => {
    it('should retrieve all contacts from the profile', async () => {
      // Add a couple of contacts first
      await request(app)
        .post('/api/profile/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'social', value: 'https://twitter.com/test' })
        .expect(200);

      await request(app)
        .post('/api/profile/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'phone', value: '+1987654321' })
        .expect(200);

      const response = await request(app)
        .get('/api/profile/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const contacts = response.body.data.contacts;
      expect(contacts).toContainEqual({ type: 'social', value: 'https://twitter.com/test' });
      expect(contacts).toContainEqual({ type: 'phone', value: '+1987654321' });
    });

    it('should return empty array if no contacts exist', async () => {
      // Remove all contacts
      await Profile.updateOne({ user: userId }, { contacts: [] });

      const response = await request(app)
        .get('/api/profile/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.contacts)).toBe(true);
      expect(response.body.data.contacts.length).toBe(0);
    });
  });

  describe('PUT /api/profile/contacts', () => {
    it('should update a contact value', async () => {
      // Add a contact first
      await request(app)
        .post('/api/profile/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'email', value: 'old@example.com' })
        .expect(200);

      // Update the contact value
      const response = await request(app)
        .put('/api/profile/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ currentType: 'email', currentValue: 'old@example.com', newValue: 'new@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Contact updated successfully');
      expect(response.body.data.contacts).toContainEqual({
        type: 'email',
        value: 'new@example.com'
      });
      const contacts = response.body.data.contacts;
      const contact = contacts.find(c => c.type === 'email' && c.value === 'old@example.com');
      expect(contact).toBeUndefined();
    });

    it('should update a contact type', async () => {
      // Add a contact first
      await request(app)
        .post('/api/profile/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'website', value: 'https://example.com' })
        .expect(200);

      // Update the contact type
      const response = await request(app)
        .put('/api/profile/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ currentType: 'website', currentValue: 'https://example.com', newType: 'social' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Contact updated successfully');
      expect(response.body.data.contacts).toContainEqual({
        type: 'social',
        value: 'https://example.com'
      });
    });

    it('should update both contact type and value', async () => {
      // Add a contact first
      await request(app)
        .post('/api/profile/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'phone', value: '1234567890' })
        .expect(200);

      // Update both type and value
      const response = await request(app)
        .put('/api/profile/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          currentType: 'phone', 
          currentValue: '1234567890', 
          newType: 'social',
          newValue: 'https://linkedin.com/test'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Contact updated successfully');
      expect(response.body.data.contacts).toContainEqual({
        type: 'social',
        value: 'https://linkedin.com/test'
      });
    });

    it('should return error if contact does not exist', async () => {
      const response = await request(app)
        .put('/api/profile/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ currentType: 'email', currentValue: 'nonexistent@example.com', newValue: 'new@example.com' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Contact not found in profile');
    });

    it('should not allow updating to an existing contact combination', async () => {
      // Add two contacts
      await request(app)
        .post('/api/profile/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'email', value: 'existing@example.com' })
        .expect(200);

      await request(app)
        .post('/api/profile/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'email', value: 'another@example.com' })
        .expect(200);

      // Try to update the second one to match the first one
      const response = await request(app)
        .put('/api/profile/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ currentType: 'email', currentValue: 'another@example.com', newValue: 'existing@example.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('A contact with this type and value already exists in profile');
    });
  });

  describe('DELETE /api/profile/contacts', () => {
    it('should remove a contact from the profile', async () => {
      // Add a contact first
      await request(app)
        .post('/api/profile/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'website', value: 'https://example.com' })
        .expect(200);

      // Remove the contact using query parameters
      const response = await request(app)
        .delete('/api/profile/contacts?type=website&value=https://example.com')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Contact removed successfully');
      const contacts = response.body.data.contacts;
      const removedContact = contacts.find(contact => 
        contact.type === 'website' && contact.value === 'https://example.com'
      );
      expect(removedContact).toBeUndefined();
    });

    it('should return error if contact does not exist', async () => {
      const response = await request(app)
        .delete('/api/profile/contacts?type=email&value=nonexistent@example.com')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Contact not found in profile');
    });

    it('should validate contact type parameter', async () => {
      const response = await request(app)
        .delete('/api/profile/contacts?type=invalid&value=test@example.com')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Contact type is required');
    });

    it('should validate contact value parameter', async () => {
      const response = await request(app)
        .delete('/api/profile/contacts?type=email&value=')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Contact value is required and must be a non-empty string');
    });
  });
});