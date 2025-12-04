// tests/unit/controllers/advertisementControllerForSearch.test.js
const advertisementController = require('../../../src/controllers/advertisementController');
const Advertisement = require('../../../src/models/Advertisement');
const Category = require('../../../src/models/Category');
const Tag = require('../../../src/models/Tag');
const Profile = require('../../../src/models/Profile');
const SearchService = require('../../../src/services/SearchService'); // New import
const { logger } = require('../../../src/logger/logger');

// Mock all the models and services
jest.mock('../../../src/models/Advertisement');
jest.mock('../../../src/models/Category');
jest.mock('../../../src/models/Tag');
jest.mock('../../../src/models/Profile');
jest.mock('../../../src/services/SearchService');  // Mock the new service
jest.mock('../../../src/logger/logger');

describe('AdvertisementController Search Functionality Tests', () => {
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

  describe('getAllAdvertisements with search', () => {
    it('should call SearchService when search param is provided', async () => {
      const mockSearchResult = {
        advertisements: [
          { _id: 'ad1', title: 'Laptop for sale' },
          { _id: 'ad2', title: 'Computer gaming' }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1,
          hasNext: false,
          hasPrev: false
        }
      };

      req.query = { search: 'laptop', page: 1, limit: 10 };

      SearchService.searchAdvertisements.mockResolvedValue(mockSearchResult);

      await advertisementController.getAllAdvertisements(req, res, next);

      expect(SearchService.searchAdvertisements).toHaveBeenCalledWith('laptop', {
        page: 1,
        limit: 10,
        type: undefined,
        categoryId: undefined,
        tagId: undefined,
        location: undefined,
        isUrgent: undefined,
        isActive: 'true', // From default value
        sortBy: 'createdAt', // From default value
        sortOrder: 'desc' // From default value
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockSearchResult.advertisements,
        pagination: mockSearchResult.pagination,
        filters: { 
          search: 'laptop', 
          type: undefined, 
          categoryId: undefined, 
          tagId: undefined, 
          location: undefined, 
          isUrgent: undefined, 
          isActive: 'true', 
          sortBy: 'createdAt', 
          sortOrder: 'desc' 
        }
      });
    });

    it('should call traditional method when no search param is provided', async () => {
      const mockAds = [
        { _id: 'ad1', title: 'Regular Ad' },
        { _id: 'ad2', title: 'Another Ad' }
      ];

      req.query = { page: 1, limit: 10 }; // No search param

      const mockQuery = {
        find: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockAds)
      };
      
      // Mock the chain methods
      Advertisement.find = jest.fn(() => mockQuery);
      Advertisement.countDocuments = jest.fn().mockResolvedValue(2);

      await advertisementController.getAllAdvertisements(req, res, next);

      expect(SearchService.searchAdvertisements).not.toHaveBeenCalled();
      expect(Advertisement.find).toHaveBeenCalledWith({ isActive: true });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle errors from SearchService gracefully', async () => {
      req.query = { search: 'laptop' };
      const error = new Error('Search error');

      SearchService.searchAdvertisements.mockRejectedValue(error);

      await advertisementController.getAllAdvertisements(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('createAdvertisement with search vector update', () => {
    it('should create advertisement and update search vector', async () => {
      const mockUser = { _id: 'userId123' };
      const mockCategory = { _id: 'catId123' };
      const mockAdvertisement = {
        _id: 'adId123',
        title: 'Test Laptop',
        description: 'High performance laptop',
        ownerId: 'userId123',
        categoryId: 'catId123'
      };
      const mockPopulatedAd = { 
        ...mockAdvertisement,
        ownerId: { firstName: 'John', lastName: 'Doe' },
        categoryId: { name: 'Electronics' }
      };

      req.user = mockUser;
      req.body = {
        title: 'Test Laptop',
        description: 'High performance laptop',
        categoryId: 'catId123',
        type: 'goods'
      };

      Category.findById.mockResolvedValue(mockCategory);
      Advertisement.create.mockResolvedValue(mockAdvertisement);
      Advertisement.findById.mockReturnThis();
      Advertisement.populate.mockResolvedValue(mockPopulatedAd);
      SearchService.updateAdvertisementSearchVector.mockResolvedValue(mockAdvertisement);

      await advertisementController.createAdvertisement(req, res, next);

      expect(Advertisement.create).toHaveBeenCalledWith({
        title: 'Test Laptop',
        description: 'High performance laptop',
        ownerId: 'userId123',
        categoryId: 'catId123',
        type: 'goods'
      });
      expect(SearchService.updateAdvertisementSearchVector).toHaveBeenCalledWith('adId123');
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should handle errors during search vector update', async () => {
      const mockUser = { _id: 'userId123' };
      const mockCategory = { _id: 'catId123' };
      const mockAdvertisement = {
        _id: 'adId123',
        title: 'Test Laptop',
        description: 'High performance laptop',
        ownerId: 'userId123',
        categoryId: 'catId123'
      };

      req.user = mockUser;
      req.body = {
        title: 'Test Laptop',
        description: 'High performance laptop',
        categoryId: 'catId123',
        type: 'goods'
      };

      Category.findById.mockResolvedValue(mockCategory);
      Advertisement.create.mockResolvedValue(mockAdvertisement);
      SearchService.updateAdvertisementSearchVector.mockRejectedValue(new Error('DB error'));

      await advertisementController.createAdvertisement(req, res, next);

      expect(SearchService.updateAdvertisementSearchVector).toHaveBeenCalledWith('adId123');
      // The error should still be handled by the original error handling of createAdvertisement
      expect(logger.error).toHaveBeenCalledWith('Error creating advertisement:', 'DB error');
    });
  });

  describe('updateAdvertisement with search vector update', () => {
    it('should update advertisement and update search vector', async () => {
      const mockUser = { _id: 'userId123' };
      const mockAdvertisement = {
        _id: 'adId123',
        title: 'Old Title',
        ownerId: 'userId123',
        save: jest.fn()
      };

      req.user = mockUser;
      req.params = { id: 'adId123' };
      req.body = { title: 'New Title' };

      Advertisement.findById.mockResolvedValue(mockAdvertisement);
      SearchService.updateAdvertisementSearchVector.mockResolvedValue(mockAdvertisement);

      await advertisementController.updateAdvertisement(req, res, next);

      expect(mockAdvertisement.title).toBe('New Title');
      expect(mockAdvertisement.save).toHaveBeenCalled();
      expect(SearchService.updateAdvertisementSearchVector).toHaveBeenCalledWith('adId123');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle errors during search vector update after ad update', async () => {
      const mockUser = { _id: 'userId123' };
      const mockAdvertisement = {
        _id: 'adId123',
        title: 'Old Title',
        ownerId: 'userId123',
        save: jest.fn()
      };

      req.user = mockUser;
      req.params = { id: 'adId123' };
      req.body = { title: 'New Title' };

      Advertisement.findById.mockResolvedValue(mockAdvertisement);
      SearchService.updateAdvertisementSearchVector.mockRejectedValue(new Error('DB error'));

      await advertisementController.updateAdvertisement(req, res, next);

      // The update should still succeed, but search vector may fail separately
      expect(mockAdvertisement.title).toBe('New Title');
      expect(mockAdvertisement.save).toHaveBeenCalled();
      expect(SearchService.updateAdvertisementSearchVector).toHaveBeenCalledWith('adId123');
      // The error should be caught and logged but not interrupt the flow
      expect(logger.error).toHaveBeenCalledWith('Error updating advertisement:', 'DB error');
    });
  });
});