// tests/unit/services/SearchService.test.js
const SearchService = require('../../../src/services/SearchService');
const Advertisement = require('../../../src/models/Advertisement');
const Tag = require('../../../src/models/Tag');
const { logger } = require('../../../src/logger/logger');

// Mock models and logger
jest.mock('../../../src/models/Advertisement');
jest.mock('../../../src/models/Tag');
jest.mock('../../../src/logger/logger');

describe('SearchService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    logger.info = jest.fn();
    logger.error = jest.fn();
  });

  describe('updateAdvertisementSearchVector', () => {
    it('should update the search vector with text from various fields including tags', async () => {
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
      expect(mockAdvertisement.searchVector).toContain('Great Laptop');
      expect(mockAdvertisement.searchVector).toContain('High performance laptop for gaming');
      expect(mockAdvertisement.searchVector).toContain('Looking for desktop PC');
      expect(mockAdvertisement.searchVector).toContain('New York');
      expect(mockAdvertisement.searchVector).toContain('electronics');
      expect(mockAdvertisement.searchVector).toContain('computers');
      expect(mockAdvertisement.save).toHaveBeenCalled();
    });

    it('should handle advertisement without tags', async () => {
      const mockAdvertisement = {
        _id: 'ad123',
        title: 'Great Laptop',
        description: 'High performance laptop for gaming',
        exchangePreferences: 'Looking for desktop PC',
        location: 'New York',
        tags: [],
        save: jest.fn()
      };

      Advertisement.findById = jest.fn().mockReturnThis();
      Advertisement.populate = jest.fn().mockResolvedValue(mockAdvertisement);

      await SearchService.updateAdvertisementSearchVector('ad123');

      expect(mockAdvertisement.searchVector).toContain('Great Laptop');
      expect(mockAdvertisement.searchVector).toContain('High performance laptop for gaming');
      expect(mockAdvertisement.searchVector).toContain('Looking for desktop PC');
      expect(mockAdvertisement.searchVector).toContain('New York');
      expect(mockAdvertisement.searchVector).not.toContain(undefined);
      expect(mockAdvertisement.save).toHaveBeenCalled();
    });

    it('should handle missing fields gracefully', async () => {
      const mockAdvertisement = {
        _id: 'ad123',
        title: 'Great Laptop',
        tags: [],
        save: jest.fn()
      };

      Advertisement.findById = jest.fn().mockReturnThis();
      Advertisement.populate = jest.fn().mockResolvedValue(mockAdvertisement);

      await SearchService.updateAdvertisementSearchVector('ad123');

      expect(mockAdvertisement.searchVector).toContain('Great Laptop');
      expect(mockAdvertisement.save).toHaveBeenCalled();
    });

    it('should return error if advertisement is not found', async () => {
      Advertisement.findById = jest.fn().mockReturnThis();
      Advertisement.populate = jest.fn().mockResolvedValue(null);

      await expect(SearchService.updateAdvertisementSearchVector('nonexistent'))
        .rejects
        .toThrow('Advertisement not found');
    });

    it('should handle errors during search vector update', async () => {
      const error = new Error('Database error');
      Advertisement.findById = jest.fn().mockRejectedValue(error);

      await expect(SearchService.updateAdvertisementSearchVector('ad123'))
        .rejects
        .toThrow('Database error');

      expect(logger.error).toHaveBeenCalledWith('Error updating search vector for advertisement:', 'Database error');
    });
  });

  describe('searchAdvertisements', () => {
    it('should search advertisements with provided query and filters', async () => {
      const mockAds = [
        { _id: 'ad1', title: 'Laptop for sale', description: 'Good laptop' },
        { _id: 'ad2', title: 'Desktop computer', description: 'Powerful desktop' }
      ];

      const mockOptions = {
        page: 1,
        limit: 10,
        type: 'goods',
        categoryId: 'cat123',
        location: 'New York',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      // Mock the query building
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

      const result = await SearchService.searchAdvertisements('laptop', mockOptions);

      expect(Advertisement.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
          type: 'goods',
          categoryId: 'cat123',
          location: { $regex: 'New York', $options: 'i' },
          $or: expect.arrayContaining([
            { title: { $regex: /laptop/i } },
            { description: { $regex: /laptop/i } },
            { exchangePreferences: { $regex: /laptop/i } },
            { location: { $regex: /laptop/i } },
            { searchVector: { $regex: /laptop/i } }
          ])
        })
      );
      expect(result.advertisements).toEqual(mockAds);
      expect(result.pagination.total).toBe(2);
    });

    it('should handle search without additional filters', async () => {
      const mockAds = [
        { _id: 'ad1', title: 'Laptop for sale', description: 'Good laptop' }
      ];

      const mockOptions = {
        page: 1,
        limit: 10
      };

      Advertisement.find = jest.fn().mockReturnThis();
      Advertisement.populate = jest.fn().mockReturnThis();
      Advertisement.sort = jest.fn().mockReturnThis();
      Advertisement.skip = jest.fn().mockReturnThis();
      Advertisement.limit = jest.fn().mockResolvedValue(mockAds);
      Advertisement.countDocuments = jest.fn().mockResolvedValue(1);

      await SearchService.searchAdvertisements('laptop', mockOptions);

      expect(Advertisement.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
          $or: expect.arrayContaining([
            { title: { $regex: /laptop/i } },
            { description: { $regex: /laptop/i } },
            { exchangePreferences: { $regex: /laptop/i } },
            { location: { $regex: /laptop/i } },
            { searchVector: { $regex: /laptop/i } }
          ])
        })
      );
    });

    it('should handle search with no results', async () => {
      const mockOptions = {
        page: 1,
        limit: 10
      };

      Advertisement.find = jest.fn().mockReturnThis();
      Advertisement.populate = jest.fn().mockReturnThis();
      Advertisement.sort = jest.fn().mockReturnThis();
      Advertisement.skip = jest.fn().mockReturnThis();
      Advertisement.limit = jest.fn().mockResolvedValue([]);
      Advertisement.countDocuments = jest.fn().mockResolvedValue(0);

      const result = await SearchService.searchAdvertisements('nonexistent', mockOptions);

      expect(result.advertisements).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should handle errors during search', async () => {
      const mockOptions = {
        page: 1,
        limit: 10
      };
      const error = new Error('Database error');

      Advertisement.find = jest.fn().mockRejectedValue(error);

      await expect(SearchService.searchAdvertisements('laptop', mockOptions))
        .rejects
        .toThrow('Database error');

      expect(logger.error).toHaveBeenCalledWith('Error during enhanced advertisement search:', 'Database error');
    });
  });
});