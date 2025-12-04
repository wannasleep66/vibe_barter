// tests/unit/services/SearchServiceAdvancedFiltering.test.js
const SearchService = require('../../../src/services/SearchService');
const Advertisement = require('../../../src/models/Advertisement');
const Tag = require('../../../src/models/Tag');
const { logger } = require('../../../src/logger/logger');

// Mock models and logger
jest.mock('../../../src/models/Advertisement');
jest.mock('../../../src/models/Tag');
jest.mock('../../../src/logger/logger');

describe('SearchService Advanced Filtering Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    logger.info = jest.fn();
    logger.error = jest.fn();
  });

  describe('searchAdvertisements with advanced filters', () => {
    it('should apply rating filters correctly', async () => {
      const mockAds = [{ _id: 'ad1', title: 'Test Ad', rating: { average: 4.5 } }];
      
      const mockQuery = {
        find: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockAds),
      };
      
      Advertisement.find = jest.fn(() => mockQuery);
      Advertisement.countDocuments = jest.fn().mockResolvedValue(1);

      const options = {
        minRating: '3',
        maxRating: '5',
        page: 1,
        limit: 10
      };

      await SearchService.searchAdvertisements('test', options);

      expect(Advertisement.find).toHaveBeenCalledWith(
        expect.objectContaining({
          'rating.average': { $gte: 3, $lte: 5 },
          isActive: true
        })
      );
    });

    it('should apply views filters correctly', async () => {
      const mockAds = [{ _id: 'ad1', title: 'Test Ad', views: 100 }];
      
      const mockQuery = {
        find: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockAds),
      };
      
      Advertisement.find = jest.fn(() => mockQuery);
      Advertisement.countDocuments = jest.fn().mockResolvedValue(1);

      const options = {
        minViews: '50',
        maxViews: '200',
        page: 1,
        limit: 10
      };

      await SearchService.searchAdvertisements('test', options);

      expect(Advertisement.find).toHaveBeenCalledWith(
        expect.objectContaining({
          views: { $gte: 50, $lte: 200 },
          isActive: true
        })
      );
    });

    it('should apply application count filters correctly', async () => {
      const mockAds = [{ _id: 'ad1', title: 'Test Ad', applicationCount: 10 }];
      
      const mockQuery = {
        find: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockAds),
      };
      
      Advertisement.find = jest.fn(() => mockQuery);
      Advertisement.countDocuments = jest.fn().mockResolvedValue(1);

      const options = {
        minApplications: '5',
        maxApplications: '15',
        page: 1,
        limit: 10
      };

      await SearchService.searchAdvertisements('test', options);

      expect(Advertisement.find).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationCount: { $gte: 5, $lte: 15 },
          isActive: true
        })
      );
    });

    it('should apply expiration date filters correctly', async () => {
      const mockAds = [{ _id: 'ad1', title: 'Test Ad', expiresAt: new Date() }];
      const expiresBefore = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 1 week from now
      const expiresAfter = new Date(Date.now() - 1000 * 60 * 60 * 24); // 1 day ago
      
      const mockQuery = {
        find: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockAds),
      };
      
      Advertisement.find = jest.fn(() => mockQuery);
      Advertisement.countDocuments = jest.fn().mockResolvedValue(1);

      const options = {
        expiresBefore: expiresBefore.toISOString(),
        expiresAfter: expiresAfter.toISOString(),
        page: 1,
        limit: 10
      };

      await SearchService.searchAdvertisements('test', options);

      expect(Advertisement.find).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresAt: { $lte: expect.any(Date), $gte: expect.any(Date) },
          isActive: true
        })
      );
    });

    it('should apply created date filters correctly', async () => {
      const mockAds = [{ _id: 'ad1', title: 'Test Ad', createdAt: new Date() }];
      const minCreatedAt = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2); // 2 days ago
      const maxCreatedAt = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
      
      const mockQuery = {
        find: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockAds),
      };
      
      Advertisement.find = jest.fn(() => mockQuery);
      Advertisement.countDocuments = jest.fn().mockResolvedValue(1);

      const options = {
        minCreatedAt: minCreatedAt.toISOString(),
        maxCreatedAt: maxCreatedAt.toISOString(),
        page: 1,
        limit: 10
      };

      await SearchService.searchAdvertisements('test', options);

      expect(Advertisement.find).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: { $gte: expect.any(Date), $lte: expect.any(Date) },
          isActive: true
        })
      );
    });

    it('should handle all filters combined', async () => {
      const mockAds = [{ _id: 'ad1', title: 'Test Ad' }];
      
      const mockQuery = {
        find: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockAds),
      };
      
      Advertisement.find = jest.fn(() => mockQuery);
      Advertisement.countDocuments = jest.fn().mockResolvedValue(1);

      const options = {
        minRating: '3',
        maxViews: '100',
        minApplications: '2',
        expiresAfter: new Date().toISOString(),
        page: 1,
        limit: 10,
        type: 'goods'
      };

      await SearchService.searchAdvertisements('test', options);

      const expectedFilter = {
        'rating.average': { $gte: 3 },
        views: { $lte: 100 },
        applicationCount: { $gte: 2 },
        expiresAt: { $gte: expect.any(Date) },
        type: 'goods',
        isActive: true
      };

      expect(Advertisement.find).toHaveBeenCalledWith(
        expect.objectContaining(expectedFilter)
      );
    });

    it('should handle filters without search query', async () => {
      const mockAds = [{ _id: 'ad1', title: 'Test Ad' }];
      
      const mockQuery = {
        find: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockAds),
      };
      
      Advertisement.find = jest.fn(() => mockQuery);
      Advertisement.countDocuments = jest.fn().mockResolvedValue(1);

      const options = {
        minRating: '4',
        maxRating: '5',
        page: 1,
        limit: 10
      };

      await SearchService.searchAdvertisements(null, options);

      expect(Advertisement.find).toHaveBeenCalledWith(
        expect.objectContaining({
          'rating.average': { $gte: 4, $lte: 5 },
          isActive: true
        })
      );
    });
  });

  describe('updateAdvertisementSearchVector', () => {
    it('should update search vector with all text fields including tags', async () => {
      const mockAdvertisement = {
        _id: 'ad123',
        title: 'Great Laptop',
        description: 'High performance laptop for gaming',
        exchangePreferences: 'Looking for desktop PC',
        location: 'New York',
        tags: [
          { name: 'electronics' },
          { name: 'computers' }
        ],
        save: jest.fn()
      };

      Advertisement.findById = jest.fn().mockReturnThis();
      Advertisement.populate = jest.fn().mockResolvedValue(mockAdvertisement);

      await SearchService.updateAdvertisementSearchVector('ad123');

      expect(Advertisement.findById).toHaveBeenCalledWith('ad123');
      expect(Advertisement.populate).toHaveBeenCalledWith('tags', 'name');
      // Check that the searchVector contains all relevant text
      expect(mockAdvertisement.searchVector).toContain('Great Laptop');
      expect(mockAdvertisement.searchVector).toContain('High performance laptop for gaming');
      expect(mockAdvertisement.searchVector).toContain('Looking for desktop PC');
      expect(mockAdvertisement.searchVector).toContain('New York');
      expect(mockAdvertisement.searchVector).toContain('electronics');
      expect(mockAdvertisement.searchVector).toContain('computers');
      expect(mockAdvertisement.save).toHaveBeenCalled();
    });

    it('should handle missing optional fields gracefully', async () => {
      const mockAdvertisement = {
        _id: 'ad123',
        title: 'Simple Title',
        tags: [],
        save: jest.fn()
      };

      Advertisement.findById = jest.fn().mockReturnThis();
      Advertisement.populate = jest.fn().mockResolvedValue(mockAdvertisement);

      await SearchService.updateAdvertisementSearchVector('ad123');

      expect(mockAdvertisement.searchVector).toContain('Simple Title');
      expect(mockAdvertisement.save).toHaveBeenCalled();
    });
  });
});