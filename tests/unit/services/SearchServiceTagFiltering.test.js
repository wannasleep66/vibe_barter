// tests/unit/services/SearchServiceTagFiltering.test.js
const SearchService = require('../../../src/services/SearchService');
const Advertisement = require('../../../src/models/Advertisement');
const Tag = require('../../../src/models/Tag');
const { logger } = require('../../../src/logger/logger');

// Mock the models and logger
jest.mock('../../../src/models/Advertisement');
jest.mock('../../../src/models/Tag');
jest.mock('../../../src/logger/logger');

describe('SearchService Tag Filtering Tests', () => {
  let mockAds;

  beforeEach(() => {
    jest.clearAllMocks();

    logger.info = jest.fn();
    logger.error = jest.fn();

    mockAds = [
      { _id: 'ad1', title: 'Ad with Tag 1', tags: ['tag1'], ownerId: 'user1' },
      { _id: 'ad2', title: 'Ad with Tag 2', tags: ['tag2'], ownerId: 'user2' },
      { _id: 'ad3', title: 'Ad with Both Tags', tags: ['tag1', 'tag2'], ownerId: 'user3' }
    ];
  });

  describe('Tag Filtering in SearchService', () => {
    it('should filter by single tag ID', async () => {
      const mockQuery = {
        find: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockAds)
      };
      
      Advertisement.find = jest.fn(() => mockQuery);
      Advertisement.countDocuments = jest.fn().mockResolvedValue(3);

      const result = await SearchService.searchAdvertisements(null, {
        tagId: '507f1f77bcf86cd799439011',
        page: 1,
        limit: 10
      });

      expect(Advertisement.find).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: { $in: ['507f1f77bcf86cd799439011'] }
        })
      );
      expect(mockQuery.populate).toHaveBeenCalledTimes(1);
    });

    it('should filter by multiple tags with OR operator (default)', async () => {
      const mockQuery = {
        find: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockAds)
      };
      
      Advertisement.find = jest.fn(() => mockQuery);
      Advertisement.countDocuments = jest.fn().mockResolvedValue(3);

      const result = await SearchService.searchAdvertisements(null, {
        tagId: ['tag1', 'tag2'],
        page: 1,
        limit: 10
      });

      expect(Advertisement.find).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: { $in: ['tag1', 'tag2'] }
        })
      );
    });

    it('should filter by multiple tags with AND operator', async () => {
      const mockQuery = {
        find: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockAds)
      };
      
      Advertisement.find = jest.fn(() => mockQuery);
      Advertisement.countDocuments = jest.fn().mockResolvedValue(1);

      const result = await SearchService.searchAdvertisements(null, {
        tagId: ['tag1', 'tag2'],
        tagOperator: 'and',
        page: 1,
        limit: 10
      });

      expect(Advertisement.find).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: { $all: ['tag1', 'tag2'] }
        })
      );
    });

    it('should work with aggregation pipeline when combined with other filters', async () => {
      const mockAggregatedAds = [
        { _id: 'ad1', title: 'Test Ad', tags: ['tag1'] }
      ];

      const mockTag = { _id: 'tag1', name: 'Test Tag', isActive: true };
      Tag.findById = jest.fn().mockResolvedValue(mockTag);

      // Mock the aggregate function
      Advertisement.aggregate = jest.fn()
        .mockResolvedValueOnce(mockAggregatedAds) // For the main query
        .mockResolvedValueOnce([{ total: 1 }]); // For the count query
      
      const result = await SearchService.searchAdvertisements(null, {
        tagId: 'tag1',
        hasPortfolio: 'true', // Trigger aggregation pipeline
        page: 1,
        limit: 10
      });

      expect(Advertisement.aggregate).toHaveBeenCalledTimes(2);
    });

    it('should handle tag validation errors gracefully', async () => {
      const error = new Error('Database error');
      Advertisement.find = jest.fn(() => {
        throw error;
      });

      await expect(SearchService.searchAdvertisements(null, {
        tagId: 'invalid-id',
        page: 1,
        limit: 10
      })).rejects.toThrow('Database error');
    });
  });

  describe('Tag Filtering with Other Filters', () => {
    it('should combine tag filtering with category filtering', async () => {
      const mockQuery = {
        find: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockAds)
      };
      
      Advertisement.find = jest.fn(() => mockQuery);
      Advertisement.countDocuments = jest.fn().mockResolvedValue(2);

      const result = await SearchService.searchAdvertisements(null, {
        tagId: 'tag1',
        categoryId: 'cat1',
        page: 1,
        limit: 10
      });

      expect(Advertisement.find).toHaveBeenCalledWith({
        isActive: true,
        categoryId: 'cat1',
        tags: { $in: ['tag1'] }
      });
    });

    it('should combine multiple tag filters with other filters', async () => {
      const mockQuery = {
        find: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockAds)
      };
      
      Advertisement.find = jest.fn(() => mockQuery);
      Advertisement.countDocuments = jest.fn().mockResolvedValue(1);

      const result = await SearchService.searchAdvertisements(null, {
        tagId: ['tag1', 'tag2'],
        tagOperator: 'and',
        type: 'goods',
        location: 'New York',
        page: 1,
        limit: 10
      });

      expect(Advertisement.find).toHaveBeenCalledWith({
        isActive: true,
        type: 'goods',
        location: { $regex: 'New York', $options: 'i' },
        tags: { $all: ['tag1', 'tag2'] }  // $all for AND operator
      });
    });
  });

  describe('Empty and Invalid Tag Filtering', () => {
    it('should return all ads when no tag filter is provided', async () => {
      const mockQuery = {
        find: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockAds)
      };
      
      Advertisement.find = jest.fn(() => mockQuery);
      Advertisement.countDocuments = jest.fn().mockResolvedValue(10);

      const result = await SearchService.searchAdvertisements(null, {
        page: 1,
        limit: 10
      });

      expect(Advertisement.find).toHaveBeenCalledWith({
        isActive: true
      });
    });

    it('should handle empty tag array', async () => {
      const mockQuery = {
        find: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockAds)
      };
      
      Advertisement.find = jest.fn(() => mockQuery);
      Advertisement.countDocuments = jest.fn().mockResolvedValue(10);

      const result = await SearchService.searchAdvertisements(null, {
        tagId: [],
        page: 1,
        limit: 10
      });

      // When tagId is empty array, the filter shouldn't include tags
      expect(Advertisement.find).toHaveBeenCalledWith({
        isActive: true
      });
    });
  });
});