// tests/unit/controllers/advertisementControllerRatingFiltering.test.js
const advertisementController = require('../../../src/controllers/advertisementController');
const Advertisement = require('../../../src/models/Advertisement');
const Profile = require('../../../src/models/Profile');
const { logger } = require('../../../src/logger/logger');

// Mock all dependencies
jest.mock('../../../src/models/Advertisement');
jest.mock('../../../src/models/Profile');
jest.mock('../../../src/logger/logger');

describe('AdvertisementController Rating Filtering Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      query: {},
      user: { _id: 'userId123', role: 'user' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();

    jest.clearAllMocks();

    logger.info = jest.fn();
    logger.error = jest.fn();
  });

  describe('getAllAdvertisements with Rating Filters', () => {
    it('should apply advertisement rating filters', async () => {
      const mockAds = [
        { _id: 'ad1', title: 'High Rated Ad', rating: { average: 4.8 } },
        { _id: 'ad2', title: 'Medium Rated Ad', rating: { average: 3.5 } }
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
        limit: jest.fn().mockResolvedValue(mockAds)
      };
      
      Advertisement.find = jest.fn(() => mockQuery);
      Advertisement.countDocuments = jest.fn().mockResolvedValue(2);

      await advertisementController.getAllAdvertisements(req, res, next);

      expect(Advertisement.find).toHaveBeenCalledWith({
        isActive: true,
        'rating.average': { $gte: 3, $lte: 5 }
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should apply only minimum advertisement rating filter', async () => {
      const mockAds = [{ _id: 'ad1', title: 'High Rated Ad', rating: { average: 4.2 } }];

      req.query = {
        minRating: '4',
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
        'rating.average': { $gte: 4 }
      });
    });

    it('should apply only maximum advertisement rating filter', async () => {
      const mockAds = [{ _id: 'ad1', title: 'Low Rated Ad', rating: { average: 2.5 } }];

      req.query = {
        maxRating: '3',
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
        'rating.average': { $lte: 3 }
      });
    });

    it('should handle author rating filter with aggregation pipeline', async () => {
      const mockAds = [
        { _id: 'ad1', title: 'Ad by High Rated Author', ownerId: 'user1' }
      ];

      req.query = {
        minAuthorRating: '4',
        page: 1,
        limit: 10
      };

      // Mock the aggregation pipeline that's used for author rating filtering
      Advertisement.aggregate = jest.fn().mockResolvedValue([
        {
          _id: 'ad1',
          title: 'Ad by High Rated Author',
          ownerId: { _id: 'user1' },
          ownerProfile: [{ rating: { average: 4.8, count: 15 } }]
        }
      ]);

      await advertisementController.getAllAdvertisements(req, res, next);

      // Verify that aggregation was used for author rating filtering
      expect(Advertisement.aggregate).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should apply maximum author rating filter', async () => {
      const mockAds = [
        { _id: 'ad1', title: 'Ad by Lower Rated Author', ownerId: 'user2' }
      ];

      req.query = {
        maxAuthorRating: '3',
        page: 1,
        limit: 10
      };

      // Mock the aggregation pipeline
      Advertisement.aggregate = jest
        .fn()
        .mockResolvedValueOnce(mockAds) // For main query
        .mockResolvedValueOnce([{ total: 1 }]); // For count query

      await advertisementController.getAllAdvertisements(req, res, next);

      expect(Advertisement.aggregate).toHaveBeenCalledTimes(2);
    });

    it('should combine advertisement and author rating filters', async () => {
      const mockAds = [
        { 
          _id: 'ad1', 
          title: 'High Rated Ad by High Rated Author',
          rating: { average: 4.5 },
          ownerId: 'user1'
        }
      ];

      req.query = {
        minRating: '4',
        minAuthorRating: '4.5',
        page: 1,
        limit: 10
      };

      // Mock aggregation for complex filtering
      Advertisement.aggregate = jest
        .fn()
        .mockResolvedValueOnce(mockAds) // For main query
        .mockResolvedValueOnce([{ total: 1 }]); // For count query

      await advertisementController.getAllAdvertisements(req, res, next);

      expect(Advertisement.aggregate).toHaveBeenCalledTimes(2);
    });

    it('should work with other filters alongside rating filters', async () => {
      const mockAds = [
        { _id: 'ad1', title: 'High Rated Service', type: 'service', rating: { average: 4.7 } }
      ];

      req.query = {
        minRating: '4',
        type: 'service',
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
        type: 'service',
        'rating.average': { $gte: 4 }
      });
    });

    it('should return empty array when no ads match rating criteria', async () => {
      req.query = {
        minRating: '5', // Very high threshold
        page: 1,
        limit: 10
      };

      const mockQuery = {
        find: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      };
      
      Advertisement.find = jest.fn(() => mockQuery);
      Advertisement.countDocuments = jest.fn().mockResolvedValue(0);

      await advertisementController.getAllAdvertisements(req, res, next);

      expect(Advertisement.find).toHaveBeenCalledWith({
        isActive: true,
        'rating.average': { $gte: 5 }
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [],
          pagination: expect.objectContaining({
            total: 0
          })
        })
      );
    });

    it('should handle invalid rating values in query', async () => {
      const error = new Error('Invalid values');
      req.query = {
        minRating: 'invalid', // Not a number
        page: 1,
        limit: 10
      };

      const mockQuery = {
        find: jest.fn().mockImplementation(() => {
          throw error;
        })
      };
      
      Advertisement.find = jest.fn(() => mockQuery);

      await advertisementController.getAllAdvertisements(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should work with pagination parameters', async () => {
      const mockAds = [
        { _id: 'ad1', title: 'Rated Ad 1', rating: { average: 4.2 } },
        { _id: 'ad2', title: 'Rated Ad 2', rating: { average: 3.8 } }
      ];

      req.query = {
        minRating: '3',
        page: 2,
        limit: 5
      };

      const mockQuery = {
        find: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockAds)
      };
      
      Advertisement.find = jest.fn(() => mockQuery);
      Advertisement.countDocuments = jest.fn().mockResolvedValue(10);

      await advertisementController.getAllAdvertisements(req, res, next);

      expect(Advertisement.find).toHaveBeenCalledWith({
        isActive: true,
        'rating.average': { $gte: 3 }
      });
      expect(mockQuery.skip).toHaveBeenCalledWith((2 - 1) * 5); // Page 2, limit 5
      expect(mockQuery.limit).toHaveBeenCalledWith(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors during rating filtering', async () => {
      const error = new Error('Database connection error');
      req.query = { minRating: '4', page: 1, limit: 10 };
      
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

    it('should handle errors during author rating aggregation', async () => {
      const error = new Error('Aggregation pipeline error');
      req.query = { minAuthorRating: '4', page: 1, limit: 10 };

      Advertisement.aggregate = jest.fn().mockRejectedValue(error);

      await advertisementController.getAllAdvertisements(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});