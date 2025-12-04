// src/services/AdvertisementArchivalService.js
const Advertisement = require('../models/Advertisement');
const { logger } = require('../logger/logger');
const AppError = require('../utils/AppError');

class AdvertisementArchivalService {
  /**
   * Archive expired advertisements
   */
  async archiveExpiredAdvertisements() {
    try {
      logger.info('Starting expired advertisement archival process...');
      
      // Find advertisements that have expired and are not yet archived
      const now = new Date();
      const expiredAds = await Advertisement.find({
        isArchived: false,
        isActive: true,
        expiresAt: { $lt: now }
      });

      if (expiredAds.length === 0) {
        logger.info('No expired advertisements to archive');
        return { archivedCount: 0, updatedAds: [] };
      }

      // Archive each expired advertisement
      const updatedAds = [];
      for (const ad of expiredAds) {
        try {
          ad.isArchived = true;
          ad.archivedAt = now;
          ad.isActive = false;
          await ad.save();
          updatedAds.push(ad._id);
          logger.info(`Archived expired advertisement with ID: ${ad._id}`);
        } catch (error) {
          logger.error(`Error archiving advertisement ${ad._id}: ${error.message}`);
        }
      }

      logger.info(`Successfully archived ${updatedAds.length} expired advertisements`);
      return {
        archivedCount: updatedAds.length,
        updatedAds: updatedAds
      };
    } catch (error) {
      logger.error('Error during expired advertisement archival:', error.message);
      throw new AppError('Error during expired advertisement archival', 500);
    }
  }

  /**
   * Schedule automatic archival process to run periodically
   */
  scheduleAutomaticArchival(intervalMinutes = 60) { // Default to running every hour
    logger.info(`Scheduling automatic advertisement archival to run every ${intervalMinutes} minutes`);
    
    // Run immediately first time
    this.archiveExpiredAdvertisements().catch(error => {
      logger.error('Initial automatic archival run failed:', error.message);
    });

    // Set up interval to run periodically
    const intervalMs = intervalMinutes * 60 * 1000;
    const intervalId = setInterval(async () => {
      try {
        await this.archiveExpiredAdvertisements();
      } catch (error) {
        logger.error('Scheduled automatic archival run failed:', error.message);
      }
    }, intervalMs);

    logger.info('Automatic advertisement archival scheduled successfully');
    return intervalId;
  }

  /**
   * Activate an archived advertisement
   */
  async activateAdvertisement(adId, userId) {
    try {
      const advertisement = await Advertisement.findById(adId);
      if (!advertisement) {
        throw new AppError('Advertisement not found', 404);
      }

      // Check if user owns the advertisement
      if (advertisement.ownerId.toString() !== userId.toString()) {
        throw new AppError('You do not have permission to activate this advertisement', 403);
      }

      if (!advertisement.isArchived) {
        throw new AppError('Advertisement is not archived', 400);
      }

      // Activate the advertisement
      advertisement.isArchived = false;
      advertisement.archivedAt = undefined;
      advertisement.isActive = true;

      // If the expiresAt date was in the past, set a new default expiration (e.g., 30 days from now)
      if (advertisement.expiresAt && advertisement.expiresAt < new Date()) {
        advertisement.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      }

      await advertisement.save();

      logger.info(`Advertisement ${adId} activated by user ${userId}`);
      return advertisement;
    } catch (error) {
      logger.error(`Error activating advertisement ${adId}:`, error.message);
      throw error;
    }
  }

  /**
   * Check if an advertisement is about to expire and needs notification
   */
  async getAdvertisementsApproachingExpiry(hoursBefore = 24) {
    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() + hoursBefore);

      const approachingExpiryAds = await Advertisement.find({
        isActive: true,
        isArchived: false,
        expiresAt: { $lt: cutoffTime, $gte: new Date() }
      })
      .populate('ownerId', 'firstName lastName email')
      .populate('categoryId', 'name');

      logger.info(`Found ${approachingExpiryAds.length} advertisements approaching expiry within ${hoursBefore} hours`);
      return approachingExpiryAds;
    } catch (error) {
      logger.error('Error getting advertisements approaching expiry:', error.message);
      throw new AppError('Error getting advertisements approaching expiry', 500);
    }
  }
}

module.exports = new AdvertisementArchivalService();