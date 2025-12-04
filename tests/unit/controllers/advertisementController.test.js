// tests/unit/controllers/advertisementController.test.js
const advertisementController = require('../../../src/controllers/advertisementController');
const Advertisement = require('../../../src/models/Advertisement');
const Category = require('../../../src/models/Category');
const Tag = require('../../../src/models/Tag');
const Profile = require('../../../src/models/Profile');
const { logger } = require('../../../src/logger/logger');

// Mock the models
jest.mock('../../../src/models/Advertisement');
jest.mock('../../../src/models/Category');
jest.mock('../../../src/models/Tag');
jest.mock('../../../src/models/Profile');
jest.mock('../../../src/logger/logger');

describe('AdvertisementController Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: null, params: {}, query: {}, body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();

    jest.clearAllMocks();

    logger.info = jest.fn();
    logger.error = jest.fn();
  });

  describe('createAdvertisement', () => {
    it('should create advertisement successfully', async () => {
      const mockUser = { _id: 'userId123' };
      const mockCategory = { _id: 'categoryId123', name: 'Electronics' };
      const mockTag = { _id: 'tagId123', name: 'Used' };
      const mockProfile = { _id: 'profileId123', userId: 'userId123' };
      const mockAdvertisement = {
        _id: 'adId123',
        title: 'Test Ad',
        ownerId: 'userId123',
        categoryId: 'categoryId123',
        tags: ['tagId123'],
        profileId: 'profileId123'
      };

      req.user = mockUser;
      req.body = {
        title: 'Test Ad',
        description: 'Test description',
        categoryId: 'categoryId123',
        tags: ['tagId123'],
        type: 'goods',
        profileId: 'profileId123'
      };

      Category.findById.mockResolvedValue(mockCategory);
      Tag.find.mockResolvedValue([mockTag]);
      Profile.findById.mockResolvedValue(mockProfile);
      Advertisement.create.mockResolvedValue(mockAdvertisement);
      Advertisement.findById.mockReturnThis();
      Advertisement.populate.mockResolvedValue(mockAdvertisement);

      await advertisementController.createAdvertisement(req, res, next);

      expect(Advertisement.create).toHaveBeenCalledWith({
        title: 'Test Ad',
        description: 'Test description',
        ownerId: 'userId123',
        categoryId: 'categoryId123',
        tags: ['tagId123'],
        type: 'goods',
        profileId: 'profileId123'
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockAdvertisement,
        message: 'Advertisement created successfully'
      });
    });

    it('should return 404 if category does not exist', async () => {
      req.body = {
        title: 'Test Ad',
        description: 'Test description',
        categoryId: 'nonExistentId',
        type: 'goods'
      };

      Category.findById.mockResolvedValue(null);

      await advertisementController.createAdvertisement(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Category not found',
          statusCode: 404
        })
      );
    });

    it('should return 404 if profile does not belong to user', async () => {
      const mockUser = { _id: 'userId123' };
      const mockCategory = { _id: 'categoryId123', name: 'Electronics' };
      const mockProfile = { _id: 'profileId123', userId: 'differentUserId' };

      req.user = mockUser;
      req.body = {
        title: 'Test Ad',
        description: 'Test description',
        categoryId: 'categoryId123',
        type: 'goods',
        profileId: 'profileId123'
      };

      Category.findById.mockResolvedValue(mockCategory);
      Profile.findById.mockResolvedValue(mockProfile);

      await advertisementController.createAdvertisement(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'You do not own this profile',
          statusCode: 403
        })
      );
    });

    it('should handle validation errors', async () => {
      const error = new Error();
      error.name = 'ValidationError';
      error.errors = {
        title: { message: 'Title is required' }
      };

      req.body = { title: '', description: 'Test', type: 'goods' };

      Advertisement.create.mockRejectedValue(error);

      await advertisementController.createAdvertisement(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Validation Error'),
          statusCode: 400
        })
      );
    });
  });

  describe('getAllAdvertisements', () => {
    it('should return all advertisements with default filters', async () => {
      const mockAdvertisements = [
        { _id: 'ad1', title: 'Ad 1', isActive: true },
        { _id: 'ad2', title: 'Ad 2', isActive: true }
      ];

      req.query = {};

      Advertisement.find.mockReturnThis();
      Advertisement.populate.mockReturnThis();
      Advertisement.sort.mockReturnThis();
      Advertisement.skip.mockReturnThis();
      Advertisement.limit.mockResolvedValue(mockAdvertisements);
      Advertisement.countDocuments.mockResolvedValue(2);

      await advertisementController.getAllAdvertisements(req, res, next);

      expect(Advertisement.find).toHaveBeenCalledWith({ isActive: true });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockAdvertisements,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1,
          hasNext: false,
          hasPrev: false
        },
        filters: { isActive: 'true', sortBy: 'createdAt', sortOrder: 'desc' }
      });
    });

    it('should return advertisements with custom filters', async () => {
      const mockAdvertisements = [
        { _id: 'ad1', title: 'Ad 1', type: 'service', isActive: true }
      ];

      req.query = {
        type: 'service',
        page: '1',
        limit: '5',
        sortBy: 'title',
        sortOrder: 'asc'
      };

      Advertisement.find.mockReturnThis();
      Advertisement.populate.mockReturnThis();
      Advertisement.sort.mockReturnThis();
      Advertisement.skip.mockReturnThis();
      Advertisement.limit.mockResolvedValue(mockAdvertisements);
      Advertisement.countDocuments.mockResolvedValue(1);

      await advertisementController.getAllAdvertisements(req, res, next);

      expect(Advertisement.find).toHaveBeenCalledWith({ 
        isActive: true, 
        type: 'service' 
      });
      expect(Advertisement.sort).toHaveBeenCalledWith({ title: 1 });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle errors during fetching', async () => {
      const error = new Error('Database error');

      Advertisement.find.mockReturnThis();
      Advertisement.populate.mockReturnThis();
      Advertisement.sort.mockReturnThis();
      Advertisement.skip.mockReturnThis();
      Advertisement.limit.mockRejectedValue(error);

      await advertisementController.getAllAdvertisements(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getAdvertisementById', () => {
    it('should return advertisement by ID and increment view count', async () => {
      const mockAdvertisement = {
        _id: 'ad123',
        title: 'Test Ad',
        views: 5,
        save: jest.fn()
      };

      req.params = { id: 'ad123' };

      Advertisement.findById.mockReturnThis();
      Advertisement.populate.mockResolvedValue(mockAdvertisement);

      await advertisementController.getAdvertisementById(req, res, next);

      expect(Advertisement.findById).toHaveBeenCalledWith('ad123');
      expect(mockAdvertisement.views).toBe(6); // incremented
      expect(mockAdvertisement.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockAdvertisement
      });
    });

    it('should return 404 if advertisement not found', async () => {
      req.params = { id: 'nonExistentId' };

      Advertisement.findById.mockReturnThis();
      Advertisement.populate.mockResolvedValue(null);

      await advertisementController.getAdvertisementById(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Advertisement not found',
          statusCode: 404
        })
      );
    });

    it('should handle invalid ID format', async () => {
      const error = new Error();
      error.name = 'CastError';

      req.params = { id: 'invalidId' };

      Advertisement.findById.mockReturnThis();
      Advertisement.populate.mockRejectedValue(error);

      await advertisementController.getAdvertisementById(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid advertisement ID format',
          statusCode: 400
        })
      );
    });
  });

  describe('updateAdvertisement', () => {
    it('should update advertisement successfully', async () => {
      const mockUser = { _id: 'userId123' };
      const mockAdvertisement = {
        _id: 'ad123',
        title: 'Old Title',
        ownerId: 'userId123',
        save: jest.fn()
      };
      const mockCategory = { _id: 'categoryId123' };

      req.user = mockUser;
      req.params = { id: 'ad123' };
      req.body = { title: 'New Title', categoryId: 'categoryId123' };

      Advertisement.findById.mockResolvedValue(mockAdvertisement);
      Category.findById.mockResolvedValue(mockCategory);

      Advertisement.findById.mockReturnThis();
      Advertisement.populate.mockResolvedValue(mockAdvertisement);

      await advertisementController.updateAdvertisement(req, res, next);

      expect(mockAdvertisement.title).toBe('New Title');
      expect(mockAdvertisement.categoryId).toBe('categoryId123');
      expect(mockAdvertisement.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockAdvertisement,
        message: 'Advertisement updated successfully'
      });
    });

    it('should return 403 if user does not own the advertisement', async () => {
      const mockUser = { _id: 'differentUserId' };
      const mockAdvertisement = {
        _id: 'ad123',
        title: 'Old Title',
        ownerId: 'userId123'
      };

      req.user = mockUser;
      req.params = { id: 'ad123' };

      Advertisement.findById.mockResolvedValue(mockAdvertisement);

      await advertisementController.updateAdvertisement(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'You do not have permission to update this advertisement',
          statusCode: 403
        })
      );
    });

    it('should return 404 if advertisement not found', async () => {
      req.params = { id: 'nonExistentId' };

      Advertisement.findById.mockResolvedValue(null);

      await advertisementController.updateAdvertisement(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Advertisement not found',
          statusCode: 404
        })
      );
    });

    it('should handle validation errors', async () => {
      const mockUser = { _id: 'userId123' };
      const mockAdvertisement = {
        _id: 'ad123',
        title: 'Old Title',
        ownerId: 'userId123'
      };
      const error = new Error();
      error.name = 'ValidationError';
      error.errors = {
        title: { message: 'Title is too short' }
      };

      req.user = mockUser;
      req.params = { id: 'ad123' };
      req.body = { title: 'A' }; // Too short

      Advertisement.findById.mockResolvedValue(mockAdvertisement);
      Advertisement.mockImplementation(() => ({ save: jest.fn().mockRejectedValue(error) }));

      await advertisementController.updateAdvertisement(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Validation Error'),
          statusCode: 400
        })
      );
    });
  });

  describe('deleteAdvertisement', () => {
    it('should delete advertisement successfully', async () => {
      const mockUser = { _id: 'userId123' };
      const mockAdvertisement = {
        _id: 'ad123',
        ownerId: 'userId123'
      };

      req.user = mockUser;
      req.params = { id: 'ad123' };

      Advertisement.findById.mockResolvedValue(mockAdvertisement);
      Advertisement.findByIdAndDelete.mockResolvedValue(mockAdvertisement);

      await advertisementController.deleteAdvertisement(req, res, next);

      expect(Advertisement.findByIdAndDelete).toHaveBeenCalledWith('ad123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Advertisement deleted successfully'
      });
    });

    it('should return 403 if user does not own the advertisement', async () => {
      const mockUser = { _id: 'differentUserId' };
      const mockAdvertisement = {
        _id: 'ad123',
        ownerId: 'userId123'
      };

      req.user = mockUser;
      req.params = { id: 'ad123' };

      Advertisement.findById.mockResolvedValue(mockAdvertisement);

      await advertisementController.deleteAdvertisement(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'You do not have permission to delete this advertisement',
          statusCode: 403
        })
      );
    });

    it('should return 404 if advertisement not found', async () => {
      req.params = { id: 'nonExistentId' };

      Advertisement.findById.mockResolvedValue(null);

      await advertisementController.deleteAdvertisement(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Advertisement not found',
          statusCode: 404
        })
      );
    });
  });

  describe('archiveAdvertisement', () => {
    it('should archive advertisement successfully', async () => {
      const mockUser = { _id: 'userId123' };
      const mockAdvertisement = {
        _id: 'ad123',
        ownerId: 'userId123',
        isArchived: false,
        isActive: true,
        save: jest.fn()
      };

      req.user = mockUser;
      req.params = { id: 'ad123' };

      Advertisement.findById.mockResolvedValue(mockAdvertisement);

      await advertisementController.archiveAdvertisement(req, res, next);

      expect(mockAdvertisement.isArchived).toBe(true);
      expect(mockAdvertisement.isActive).toBe(false);
      expect(mockAdvertisement.archivedAt).toBeDefined();
      expect(mockAdvertisement.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockAdvertisement,
        message: 'Advertisement archived successfully'
      });
    });

    it('should return 403 if user does not own the advertisement', async () => {
      const mockUser = { _id: 'differentUserId' };
      const mockAdvertisement = {
        _id: 'ad123',
        ownerId: 'userId123'
      };

      req.user = mockUser;
      req.params = { id: 'ad123' };

      Advertisement.findById.mockResolvedValue(mockAdvertisement);

      await advertisementController.archiveAdvertisement(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'You do not have permission to archive this advertisement',
          statusCode: 403
        })
      );
    });
  });

  describe('getUserAdvertisements', () => {
    it('should return user advertisements', async () => {
      const mockUser = { _id: 'userId123' };
      const mockUserAds = [
        { _id: 'ad1', title: 'User Ad 1', ownerId: 'userId123' },
        { _id: 'ad2', title: 'User Ad 2', ownerId: 'userId123' }
      ];

      req.user = mockUser;
      req.query = {};

      Advertisement.find.mockReturnThis();
      Advertisement.populate.mockReturnThis();
      Advertisement.sort.mockReturnThis();
      Advertisement.skip.mockReturnThis();
      Advertisement.limit.mockResolvedValue(mockUserAds);
      Advertisement.countDocuments.mockResolvedValue(2);

      await advertisementController.getUserAdvertisements(req, res, next);

      expect(Advertisement.find).toHaveBeenCalledWith({ ownerId: 'userId123' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUserAds,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1,
          hasNext: false,
          hasPrev: false
        }
      });
    });

    it('should handle errors during fetching user advertisements', async () => {
      const mockUser = { _id: 'userId123' };
      const error = new Error('Database error');

      req.user = mockUser;

      Advertisement.find.mockRejectedValue(error);

      await advertisementController.getUserAdvertisements(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('activateAdvertisement', () => {
    it('should activate advertisement successfully', async () => {
      const mockUser = { _id: 'userId123' };
      const mockAdvertisement = {
        _id: 'ad123',
        title: 'Test Ad',
        ownerId: 'userId123',
        isArchived: true,
        archivedAt: new Date(),
        isActive: false,
        save: jest.fn()
      };

      req.user = mockUser;
      req.params = { id: 'ad123' };

      Advertisement.findById.mockResolvedValue(mockAdvertisement);

      await advertisementController.activateAdvertisement(req, res, next);

      expect(mockAdvertisement.isArchived).toBe(false);
      expect(mockAdvertisement.archivedAt).toBeUndefined();
      expect(mockAdvertisement.isActive).toBe(true);
      expect(mockAdvertisement.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockAdvertisement,
        message: 'Advertisement activated successfully'
      });
    });

    it('should return 403 if user does not own the advertisement', async () => {
      const mockUser = { _id: 'differentUserId' };
      const mockAdvertisement = {
        _id: 'ad123',
        title: 'Test Ad',
        ownerId: 'userId123',
        isArchived: true
      };

      req.user = mockUser;
      req.params = { id: 'ad123' };

      Advertisement.findById.mockResolvedValue(mockAdvertisement);

      await advertisementController.activateAdvertisement(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'You do not have permission to activate this advertisement',
          statusCode: 403
        })
      );
    });

    it('should return 404 if advertisement not found', async () => {
      req.params = { id: 'nonExistentId' };

      Advertisement.findById.mockResolvedValue(null);

      await advertisementController.activateAdvertisement(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Advertisement not found',
          statusCode: 404
        })
      );
    });

    it('should return 400 if advertisement is not archived', async () => {
      const mockUser = { _id: 'userId123' };
      const mockAdvertisement = {
        _id: 'ad123',
        title: 'Test Ad',
        ownerId: 'userId123',
        isArchived: false // Not archived
      };

      req.user = mockUser;
      req.params = { id: 'ad123' };

      Advertisement.findById.mockResolvedValue(mockAdvertisement);

      await advertisementController.activateAdvertisement(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Advertisement is not archived',
          statusCode: 400
        })
      );
    });

    it('should handle invalid ID format', async () => {
      const error = new Error();
      error.name = 'CastError';

      req.params = { id: 'invalidId' };

      Advertisement.findById.mockRejectedValue(error);

      await advertisementController.activateAdvertisement(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid advertisement ID format',
          statusCode: 400
        })
      );
    });
  });
});