// tests/unit/services/PortfolioFilterService.test.js
const Advertisement = require('../../../src/models/Advertisement');
const SearchService = require('../../../src/services/SearchService');
const { logger } = require('../../../src/logger/logger');

jest.mock('../../../src/models/Advertisement');
jest.mock('../../../src/logger/logger');

describe('Portfolio Filter Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    logger.error = jest.fn();
  });

  describe('searchAdvertisements with hasPortfolio filter', () => {
    it('should apply hasPortfolio=true filter correctly', async () => {
      const mockAds = [
        { 
          _id: 'ad1', 
          title: 'Ad with portfolio', 
          profileId: 'profile123',
          owner: { name: 'User 1' }
        }
      ];

      // Mock the aggregate call for hasPortfolio filtering
      Advertisement.aggregate = jest.fn()
        .mockResolvedValueOnce(mockAds) // For the main query
        .mockResolvedValueOnce([{ total: 1 }]); // For the count query
      
      Advertisement.countDocuments = jest.fn().mockResolvedValue(1);

      const result = await SearchService.searchAdvertisements(null, {
        hasPortfolio: 'true',
        page: 1,
        limit: 10
      });

      expect(Advertisement.aggregate).toHaveBeenCalledTimes(2); // Once for main query, once for count
      expect(result.advertisements).toEqual(mockAds);
      expect(result.pagination.total).toBe(1);
    });

    it('should apply hasPortfolio=false filter correctly', async () => {
      const mockAds = [
        { 
          _id: 'ad2', 
          title: 'Ad without portfolio', 
          profileId: 'profile456',
          owner: { name: 'User 2' }
        }
      ];

      // Mock the aggregate call for hasPortfolio filtering
      Advertisement.aggregate = jest.fn()
        .mockResolvedValueOnce(mockAds) // For the main query
        .mockResolvedValueOnce([{ total: 1 }]); // For the count query

      const result = await SearchService.searchAdvertisements(null, {
        hasPortfolio: 'false',
        page: 1,
        limit: 10
      });

      expect(Advertisement.aggregate).toHaveBeenCalledTimes(2); // Once for main query, once for count
      expect(result.advertisements).toEqual(mockAds);
      expect(result.pagination.total).toBe(1);
    });

    it('should use regular find when hasPortfolio is not specified', async () => {
      const mockAds = [
        { _id: 'ad1', title: 'Regular Ad 1' },
        { _id: 'ad2', title: 'Regular Ad 2' }
      ];

      // Mock the regular find method
      const mockQuery = {
        find: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockAds),
        exec: jest.fn().mockResolvedValue(mockAds)
      };
      
      Advertisement.find = jest.fn(() => mockQuery);
      Advertisement.countDocuments = jest.fn().mockResolvedValue(2);

      const result = await SearchService.searchAdvertisements(null, {
        page: 1,
        limit: 10
      });

      // Should use regular find instead of aggregate
      expect(Advertisement.find).toHaveBeenCalled();
      expect(Advertisement.aggregate).not.toHaveBeenCalled();
      expect(result.advertisements).toEqual(mockAds);
    });
  });

  describe('search with all filter combinations', () => {
    it('should work with hasPortfolio combined with other filters', async () => {
      const mockAds = [
        { _id: 'ad1', title: 'Filtered Ad', profileId: 'prof123' }
      ];

      // Mock the aggregate call
      Advertisement.aggregate = jest.fn()
        .mockResolvedValueOnce(mockAds) // For the main query
        .mockResolvedValueOnce([{ total: 1 }]); // For the count query

      const result = await SearchService.searchAdvertisements(null, {
        hasPortfolio: 'true',
        minRating: '3',
        maxViews: '100',
        location: 'New York',
        page: 1,
        limit: 10
      });

      expect(Advertisement.aggregate).toHaveBeenCalledTimes(2);
      expect(result.advertisements).toEqual(mockAds);
      expect(result.pagination.total).toBe(1);
    });
  });
});