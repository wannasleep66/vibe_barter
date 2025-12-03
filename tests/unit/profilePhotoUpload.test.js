const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/server');
const User = require('../../src/models/User');
const Profile = require('../../src/models/Profile');

describe('Profile Photo Upload API', () => {
  let authToken;
  let userId;

  // Create a test user before running tests
  beforeAll(async () => {
    // Clean up any existing test data
    await User.deleteMany({ email: 'testphoto@example.com' });
    await Profile.deleteMany({});

    // Create test user
    const testUser = await User.create({
      email: 'testphoto@example.com',
      firstName: 'Test',
      lastName: 'Photo',
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
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ email: 'testphoto@example.com' });
    await Profile.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/profile/photo', () => {
    it('should upload a profile photo', async () => {
      // Create a simple PNG image buffer for testing
      const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      const ihdrChunk = Buffer.from([
        0x00, 0x00, 0x00, 0x0D, // Length: 13
        0x49, 0x48, 0x44, 0x52, // Chunk type: IHDR
        0x00, 0x00, 0x00, 0x01, // Width: 1
        0x00, 0x00, 0x00, 0x01, // Height: 1
        0x08, 0x06, 0x00, 0x00, 0x00, // Other IHDR data
        0xF4, 0x25, 0xE9, 0x0D  // CRC
      ]);
      
      const idatChunk = Buffer.from([
        0x00, 0x00, 0x00, 0x0D, // Length: 13
        0x49, 0x44, 0x41, 0x54, // Chunk type: IDAT
        0x78, 0xDA, 0x63, 0x60, // Compressed data
        0x00, 0x00, 0x00, 0x02, 0x00, 0x01,
        0x1D, 0x0A, 0x2D, 0xBE // More compressed data
      ]);
      
      const iendChunk = Buffer.from([
        0x00, 0x00, 0x00, 0x00, // Length: 0
        0x49, 0x45, 0x4E, 0x44, // Chunk type: IEND
        0xAE, 0x42, 0x60, 0x82  // CRC
      ]);
      
      const pngData = Buffer.concat([pngHeader, ihdrChunk, idatChunk, iendChunk]);

      const response = await request(app)
        .post('/api/profile/photo')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', pngData, 'test.png')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.avatar).toBeDefined();
      expect(response.body.data.avatar).toContain('/uploads/');
    });

    it('should reject files that are not images', async () => {
      const fakeImageData = Buffer.from('This is not an image file');

      const response = await request(app)
        .post('/api/profile/photo')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', fakeImageData, 'notimage.txt')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });

    it('should reject files that are too large', async () => {
      // This test would require creating a large buffer, 
      // but our middleware would handle the size validation
      // For now we'll just verify that we have size limits
      const fakeImageData = Buffer.alloc(3 * 1024 * 1024); // 3MB file

      const response = await request(app)
        .post('/api/profile/photo')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', fakeImageData, 'large.png')
        .expect(413); // Payload Too Large

      // Note: This test may return 413 from multer before hitting our controller
    });
  });

  describe('DELETE /api/profile/photo', () => {
    it('should remove the profile photo', async () => {
      const response = await request(app)
        .delete('/api/profile/photo')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Profile photo removed successfully');
      expect(response.body.data.avatar).toBeNull();
    });

    it('should return 404 when no profile exists', async () => {
      await Profile.deleteMany({ user: userId }); // Remove profile if exists

      const response = await request(app)
        .delete('/api/profile/photo')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Profile not found');
    });
  });

  describe('Profile photo integration', () => {
    it('should update profile with new photo URL', async () => {
      // First, upload a profile photo
      const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      const ihdrChunk = Buffer.from([
        0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01,
        0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00,
        0xF4, 0x25, 0xE9, 0x0D
      ]);
      const idatChunk = Buffer.from([
        0x00, 0x00, 0x00, 0x0D,
        0x49, 0x44, 0x41, 0x54,
        0x78, 0xDA, 0x63, 0x60,
        0x00, 0x00, 0x00, 0x02, 0x00, 0x01,
        0x1D, 0x0A, 0x2D, 0xBE
      ]);
      const iendChunk = Buffer.from([
        0x00, 0x00, 0x00, 0x00,
        0x49, 0x45, 0x4E, 0x44,
        0xAE, 0x42, 0x60, 0x82
      ]);
      const pngData = Buffer.concat([pngHeader, ihdrChunk, idatChunk, iendChunk]);

      await request(app)
        .post('/api/profile/photo')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', pngData, 'integration-test.png')
        .expect(200);

      // Then verify the profile has the avatar URL
      const profileResponse = await request(app)
        .get('/api/profile/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.avatar).toBeDefined();
      expect(profileResponse.body.data.avatar).toContain('/uploads/');
    });
  });
});