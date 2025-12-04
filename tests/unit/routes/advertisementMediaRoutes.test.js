// tests/unit/routes/advertisementMediaRoutes.test.js
const request = require('supertest');
const express = require('express');
const advertisementMediaRoutes = require('../../../src/routes/advertisementMedia');
const { protect } = require('../../../src/middleware/auth');
const { 
  requirePermissions
} = require('../../../src/middleware/rbac');
const FileHandler = require('../../../src/utils/FileHandler');
const {
  validateCreateAdvertisementMedia,
  validateUpdateAdvertisementMedia,
  validateMediaId,
  validateAdvertisementId,
  validateMediaFile
} = require('../../../src/middleware/validation/advertisementMediaValidation');

// Mock middleware functions
jest.mock('../../../src/middleware/auth', () => ({
  protect: jest.fn((req, res, next) => next())
}));

jest.mock('../../../src/middleware/rbac', () => ({
  requirePermissions: jest.fn(() => (req, res, next) => next()),
  isOwnResourceOrAdmin: jest.fn(() => (req, res, next) => next())
}));

jest.mock('../../../src/utils/FileHandler', () => {
  return jest.fn().mockImplementation(() => ({
    createUploadMiddleware: jest.fn(() => (req, res, next) => next()),
    getFileUrl: jest.fn(),
    removeFile: jest.fn(),
    validateFileContent: jest.fn().mockResolvedValue(true)
  }));
});

jest.mock('../../../src/middleware/validation/advertisementMediaValidation', () => ({
  validateCreateAdvertisementMedia: jest.fn((req, res, next) => next()),
  validateUpdateAdvertisementMedia: jest.fn((req, res, next) => next()),
  validateMediaId: jest.fn((req, res, next) => next()),
  validateAdvertisementId: jest.fn((req, res, next) => next()),
  validateMediaFile: jest.fn((req, res, next) => next())
}));

describe('AdvertisementMedia Routes Unit Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/advertisement-media', advertisementMediaRoutes);
    
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('POST /api/advertisement-media', () => {
    it('should require authentication and proper permissions', async () => {
      await request(app)
        .post('/api/advertisement-media')
        .field('advertisementId', '507f1f77bcf86cd799439011')
        .attach('file', Buffer.from('test file content'), 'test.jpg')
        .expect(404); // Will get 404 because controller is not mocked

      expect(protect).toHaveBeenCalled();
      expect(requirePermissions).toHaveBeenCalledWith('advertisementMedia.create');
      expect(FileHandler).toHaveBeenCalledWith('./uploads');
      expect(validateCreateAdvertisementMedia).toHaveBeenCalled();
      expect(validateMediaFile).toHaveBeenCalled();
    });
  });

  describe('GET /api/advertisement-media/advertisement/:advertisementId', () => {
    it('should require authentication and permissions', async () => {
      await request(app)
        .get('/api/advertisement-media/advertisement/507f1f77bcf86cd799439011')
        .expect(404);

      expect(protect).toHaveBeenCalled();
      expect(requirePermissions).toHaveBeenCalledWith('advertisementMedia.read');
      expect(validateAdvertisementId).toHaveBeenCalled();
    });
  });

  describe('GET /api/advertisement-media/advertisement/:advertisementId/primary', () => {
    it('should require authentication and permissions', async () => {
      await request(app)
        .get('/api/advertisement-media/advertisement/507f1f77bcf86cd799439011/primary')
        .expect(404);

      expect(protect).toHaveBeenCalled();
      expect(requirePermissions).toHaveBeenCalledWith('advertisementMedia.read');
      expect(validateAdvertisementId).toHaveBeenCalled();
    });
  });

  describe('GET /api/advertisement-media/:id', () => {
    it('should require authentication and permissions', async () => {
      await request(app)
        .get('/api/advertisement-media/507f1f77bcf86cd799439011')
        .expect(404);

      expect(protect).toHaveBeenCalled();
      expect(requirePermissions).toHaveBeenCalledWith('advertisementMedia.read');
      expect(validateMediaId).toHaveBeenCalled();
    });
  });

  describe('PATCH /api/advertisement-media/:id', () => {
    it('should require authentication and update permissions', async () => {
      await request(app)
        .patch('/api/advertisement-media/507f1f77bcf86cd799439011')
        .send({ altText: 'Updated text' })
        .expect(404);

      expect(protect).toHaveBeenCalled();
      expect(requirePermissions).toHaveBeenCalledWith('advertisementMedia.update');
      expect(validateMediaId).toHaveBeenCalled();
      expect(validateUpdateAdvertisementMedia).toHaveBeenCalled();
    });
  });

  describe('PATCH /api/advertisement-media/:id/set-primary', () => {
    it('should require authentication and update permissions', async () => {
      await request(app)
        .patch('/api/advertisement-media/507f1f77bcf86cd799439011/set-primary')
        .expect(404);

      expect(protect).toHaveBeenCalled();
      expect(requirePermissions).toHaveBeenCalledWith('advertisementMedia.update');
      expect(validateMediaId).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/advertisement-media/:id', () => {
    it('should require authentication and delete permissions', async () => {
      await request(app)
        .delete('/api/advertisement-media/507f1f77bcf86cd799439011')
        .expect(404);

      expect(protect).toHaveBeenCalled();
      expect(requirePermissions).toHaveBeenCalledWith('advertisementMedia.delete');
      expect(validateMediaId).toHaveBeenCalled();
    });
  });
});