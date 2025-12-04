// tests/unit/controllers/AdvertisementControllerAdvancedFiltering.test.js
const advertisementController = require('../../../src/controllers/advertisementController');
const Advertisement = require('../../../src/models/Advertisement');
const SearchService = require('../../../src/services/SearchService');
const { logger } = require('../../../src/logger/logger');

// Mock all dependencies
jest.mock('../../../src/models/Advertisement');
jest.mock('../../../src/services/SearchService');
jest.mock('../../../src/logger/logger');

describe('AdvertisementController Advanced Filtering Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = { query: {}, user: null };
    res = {
      status: jest.fn(() => res),
      json: jest.fn()
    };
    next = jest.fn();

    jest.clearAllMocks();

    logger.info = jest.fn();
    logger.error = jest.fn();
  });

  describe('getAllAdvertisements with advanced filters', () => {
    it('should apply rating filters when provided', async () => {
      const mockAds = [
        { _id: 'ad1', title: 'Test Ad 1', rating: { average: 4.2 } },
        { _id: 'ad2', title: 'Test Ad 2', rating: { average: 3.8 } }
      ];

      req.query = {
        minRating: '3',
        maxRating: '5',
        page: 1,
        limit: 10
      };

      const mockQuery = {
        find: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockAds),
      };
      
      Advertisement.find = jest.fn(() => mockQuery);
      Advertisement.countDocuments = jest.fn().mockResolvedValue(2);

      await advertisementController.getAllAdvertisements(req, res, next);

      expect(Advertisement.find).toHaveBeenCalledWith(
        expect.objectContaining({
          'rating.average': { $gte: 3, $lte: 5 },
          isActive: true
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: mockAds,
          filters: expect.objectContaining({
            minRating: '3',
            maxRating: '5'
          })
        })
      );
    });

    it('should apply views filters when provided', async () => {
      const mockAds = [
        { _id: 'ad1', title: 'Test Ad', views: 100 }
      ];

      req.query = {
        minViews: '50',
        maxViews: '200',
        page: 1,
        limit: 10
      };

      const mockQuery = {
        find: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockAds),
      };
      
      Advertisement.find = jest.fn(() => mockQuery);
      Advertisement.countDocuments = jest.fn().mockResolvedValue(1);

      await advertisementController.getAllAdvertisements(req, res, next);

      expect(Advertisement.find).toHaveBeenCalledWith(
        expect.objectContaining({
          views: { $gte: 50, $lte: 200 },
          isActive: true
        })
      );
    });

    it('should apply application count filters when provided', async () => {
      const mockAds = [
        { _id: 'ad1', title: 'Test Ad', applicationCount: 10 }
      ];

      req.query = {
        minApplications: '5',
        maxApplications: '15',
        page: 1,
        limit: 10
      };

      const mockQuery = {
        find: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockAds),
      };
      
      Advertisement.find = jest.fn(() => mockQuery);
      Advertisement.countDocuments = jest.fn().mockResolvedValue(1);

      await advertisementController.getAllAdvertisements(req, res, next);

      expect(Advertisement.find).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationCount: { $gte: 5, $lte: 15 },
          isActive: true
        })
      );
    });

    it('should apply expiration date filters when provided', async () => {
      const mockAds = [
        { _id: 'ad1', title: 'Test Ad', expiresAt: new Date() }
      ];
      const dateBefore = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(); // 1 week from now
      const dateAfter = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(); // 1 day ago

      req.query = {
        expiresBefore: dateBefore,
        expiresAfter: dateAfter,
        page: 1,
        limit: 10
      };

      const mockQuery = {
        find: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockAds),
      };
      
      Advertisement.find = jest.fn(() => mockQuery);
      Advertisement.countDocuments = jest.fn().mockResolvedValue(1);

      await advertisementController.getAllAdvertisements(req, res, next);

      expect(Advertisement.find).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresAt: { $lte: expect.any(Date), $gte: expect.any(Date) },
          isActive: true
        })
      );
    });

    it('should apply all filters in combination', async () => {
      const mockAds = [
        { _id: 'ad1', title: 'Test Ad' }
      ];

      req.query = {
        type: 'goods',
        minRating: '3',
        maxViews: '100',
        minApplications: '2',
        location: 'New York',
        page: 1,
        limit: 10
      };

      const mockQuery = {
        find: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockAds),
      };
      
      Advertisement.find = jest.fn(() => mockQuery);
      Advertisement.countDocuments = jest.fn().mockResolvedValue(1);

      await advertisementController.getAllAdvertisements(req, res, next);

      const expectedFilter = {
        type: 'goods',
        'rating.average': { $gte: 3 },
        views: { $lte: 100 },
        applicationCount: { $gte: 2 },
        location: { $regex: 'New York', $options: 'i' },
        isActive: true
      };

      expect(Advertisement.find).toHaveBeenCalledWith(
        expect.objectContaining(expectedFilter)
      );
    });

    it('should call SearchService when search query is provided along with filters', async () => {
      const mockSearchResult = {
        advertisements: [
          { _id: 'ad1', title: 'Search Result' }
        ],
        pagination: {
          total: 1,
          pages: 1,
          hasNext: false,
          hasPrev: false,
          page: 1,
          limit: 10
        }
      };

      req.query = {
        search: 'laptop',
        minRating: '4',
        maxViews: '50',
        page: 1,
        limit: 10
      };

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
        isArchived: undefined,
        isActive: 'true',
        ownerId: undefined,
        profileId: undefined,
        minRating: '4',
        maxRating: undefined,
        minViews: undefined,
        maxViews: '50',
        minApplications: undefined,
        maxApplications: undefined,
        expiresBefore: undefined,
        expiresAfter: undefined,
        minCreatedAt: undefined,
        maxCreatedAt: undefined,
        longitude: undefined,
        latitude: undefined,
        maxDistance: undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: mockSearchResult.advertisements,
          pagination: mockSearchResult.pagination
        })
      );
    });

    it('should handle errors during advertisement retrieval', async () => {
      const error = new Error('Database error');
      
      req.query = { minRating: '3', page: 1, limit: 10 };

      const mockQuery = {
        find: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockRejectedValue(error),
      };
      
      Advertisement.find = jest.fn(() => mockQuery);
      Advertisement.countDocuments = jest.fn().mockResolvedValue(0);

      await advertisementController.getAllAdvertisements(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});