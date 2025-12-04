// tests/unit/controllers/advertisementMediaController.test.js
const advertisementMediaController = require('../../../src/controllers/advertisementMediaController');
const AdvertisementMedia = require('../../../src/models/AdvertisementMedia');
const Advertisement = require('../../../src/models/Advertisement');
const FileHandler = require('../../../src/utils/FileHandler');
const { logger } = require('../../../src/logger/logger');

// Mock the models and utilities
jest.mock('../../../src/models/AdvertisementMedia');
jest.mock('../../../src/models/Advertisement');
jest.mock('../../../src/utils/FileHandler');
jest.mock('../../../src/logger/logger');

describe('AdvertisementMediaController Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: null, params: {}, query: {}, body: {}, file: null };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();

    jest.clearAllMocks();

    logger.info = jest.fn();
    logger.error = jest.fn();
    
    // Mock FileHandler
    FileHandler.mockImplementation(() => ({
      removeFile: jest.fn(),
      getFileUrl: jest.fn((filename) => `/uploads/${filename}`),
      validateFileContent: jest.fn().mockResolvedValue(true)
    }));
  });

  describe('createAdvertisementMedia', () => {
    it('should create advertisement media successfully', async () => {
      const mockUser = { _id: 'userId123' };
      const mockAdvertisement = { _id: 'adId123', ownerId: 'userId123' };
      const mockMedia = {
        _id: 'mediaId123',
        advertisementId: 'adId123',
        filename: 'test.jpg'
      };
      const mockFile = {
        filename: 'test.jpg',
        originalname: 'test.jpg',
        size: 102400,
        mimetype: 'image/jpeg'
      };

      req.user = mockUser;
      req.file = mockFile;
      req.body = {
        advertisementId: 'adId123',
        altText: 'Test image',
        isPrimary: false,
        sortOrder: 0
      };

      Advertisement.findById.mockResolvedValue(mockAdvertisement);
      AdvertisementMedia.create.mockResolvedValue(mockMedia);
      AdvertisementMedia.populate.mockResolvedValue(mockMedia);

      await advertisementMediaController.createAdvertisementMedia(req, res, next);

      expect(AdvertisementMedia.create).toHaveBeenCalledWith({
        advertisementId: 'adId123',
        url: expect.stringContaining('/uploads/'),
        type: 'image',
        filename: 'test.jpg',
        size: 102400,
        altText: 'Test image',
        isPrimary: false,
        sortOrder: 0
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockMedia,
        message: 'Advertisement media added successfully'
      });
    });

    it('should return error if no file provided', async () => {
      req.body = { advertisementId: 'adId123' };

      await advertisementMediaController.createAdvertisementMedia(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No file provided',
          statusCode: 400
        })
      );
    });

    it('should return error if advertisement not found', async () => {
      const mockUser = { _id: 'userId123' };
      const mockFile = {
        filename: 'test.jpg',
        originalname: 'test.jpg',
        size: 102400,
        mimetype: 'image/jpeg'
      };

      req.user = mockUser;
      req.file = mockFile;
      req.body = { advertisementId: 'nonExistentId' };

      Advertisement.findById.mockResolvedValue(null);

      await advertisementMediaController.createAdvertisementMedia(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Advertisement not found',
          statusCode: 404
        })
      );
    });

    it('should return error if user does not own advertisement', async () => {
      const mockUser = { _id: 'differentUserId' };
      const mockAdvertisement = { _id: 'adId123', ownerId: 'userId123' };
      const mockFile = {
        filename: 'test.jpg',
        originalname: 'test.jpg',
        size: 102400,
        mimetype: 'image/jpeg'
      };

      req.user = mockUser;
      req.file = mockFile;
      req.body = { advertisementId: 'adId123' };

      Advertisement.findById.mockResolvedValue(mockAdvertisement);

      await advertisementMediaController.createAdvertisementMedia(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'You do not have permission to add media to this advertisement',
          statusCode: 403
        })
      );
    });

    it('should handle file validation errors', async () => {
      const mockUser = { _id: 'userId123' };
      const mockAdvertisement = { _id: 'adId123', ownerId: 'userId123' };
      const mockFile = {
        filename: 'test.jpg',
        originalname: 'test.jpg',
        size: 102400,
        mimetype: 'image/jpeg'
      };

      req.user = mockUser;
      req.file = mockFile;
      req.body = { advertisementId: 'adId123' };

      Advertisement.findById.mockResolvedValue(mockAdvertisement);
      FileHandler.mockImplementation(() => ({
        removeFile: jest.fn(),
        getFileUrl: jest.fn((filename) => `/uploads/${filename}`),
        validateFileContent: jest.fn().mockResolvedValue(false) // Validation fails
      }));

      await advertisementMediaController.createAdvertisementMedia(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'File validation failed. Possible malicious content detected.',
          statusCode: 400
        })
      );
    });
  });

  describe('getAdvertisementMedia', () => {
    it('should return media for advertisement when user owns it', async () => {
      const mockUser = { _id: 'userId123', role: 'user' };
      const mockAdvertisement = { _id: 'adId123', ownerId: 'userId123' };
      const mockMediaList = [
        { _id: 'media1', advertisementId: 'adId123' },
        { _id: 'media2', advertisementId: 'adId123' }
      ];

      req.user = mockUser;
      req.params = { advertisementId: 'adId123' };

      Advertisement.findById.mockResolvedValue(mockAdvertisement);
      AdvertisementMedia.find.mockReturnThis();
      AdvertisementMedia.sort.mockResolvedValue(mockMediaList);

      await advertisementMediaController.getAdvertisementMedia(req, res, next);

      expect(AdvertisementMedia.find).toHaveBeenCalledWith({ advertisementId: 'adId123' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockMediaList,
        count: 2
      });
    });

    it('should return media for advertisement when user is admin', async () => {
      const mockUser = { _id: 'adminId123', role: 'admin' };
      const mockAdvertisement = { _id: 'adId123', ownerId: 'userId123' };
      const mockMediaList = [
        { _id: 'media1', advertisementId: 'adId123' }
      ];

      req.user = mockUser;
      req.params = { advertisementId: 'adId123' };

      Advertisement.findById.mockResolvedValue(mockAdvertisement);
      AdvertisementMedia.find.mockReturnThis();
      AdvertisementMedia.sort.mockResolvedValue(mockMediaList);

      await advertisementMediaController.getAdvertisementMedia(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return error if user does not have permission', async () => {
      const mockUser = { _id: 'otherUserId', role: 'user' };
      const mockAdvertisement = { _id: 'adId123', ownerId: 'userId123' };

      req.user = mockUser;
      req.params = { advertisementId: 'adId123' };

      Advertisement.findById.mockResolvedValue(mockAdvertisement);

      await advertisementMediaController.getAdvertisementMedia(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'You do not have permission to view media for this advertisement',
          statusCode: 403
        })
      );
    });

    it('should return error if advertisement not found', async () => {
      req.params = { advertisementId: 'nonExistentId' };

      Advertisement.findById.mockResolvedValue(null);

      await advertisementMediaController.getAdvertisementMedia(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Advertisement not found',
          statusCode: 404
        })
      );
    });
  });

  describe('getMediaById', () => {
    it('should return media by ID when user has permission', async () => {
      const mockUser = { _id: 'userId123', role: 'user' };
      const mockMedia = {
        _id: 'mediaId123',
        advertisementId: { ownerId: 'userId123' }
      };

      req.user = mockUser;
      req.params = { id: 'mediaId123' };

      AdvertisementMedia.findById.mockReturnThis();
      AdvertisementMedia.populate.mockResolvedValue(mockMedia);

      await advertisementMediaController.getMediaById(req, res, next);

      expect(AdvertisementMedia.findById).toHaveBeenCalledWith('mediaId123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockMedia
      });
    });

    it('should return error if media not found', async () => {
      req.params = { id: 'nonExistentId' };

      AdvertisementMedia.findById.mockReturnThis();
      AdvertisementMedia.populate.mockResolvedValue(null);

      await advertisementMediaController.getMediaById(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Media not found',
          statusCode: 404
        })
      );
    });

    it('should handle CastError for invalid ID format', async () => {
      const error = new Error();
      error.name = 'CastError';

      req.params = { id: 'invalidId' };

      AdvertisementMedia.findById.mockReturnThis();
      AdvertisementMedia.populate.mockRejectedValue(error);

      await advertisementMediaController.getMediaById(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid media ID format',
          statusCode: 400
        })
      );
    });
  });

  describe('updateMedia', () => {
    it('should update media successfully when user has permission', async () => {
      const mockUser = { _id: 'userId123', role: 'user' };
      const mockMedia = {
        _id: 'mediaId123',
        advertisementId: { ownerId: 'userId123' },
        altText: 'Old text',
        save: jest.fn()
      };

      req.user = mockUser;
      req.params = { id: 'mediaId123' };
      req.body = { altText: 'New text' };

      AdvertisementMedia.findById.mockReturnThis();
      AdvertisementMedia.populate.mockResolvedValue(mockMedia);

      await advertisementMediaController.updateMedia(req, res, next);

      expect(mockMedia.altText).toBe('New text');
      expect(mockMedia.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockMedia,
        message: 'Media updated successfully'
      });
    });

    it('should return error if user does not have permission to update', async () => {
      const mockUser = { _id: 'otherUserId', role: 'user' };
      const mockMedia = {
        _id: 'mediaId123',
        advertisementId: { ownerId: 'userId123' }
      };

      req.user = mockUser;
      req.params = { id: 'mediaId123' };
      req.body = { altText: 'New text' };

      AdvertisementMedia.findById.mockReturnThis();
      AdvertisementMedia.populate.mockResolvedValue(mockMedia);

      await advertisementMediaController.updateMedia(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'You do not have permission to update this media',
          statusCode: 403
        })
      );
    });

    it('should return error if media not found', async () => {
      req.params = { id: 'nonExistentId' };

      AdvertisementMedia.findById.mockReturnThis();
      AdvertisementMedia.populate.mockResolvedValue(null);

      await advertisementMediaController.updateMedia(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Media not found',
          statusCode: 404
        })
      );
    });
  });

  describe('deleteMedia', () => {
    it('should delete media successfully when user has permission', async () => {
      const mockUser = { _id: 'userId123', role: 'user' };
      const mockMedia = {
        _id: 'mediaId123',
        advertisementId: { ownerId: 'userId123' },
        filename: 'test.jpg'
      };

      req.user = mockUser;
      req.params = { id: 'mediaId123' };

      AdvertisementMedia.findById.mockReturnThis();
      AdvertisementMedia.populate.mockResolvedValue(mockMedia);
      AdvertisementMedia.findByIdAndDelete.mockResolvedValue(mockMedia);

      await advertisementMediaController.deleteMedia(req, res, next);

      expect(AdvertisementMedia.findByIdAndDelete).toHaveBeenCalledWith('mediaId123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Media deleted successfully'
      });
    });

    it('should return error if user does not have permission to delete', async () => {
      const mockUser = { _id: 'otherUserId', role: 'user' };
      const mockMedia = {
        _id: 'mediaId123',
        advertisementId: { ownerId: 'userId123' }
      };

      req.user = mockUser;
      req.params = { id: 'mediaId123' };

      AdvertisementMedia.findById.mockReturnThis();
      AdvertisementMedia.populate.mockResolvedValue(mockMedia);

      await advertisementMediaController.deleteMedia(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'You do not have permission to delete this media',
          statusCode: 403
        })
      );
    });

    it('should handle errors during deletion', async () => {
      const error = new Error('Database error');

      req.params = { id: 'mediaId123' };

      AdvertisementMedia.findById.mockReturnThis();
      AdvertisementMedia.populate.mockRejectedValue(error);

      await advertisementMediaController.deleteMedia(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('setAsPrimary', () => {
    it('should set media as primary successfully', async () => {
      const mockUser = { _id: 'userId123', role: 'user' };
      const mockMedia = {
        _id: 'mediaId123',
        advertisementId: { _id: 'adId123', ownerId: 'userId123' },
        isPrimary: false,
        save: jest.fn()
      };

      req.user = mockUser;
      req.params = { id: 'mediaId123' };

      AdvertisementMedia.findById.mockReturnThis();
      AdvertisementMedia.populate.mockResolvedValue(mockMedia);
      AdvertisementMedia.updateMany.mockResolvedValue({});

      await advertisementMediaController.setAsPrimary(req, res, next);

      expect(AdvertisementMedia.updateMany).toHaveBeenCalledWith(
        { advertisementId: 'adId123', isPrimary: true },
        { isPrimary: false }
      );
      expect(mockMedia.isPrimary).toBe(true);
      expect(mockMedia.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return error if user does not have permission', async () => {
      const mockUser = { _id: 'otherUserId', role: 'user' };
      const mockMedia = {
        _id: 'mediaId123',
        advertisementId: { _id: 'adId123', ownerId: 'userId123' }
      };

      req.user = mockUser;
      req.params = { id: 'mediaId123' };

      AdvertisementMedia.findById.mockReturnThis();
      AdvertisementMedia.populate.mockResolvedValue(mockMedia);

      await advertisementMediaController.setAsPrimary(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'You do not have permission to modify this media',
          statusCode: 403
        })
      );
    });
  });

  describe('getPrimaryMedia', () => {
    it('should return primary media for advertisement', async () => {
      const mockUser = { _id: 'userId123', role: 'user' };
      const mockAdvertisement = { _id: 'adId123', ownerId: 'userId123' };
      const mockPrimaryMedia = { _id: 'primaryMediaId', isPrimary: true };

      req.user = mockUser;
      req.params = { advertisementId: 'adId123' };

      Advertisement.findById.mockResolvedValue(mockAdvertisement);
      AdvertisementMedia.findOne.mockResolvedValue(mockPrimaryMedia);

      await advertisementMediaController.getPrimaryMedia(req, res, next);

      expect(AdvertisementMedia.findOne).toHaveBeenCalledWith({
        advertisementId: 'adId123',
        isPrimary: true
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockPrimaryMedia
      });
    });

    it('should return null if no primary media exists', async () => {
      const mockUser = { _id: 'userId123', role: 'user' };
      const mockAdvertisement = { _id: 'adId123', ownerId: 'userId123' };

      req.user = mockUser;
      req.params = { advertisementId: 'adId123' };

      Advertisement.findById.mockResolvedValue(mockAdvertisement);
      AdvertisementMedia.findOne.mockResolvedValue(null);

      await advertisementMediaController.getPrimaryMedia(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: null
      });
    });
  });
});