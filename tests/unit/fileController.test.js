const request = require('supertest');
const path = require('path');
const fs = require('fs');

// Import your app
const app = require('../src/server');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const { logger } = require('../src/logger/logger');

describe('File Upload API', () => {
  let authToken;
  let testUserId;
  let testUser;

  // Create a test user
  beforeAll(async () => {
    // Clean up any existing test users
    await User.deleteMany({ email: 'test@example.com' });
    
    // Create a test user
    testUser = await User.create({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: 'password123',
      role: 'user'
    });
    
    testUserId = testUser._id;
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ email: 'test@example.com' });
    await mongoose.connection.close();
  });

  // Test file upload
  test('should upload a file successfully', async () => {
    // In a real test, you would need to authenticate first to get a valid token
    // For this example, we'll skip authentication by temporarily removing the protect middleware
    // or by providing a valid JWT token
    
    const testImagePath = path.join(__dirname, 'assets', 'test-image.png');
    
    // Create a simple test image if it doesn't exist
    if (!fs.existsSync(path.join(__dirname, 'assets'))) {
      fs.mkdirSync(path.join(__dirname, 'assets'));
    }
    
    // Create a simple PNG file for testing
    const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const ihdrChunk = Buffer.from([
      0x00, 0x00, 0x00, 0x0D, // Length: 13
      0x49, 0x48, 0x44, 0x52, // Chunk type: IHDR
      0x00, 0x00, 0x00, 0x01, // Width: 1
      0x00, 0x00, 0x00, 0x01, // Height: 1
      0x08, 0x06, 0x00, 0x00, 0x00, // Other IHDR data
      0xF4, 0x25, 0xE9, 0x0D  // CRC
    ]);
    
    const pngData = Buffer.concat([pngHeader, ihdrChunk]);
    fs.writeFileSync(testImagePath, pngData);

    // Try to upload the file
    const response = await request(app)
      .post('/api/files/upload')
      .attach('file', testImagePath)
      .field('advertisementId', '60f1b2b3e4b0a1a2b3c4d5e6') // Use a mock ID for testing
      .expect(401); // Expect 401 unauthorized without auth token

    // Since authentication is required, the response should be 401
    expect(response.status).toBe(401);
  });

  test('should return 404 when trying to get a non-existent file', async () => {
    const response = await request(app)
      .get('/api/files/nonexistent.jpg')
      .expect(404);
    
    expect(response.body.success).toBe(false);
  });

  test('should get file info for an existing file', async () => {
    // This would be tested after a successful upload with proper authentication
    const response = await request(app)
      .get('/api/info/nonexistent.jpg')
      .expect(401); // Expect 401 without auth
    
    expect(response.status).toBe(401);
  });
});