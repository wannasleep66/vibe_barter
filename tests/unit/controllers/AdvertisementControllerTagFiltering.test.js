// tests/unit/controllers/advertisementControllerTagFiltering.test.js
const advertisementController = require('../../../src/controllers/advertisementController');
const Advertisement = require('../../../src/models/Advertisement');
const Tag = require('../../../src/models/Tag');
const Profile = require('../../../src/models/Profile');
const { logger } = require('../../../src/logger/logger');

// Mock models and logger
jest.mock('../../../src/models/Advertisement');
jest.mock('../../../src/models/Tag');
jest.mock('../../../src/models/Profile');
jest.mock('../../../src/logger/logger');

describe('AdvertisementController Tag Filtering Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = { query: {}, user: { _id: 'userId123' } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();

    jest.clearAllMocks();
    logger.info = jest.fn();
    logger.error = jest.fn();
  });

  describe('getAllAdvertisements with Tag Filters', () => {
    it('should apply single tag filter correctly', async () => {
      const mockAds = [{ _id: 'ad1', title: 'Test Ad', tags: ['tag1'] }];

      req.query = { tagId: 'tag1', page: 1, limit: 10 };

      const mockQuery = {
        find: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockAds)
      };
      
      Advertisement.find = jest.fn(() => mockQuery);
      Advertisement.countDocuments = jest.fn().mockResolvedValue(1);

      await advertisementController.getAllAdvertisements(req, res, next);

      expect(Advertisement.find).toHaveBeenCalledWith({
        isActive: true,
        tags: { $in: ['tag1'] }  // Should use $in with single tag
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should apply multiple tag filters with OR operator (default)', async () => {
      const mockAds = [
        { _id: 'ad1', title: 'Test Ad 1', tags: ['tag1'] },
        { _id: 'ad2', title: 'Test Ad 2', tags: ['tag2'] }
      ];

      req.query = { tagId: ['tag1', 'tag2'], page: 1, limit: 10 };

      const mockQuery = {
        find: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockAds)
      };
      
      Advertisement.find = jest.fn(() => mockQuery);
      Advertisement.countDocuments = jest.fn().mockResolvedValue(2);

      await advertisementController.getAllAdvertisements(req, res, next);

      expect(Advertisement.find).toHaveBeenCalledWith({
        isActive: true,
        tags: { $in: ['tag1', 'tag2'] }  // Should use $in for OR operation
      });
    });

    it('should apply multiple tag filters with AND operator', async () => {
      const mockAds = [{ _id: 'ad1', title: 'Test Ad', tags: ['tag1', 'tag2'] }];

      req.query = {
        tagId: ['tag1', 'tag2'],
        tagOperator: 'and',
        page: 1,
        limit: 10
      };

      const mockQuery = {
        find: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockAds)
      };
      
      Advertisement.find = jest.fn(() => mockQuery);
      Advertisement.countDocuments = jest.fn().mockResolvedValue(1);

      await advertisementController.getAllAdvertisements(req, res, next);

      expect(Advertisement.find).toHaveBeenCalledWith({
        isActive: true,
        tags: { $all: ['tag1', 'tag2'] }  // Should use $all for AND operation
      });
    });

    it('should combine tag filtering with other filters', async () => {
      const mockAds = [{ _id: 'ad1', title: 'Test Ad', tags: ['tag1'] }];

      req.query = {
        tagId: 'tag1',
        type: 'goods',
        location: 'New York',
        page: 1,
        limit: 10
      };

      const mockQuery = {
        find: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockAds)
      };
      
      Advertisement.find = jest.fn(() => mockQuery);
      Advertisement.countDocuments = jest.fn().mockResolvedValue(1);

      await advertisementController.getAllAdvertisements(req, res, next);

      expect(Advertisement.find).toHaveBeenCalledWith({
        isActive: true,
        tags: { $in: ['tag1'] },
        type: 'goods',
        location: { $regex: 'New York', $options: 'i' }
      });
    });

    it('should work with search functionality and tags', async () => {
      const mockSearchResult = {
        advertisements: [{ _id: 'ad1', title: 'Searched Ad', tags: ['tag1'] }],
        pagination: { total: 1, pages: 1, hasNext: false, hasPrev: false, page: 1, limit: 10 }
      };

      req.query = {
        search: 'test',
        tagId: 'tag1',
        page: 1,
        limit: 10
      };

      // Since search is used, it should call SearchService
      const SearchService = require('../../../src/services/SearchService');
      jest.spyOn(SearchService, 'searchAdvertisements').mockResolvedValue(mockSearchResult);

      await advertisementController.getAllAdvertisements(req, res, next);

      expect(SearchService.searchAdvertisements).toHaveBeenCalledWith('test', {
        page: 1,
        limit: 10,
        type: undefined,
        categoryId: undefined,
        tagId: 'tag1',  // Pass tagId to the search service
        location: undefined,
        isUrgent: undefined,
        isArchived: undefined,
        isActive: 'true',
        ownerId: undefined,
        profileId: undefined,
        minRating: undefined,
        maxRating: undefined,
        minViews: undefined,
        maxViews: undefined,
        minApplications: undefined,
        maxApplications: undefined,
        expiresBefore: undefined,
        expiresAfter: undefined,
        minCreatedAt: undefined,
        maxCreatedAt: undefined,
        hasPortfolio: undefined,
        longitude: undefined,
        latitude: undefined,
        maxDistance: undefined,
        tagOperator: undefined,  // Default would be 'or'
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
    });

    it('should handle error during advertisement retrieval', async () => {
      const error = new Error('Database error');
      req.query = { tagId: 'tag1', page: 1, limit: 10 };
      
      const mockQuery = {
        find: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockRejectedValue(error)
      };
      
      Advertisement.find = jest.fn(() => mockQuery);

      await advertisementController.getAllAdvertisements(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getPopularTags endpoint', () => {
    it('should return popular tags ordered by usage count', async () => {
      const mockTags = [
        { _id: 'tag1', name: 'Popular Tag', usageCount: 100 },
        { _id: 'tag2', name: 'Less Popular Tag', usageCount: 50 }
      ];

      req.query = { limit: 10 };

      Tag.find = jest.fn().mockReturnThis();
      Tag.sort = jest.fn().mockReturnThis();
      Tag.limit = jest.fn().mockResolvedValue(mockTags);

      await advertisementController.getPopularTags(req, res, next);

      expect(Tag.find).toHaveBeenCalledWith({ isActive: true });
      expect(Tag.sort).toHaveBeenCalledWith({ usageCount: -1, name: 1 });
      expect(Tag.limit).toHaveBeenCalledWith(10);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockTags,
          count: 2
        })
      );
    });

    it('should filter tags by search term', async () => {
      const mockTags = [
        { _id: 'tag1', name: 'Technology', usageCount: 80 }
      ];

      req.query = { search: 'tech', limit: 10 };

      Tag.find = jest.fn().mockReturnThis();
      Tag.sort = jest.fn().mockReturnThis();
      Tag.limit = jest.fn().mockResolvedValue(mockTags);

      await advertisementController.getPopularTags(req, res, next);

      expect(Tag.find).toHaveBeenCalledWith({
        isActive: true,
        name: { $regex: 'tech', $options: 'i' }
      });
    });

    it('should handle errors in getPopularTags', async () => {
      const error = new Error('Database error');
      req.query = { limit: 10 };

      Tag.find = jest.fn().mockRejectedValue(error);

      await advertisementController.getPopularTags(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('searchTags endpoint', () => {
    it('should search for tags by name', async () => {
      const mockTags = [
        { _id: 'tag1', name: 'Web Development', usageCount: 50 }
      ];

      req.query = { query: 'web', limit: 10 };

      Tag.find = jest.fn().mockReturnThis();
      Tag.sort = jest.fn().mockReturnThis();
      Tag.limit = jest.fn().mockResolvedValue(mockTags);

      await advertisementController.searchTags(req, res, next);

      expect(Tag.find).toHaveBeenCalledWith({
        name: { $regex: /web/i },
        isActive: true
      });
      expect(Tag.sort).toHaveBeenCalledWith({ usageCount: -1, name: 1 });
      expect(Tag.limit).toHaveBeenCalledWith(10);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockTags,
          count: 1,
          query: 'web'
        })
      );
    });

    it('should handle missing query parameter', async () => {
      req.query = { }; // No query parameter

      await advertisementController.searchTags(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Query parameter must be provided and at least 1 character long'
        })
      );
    });

    it('should handle short query parameter', async () => {
      req.query = { query: '' }; // Empty query

      await advertisementController.searchTags(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Query parameter must be provided and at least 1 character long'
        })
      );
    });

    it('should handle errors in searchTags', async () => {
      const error = new Error('Database error');
      req.query = { query: 'web', limit: 10 };

      Tag.find = jest.fn().mockRejectedValue(error);

      await advertisementController.searchTags(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});