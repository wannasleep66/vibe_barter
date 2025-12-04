// tests/unit/services/AdvertisementArchivalService.test.js
const AdvertisementArchivalService = require('../../../src/services/AdvertisementArchivalService');
const Advertisement = require('../../../src/models/Advertisement');
const { logger } = require('../../../src/logger/logger');

// Mock the models and logger
jest.mock('../../../src/models/Advertisement');
jest.mock('../../../src/logger/logger');

describe('AdvertisementArchivalService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default logger mock
    logger.info = jest.fn();
    logger.error = jest.fn();
  });

  describe('archiveExpiredAdvertisements', () => {
    it('should archive expired advertisements', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago

      const expiredAds = [
        {
          _id: 'ad1',
          title: 'Expired Ad 1',
          isArchived: false,
          isActive: true,
          expiresAt: pastDate,
          save: jest.fn().mockResolvedValue(true)
        }
      ];

      Advertisement.find = jest.fn().mockResolvedValue(expiredAds);

      const result = await AdvertisementArchivalService.archiveExpiredAdvertisements();

      expect(Advertisement.find).toHaveBeenCalledWith({
        isArchived: false,
        isActive: true,
        expiresAt: { $lt: expect.any(Date) }
      });
      
      expect(expiredAds[0].isArchived).toBe(true);
      expect(expiredAds[0].archivedAt).toBeDefined();
      expect(expiredAds[0].isActive).toBe(false);
      expect(expiredAds[0].save).toHaveBeenCalled();
      
      expect(logger.info).toHaveBeenCalledWith(`Archived expired advertisement with ID: ${expiredAds[0]._id}`);
      expect(result.archivedCount).toBe(1);
    });

    it('should handle case when no expired ads exist', async () => {
      Advertisement.find = jest.fn().mockResolvedValue([]);

      const result = await AdvertisementArchivalService.archiveExpiredAdvertisements();

      expect(result.archivedCount).toBe(0);
      expect(logger.info).toHaveBeenCalledWith('No expired advertisements to archive');
    });

    it('should handle errors during archival', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago

      const expiredAds = [
        {
          _id: 'ad1',
          title: 'Expired Ad 1',
          isArchived: false,
          isActive: true,
          expiresAt: pastDate,
          save: jest.fn().mockRejectedValue(new Error('Database error'))
        }
      ];

      Advertisement.find = jest.fn().mockResolvedValue(expiredAds);

      // We expect the function to handle the error internally and not throw
      await AdvertisementArchivalService.archiveExpiredAdvertisements();

      expect(logger.error).toHaveBeenCalledWith(
        `Error archiving advertisement ${expiredAds[0]._id}: Database error`
      );
    });

    it('should handle errors during finding expired ads', async () => {
      const error = new Error('Database connection error');
      Advertisement.find = jest.fn().mockRejectedValue(error);

      await expect(AdvertisementArchivalService.archiveExpiredAdvertisements())
        .rejects
        .toThrow('Error during expired advertisement archival');
    });
  });

  describe('activateAdvertisement', () => {
    it('should activate an archived advertisement successfully', async () => {
      const mockAd = {
        _id: 'ad123',
        title: 'Test Ad',
        ownerId: 'userId123',
        isArchived: true,
        archivedAt: new Date(),
        isActive: false,
        save: jest.fn().mockResolvedValue(true)
      };

      const mockUser = { _id: 'userId123' };

      Advertisement.findById = jest.fn().mockResolvedValue(mockAd);

      const result = await AdvertisementArchivalService.activateAdvertisement('ad123', mockUser);

      expect(result.isArchived).toBe(false);
      expect(result.archivedAt).toBeUndefined();
      expect(result.isActive).toBe(true);
      expect(result.save).toHaveBeenCalled();
    });

    it('should throw error if advertisement not found', async () => {
      Advertisement.findById = jest.fn().mockResolvedValue(null);

      await expect(AdvertisementArchivalService.activateAdvertisement('ad123', { _id: 'userId123' }))
        .rejects
        .toThrow('Advertisement not found');
    });

    it('should throw error if user does not own advertisement', async () => {
      const mockAd = {
        _id: 'ad123',
        ownerId: 'differentUserId',
        isArchived: true
      };

      Advertisement.findById = jest.fn().mockResolvedValue(mockAd);

      await expect(AdvertisementArchivalService.activateAdvertisement('ad123', { _id: 'userId123' }))
        .rejects
        .toThrow('You do not have permission to activate this advertisement');
    });

    it('should throw error if advertisement is not archived', async () => {
      const mockAd = {
        _id: 'ad123',
        ownerId: 'userId123',
        isArchived: false
      };

      Advertisement.findById = jest.fn().mockResolvedValue(mockAd);

      await expect(AdvertisementArchivalService.activateAdvertisement('ad123', { _id: 'userId123' }))
        .rejects
        .toThrow('Advertisement is not archived');
    });
  });

  describe('getAdvertisementsApproachingExpiry', () => {
    it('should return advertisements approaching expiry', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 12); // 12 hours from now

      const approachingExpiryAds = [
        {
          _id: 'ad1',
          title: 'Approaching Expiry Ad',
          expiresAt: futureDate
        }
      ];

      Advertisement.find = jest.fn().mockReturnThis();
      Advertisement.populate = jest.fn().mockResolvedValue(approachingExpiryAds);

      const result = await AdvertisementArchivalService.getAdvertisementsApproachingExpiry(24);

      expect(Advertisement.find).toHaveBeenCalledWith({
        isActive: true,
        isArchived: false,
        expiresAt: { $lt: expect.any(Date), $gte: expect.any(Date) }
      });
      expect(Advertisement.populate).toHaveBeenCalledTimes(2);
      expect(result).toEqual(approachingExpiryAds);
    });

    it('should handle errors during fetching approaching expiry ads', async () => {
      const error = new Error('Database error');
      Advertisement.find = jest.fn().mockReturnThis();
      Advertisement.populate.mockRejectedValue(error);

      await expect(AdvertisementArchivalService.getAdvertisementsApproachingExpiry(24))
        .rejects
        .toThrow('Error getting advertisements approaching expiry');
    });
  });

  describe('scheduleAutomaticArchival', () => {
    // Note: Testing intervals can be tricky, so we'll just ensure the method doesn't crash
    it('should schedule automatic archival without errors', () => {
      jest.useFakeTimers();
      
      const intervalId = AdvertisementArchivalService.scheduleAutomaticArchival(60);
      
      expect(intervalId).toBeDefined();
      expect(logger.info).toHaveBeenCalledWith('Automatic advertisement archival scheduled successfully');
      
      jest.useRealTimers();
    });
  });
});