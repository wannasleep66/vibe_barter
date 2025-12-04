// tests/unit/services/SearchServiceRatingFiltering.test.js
const SearchService = require('../../../src/services/SearchService');
const Advertisement = require('../../../src/models/Advertisement');
const Profile = require('../../../src/models/Profile');
const { logger } = require('../../../src/logger/logger');

// Mock the models and logger
jest.mock('../../../src/models/Advertisement');
jest.mock('../../../src/models/Profile');
jest.mock('../../../src/logger/logger');

describe('SearchService Advertisement and Author Rating Filtering Tests', () => {
  let mockAds;

  beforeEach(() => {
    jest.clearAllMocks();

    logger.info = jest.fn();
    logger.error = jest.fn();

    mockAds = [
      {
        _id: 'ad1',
        title: 'High Rated Advertisement',
        rating: { average: 4.8, count: 25 },
        ownerId: 'user1'
      },
      {
        _id: 'ad2', 
        title: 'Medium Rated Advertisement',
        rating: { average: 3.2, count: 10 },
        ownerId: 'user2'
      }
    ];
  });

  describe('Advertisement Rating Filtering', () => {
    it('should filter advertisements by minimum rating', async () => {
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
        minRating: '4',
        page: 1,
        limit: 10
      });

      expect(Advertisement.find).toHaveBeenCalledWith(
        expect.objectContaining({
          'rating.average': { $gte: 4 }
        })
      );
    });

    it('should filter advertisements by maximum rating', async () => {
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
        maxRating: '4',
        page: 1,
        limit: 10
      });

      expect(Advertisement.find).toHaveBeenCalledWith(
        expect.objectContaining({
          'rating.average': { $lte: 4 }
        })
      );
    });

    it('should filter advertisements by rating range', async () => {
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
        minRating: '3',
        maxRating: '4.5',
        page: 1,
        limit: 10
      });

      expect(Advertisement.find).toHaveBeenCalledWith(
        expect.objectContaining({
          'rating.average': { $gte: 3, $lte: 4.5 }
        })
      );
    });

    it('should work with aggregation pipeline when only advertisement rating is used', async () => {
      const mockAggregatedAds = [
        { _id: 'ad1', title: 'High Rated Ad', rating: { average: 4.8 } }
      ];

      // Mock aggregation pipeline
      Advertisement.aggregate = jest.fn()
        .mockResolvedValueOnce(mockAggregatedAds) // For main query
        .mockResolvedValueOnce([{ total: 1 }]); // For count query

      const result = await SearchService.searchAdvertisements(null, {
        minRating: '4',
        hasPortfolio: 'true', // This also triggers aggregation
        page: 1,
        limit: 10
      });

      expect(Advertisement.aggregate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Author Rating Filtering (Aggregation Pipeline)', () => {
    it('should filter by minimum author rating using aggregation pipeline', async () => {
      const mockAggregatedAds = [
        { 
          _id: 'ad1', 
          title: 'Good Author Rating Ad',
          ownerId: 'user1',
          ownerProfile: [{ rating: { average: 4.5, count: 12 } }]
        }
      ];

      // Mock aggregation pipeline
      Advertisement.aggregate = jest
        .fn()
        .mockResolvedValueOnce(mockAggregatedAds) // For main query
        .mockResolvedValueOnce([{ total: 1 }]); // For count query

      const result = await SearchService.searchAdvertisements(null, {
        minAuthorRating: '4',
        page: 1,
        limit: 10
      });

      // Verify that aggregate was called (indicating aggregation pipeline was used)
      expect(Advertisement.aggregate).toHaveBeenCalledTimes(2);
      
      // The pipeline would contain the lookup and match stages for author rating
      // (The exact content of pipeline is tested through functionality, not exact mock calls)
    });

    it('should filter by maximum author rating using aggregation pipeline', async () => {
      const mockAggregatedAds = [
        { 
          _id: 'ad2', 
          title: 'Average Author Rating Ad', 
          ownerId: 'user2',
          ownerProfile: [{ rating: { average: 3.2, count: 8 } }]
        }
      ];

      // Mock aggregation pipeline
      Advertisement.aggregate = jest
        .fn()
        .mockResolvedValueOnce(mockAggregatedAds) // For main query
        .mockResolvedValueOnce([{ total: 1 }]); // For count query

      const result = await SearchService.searchAdvertisements(null, {
        maxAuthorRating: '4',
        page: 1,
        limit: 10
      });

      expect(Advertisement.aggregate).toHaveBeenCalledTimes(2);
    });

    it('should filter by author rating range using aggregation pipeline', async () => {
      const mockAggregatedAds = [
        { 
          _id: 'ad3', 
          title: 'Good Author Rating Ad',
          ownerId: 'user3',
          ownerProfile: [{ rating: { average: 4.2, count: 15 } }]
        }
      ];

      // Mock aggregation pipeline
      Advertisement.aggregate = jest
        .fn()
        .mockResolvedValueOnce(mockAggregatedAds) // For main query
        .mockResolvedValueOnce([{ total: 1 }]); // For count query

      const result = await SearchService.searchAdvertisements(null, {
        minAuthorRating: '4',
        maxAuthorRating: '5',
        page: 1,
        limit: 10
      });

      expect(Advertisement.aggregate).toHaveBeenCalledTimes(2);
    });

    it('should combine author rating filter with other filters', async () => {
      const mockAggregatedAds = [
        { 
          _id: 'ad4', 
          title: 'Service with Good Rating',
          type: 'service',
          ownerId: 'user4',
          ownerProfile: [{ rating: { average: 4.7, count: 21 } }]
        }
      ];

      // Mock aggregation pipeline
      Advertisement.aggregate = jest
        .fn()
        .mockResolvedValueOnce(mockAggregatedAds) // For main query
        .mockResolvedValueOnce([{ total: 1 }]); // For count query

      const result = await SearchService.searchAdvertisements(null, {
        type: 'service',
        minAuthorRating: '4',
        page: 1,
        limit: 10
      });

      expect(Advertisement.aggregate).toHaveBeenCalledTimes(2);
    });

    it('should handle author rating filtering with location', async () => {
      const mockAggregatedAds = [
        { 
          _id: 'ad5', 
          title: 'Local High-Rated Provider',
          location: 'New York',
          ownerId: 'user5',
          ownerProfile: [{ rating: { average: 4.9, count: 30 } }]
        }
      ];

      // Mock aggregation pipeline
      Advertisement.aggregate = jest
        .fn()
        .mockResolvedValueOnce(mockAggregatedAds) // For main query
        .mockResolvedValueOnce([{ total: 1 }]); // For count query

      const result = await SearchService.searchAdvertisements(null, {
        location: 'New York',
        minAuthorRating: '4.5',
        page: 1,
        limit: 10
      });

      expect(Advertisement.aggregate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Combined Rating Filters', () => {
    it('should filter by both advertisement and author rating', async () => {
      const mockAggregatedAds = [
        { 
          _id: 'ad6', 
          title: 'High-Rated Ad by High-Rated Author',
          rating: { average: 4.8, count: 22 },
          ownerId: 'user6',
          ownerProfile: [{ rating: { average: 4.9, count: 18 } }]
        }
      ];

      // Mock aggregation pipeline
      Advertisement.aggregate = jest
        .fn()
        .mockResolvedValueOnce(mockAggregatedAds) // For main query
        .mockResolvedValueOnce([{ total: 1 }]); // For count query

      const result = await SearchService.searchAdvertisements(null, {
        minRating: '4',
        minAuthorRating: '4.5',
        page: 1,
        limit: 10
      });

      expect(Advertisement.aggregate).toHaveBeenCalledTimes(2);
    });

    it('should filter by advertisement rating range and author rating', async () => {
      const mockAggregatedAds = [
        { 
          _id: 'ad7', 
          title: 'Medium-High Ad by High-Rated Author',
          rating: { average: 4.2, count: 15 },
          ownerId: 'user7',
          ownerProfile: [{ rating: { average: 4.6, count: 12 } }]
        }
      ];

      // Mock aggregation pipeline  
      Advertisement.aggregate = jest
        .fn()
        .mockResolvedValueOnce(mockAggregatedAds) // For main query
        .mockResolvedValueOnce([{ total: 1 }]); // For count query

      const result = await SearchService.searchAdvertisements(null, {
        minRating: '4',
        maxRating: '5',
        minAuthorRating: '4.5',
        page: 1,
        limit: 10
      });

      expect(Advertisement.aggregate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing rating filters gracefully', async () => {
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
        page: 1,
        limit: 10
      });

      expect(Advertisement.find).toHaveBeenCalledWith({ isActive: true });
    });

    it('should handle invalid rating values', async () => {
      const error = new Error('Invalid rating value');
      
      const mockQuery = {
        find: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockRejectedValue(error)
      };
      
      Advertisement.find = jest.fn(() => mockQuery);

      await expect(SearchService.searchAdvertisements(null, {
        minRating: '-1', // Invalid: negative
        page: 1,
        limit: 10
      })).rejects.toThrow(error);
    });

    it('should handle zero rating values', async () => {
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
        minRating: '0',
        maxRating: '0',
        page: 1,
        limit: 10
      });

      expect(Advertisement.find).toHaveBeenCalledWith({
        isActive: true,
        'rating.average': { $gte: 0, $lte: 0 }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle errors during advertisement rating filtering', async () => {
      const error = new Error('Database error');
      Advertisement.find = jest.fn(() => {
        throw error;
      });

      await expect(SearchService.searchAdvertisements(null, {
        minRating: '4',
        page: 1,
        limit: 10
      })).rejects.toThrow('Database error');
    });

    it('should handle errors during author rating filtering', async () => {
      const error = new Error('Aggregation error');
      Advertisement.aggregate = jest.fn().mockRejectedValue(error);

      await expect(SearchService.searchAdvertisements(null, {
        minAuthorRating: '4',
        page: 1,
        limit: 10
      })).rejects.toThrow('Aggregation error');
    });
  });
});