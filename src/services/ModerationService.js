// src/services/ModerationService.js
const Advertisement = require('../models/Advertisement');
const AdvertisementReport = require('../models/AdvertisementReport');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { logger } = require('../logger/logger');

class ModerationService {
  /**
   * Report an advertisement as inappropriate
   * @param {Object} reportData - Report data
   * @param {ObjectId} reporterId - ID of the user reporting
   * @returns {Promise<AdvertisementReport>} Created report object
   */
  async reportAdvertisement(reportData, reporterId) {
    try {
      // Check if reporter is trying to report their own ad
      const advertisement = await Advertisement.findById(reportData.advertisementId);
      if (!advertisement) {
        throw new AppError('Advertisement not found', 404);
      }

      if (advertisement.ownerId.toString() === reporterId.toString()) {
        throw new AppError('You cannot report your own advertisement', 400);
      }

      // Check if a report already exists from this user for this ad
      const existingReport = await AdvertisementReport.findOne({
        advertisementId: reportData.advertisementId,
        reporterId: reporterId
      });

      if (existingReport) {
        throw new AppError('You have already reported this advertisement', 400);
      }

      // Create the report
      const report = new AdvertisementReport({
        ...reportData,
        reporterId
      });
      await report.save();

      // Increment the reported count on the advertisement
      advertisement.reportedCount = (advertisement.reportedCount || 0) + 1;
      await advertisement.save();

      // Check if the advertisement should be automatically hidden based on report count
      await this.checkForAutoHide(advertisement._id);

      // Notify the owner that their advertisement has been reported
      await this.notifyAdOwner(advertisement._id, 'ad_reported',
        `Your advertisement "${advertisement.title}" has been reported by another user`);

      // Populate and return the report
      const populatedReport = await AdvertisementReport.findById(report._id)
        .populate('advertisementId', 'title description ownerId')
        .populate('reporterId', 'firstName lastName email')
        .populate('reviewedBy', 'firstName lastName email');

      return populatedReport;
    } catch (error) {
      logger.error('Error reporting advertisement:', error.message);
      throw error;
    }
  }

  /**
   * Check if an advertisement should be automatically hidden based on report count
   * @param {ObjectId} advertisementId - ID of the advertisement to check
   * @returns {Promise<void>}
   */
  async checkForAutoHide(advertisementId) {
    try {
      const advertisement = await Advertisement.findById(advertisementId);
      if (!advertisement) {
        throw new AppError('Advertisement not found', 404);
      }

      // Define auto-hide threshold (configurable)
      const AUTO_HIDE_THRESHOLD = 3; // Example: Hide after 3 reports

      if (advertisement.reportedCount >= AUTO_HIDE_THRESHOLD) {
        // Auto-hide the advertisement
        await this.hideAdvertisement(advertisementId, null, 'Auto-hidden due to multiple reports');
      }
    } catch (error) {
      logger.error('Error checking for auto-hide:', error.message);
      throw error;
    }
  }

  /**
   * Hide an advertisement
   * @param {ObjectId} advertisementId - ID of the advertisement to hide
   * @param {ObjectId} moderatorId - ID of the moderator taking action (optional for auto-hide)
   * @param {String} reason - Reason for hiding
   * @returns {Promise<Advertisement>} Updated advertisement object
   */
  async hideAdvertisement(advertisementId, moderatorId, reason) {
    try {
      const advertisement = await Advertisement.findById(advertisementId);
      if (!advertisement) {
        throw new AppError('Advertisement not found', 404);
      }

      // Update the advertisement to be hidden
      advertisement.isHidden = true;
      advertisement.hideReason = reason;
      advertisement.hiddenAt = new Date();
      if (moderatorId) {
        advertisement.hiddenBy = moderatorId;
      }

      await advertisement.save();

      // Notify the owner that their advertisement has been hidden
      await this.notifyAdOwner(advertisementId, 'ad_hidden', reason);

      return advertisement;
    } catch (error) {
      logger.error('Error hiding advertisement:', error.message);
      throw error;
    }
  }

  /**
   * Unhide an advertisement
   * @param {ObjectId} advertisementId - ID of the advertisement to unhide
   * @param {ObjectId} moderatorId - ID of the moderator taking action
   * @returns {Promise<Advertisement>} Updated advertisement object
   */
  async unhideAdvertisement(advertisementId, moderatorId) {
    try {
      const advertisement = await Advertisement.findById(advertisementId);
      if (!advertisement) {
        throw new AppError('Advertisement not found', 404);
      }

      // Update the advertisement to be visible again
      advertisement.isHidden = false;
      advertisement.hideReason = undefined;
      advertisement.hiddenAt = undefined;
      advertisement.hiddenBy = undefined;

      await advertisement.save();

      // Notify the owner that their advertisement has been unhidden
      await this.notifyAdOwner(advertisementId, 'ad_unhidden', 'Advertisement has been unhidden');

      return advertisement;
    } catch (error) {
      logger.error('Error unhiding advertisement:', error.message);
      throw error;
    }
  }

  /**
   * Review a report
   * @param {ObjectId} reportId - ID of the report to review
   * @param {ObjectId} moderatorId - ID of the moderator reviewing
   * @param {String} action - Action to take ('hide', 'dismiss', 'warn')
   * @param {String} resolutionNotes - Notes about the resolution
   * @returns {Promise<AdvertisementReport>} Updated report object
   */
  async reviewReport(reportId, moderatorId, action, resolutionNotes) {
    try {
      const report = await AdvertisementReport.findById(reportId);
      if (!report) {
        throw new AppError('Report not found', 404);
      }

      // Validate action
      const validActions = ['hide', 'dismiss', 'warn'];
      if (!validActions.includes(action)) {
        throw new AppError(`Action must be one of: ${validActions.join(', ')}`, 400);
      }

      // Update the report with review information
      report.status = 'reviewed';
      report.reviewedBy = moderatorId;
      report.reviewedAt = new Date();
      report.resolutionNotes = resolutionNotes;

      // Take appropriate action based on decision
      switch (action) {
        case 'hide':
          report.isHidden = true;
          await this.hideAdvertisement(report.advertisementId, moderatorId, resolutionNotes || 'Hidden during moderation review');
          break;
        case 'dismiss':
          report.status = 'dismissed';
          break;
        case 'warn':
          // Could trigger a warning system to the user
          report.status = 'resolved';
          break;
      }

      await report.save();

      // Populate and return the updated report
      const populatedReport = await AdvertisementReport.findById(report._id)
        .populate('advertisementId', 'title description ownerId')
        .populate('reporterId', 'firstName lastName email')
        .populate('reviewedBy', 'firstName lastName email');
      
      return populatedReport;
    } catch (error) {
      logger.error('Error reviewing report:', error.message);
      throw error;
    }
  }

  /**
   * Get reports pending review
   * @param {Object} options - Query options
   * @param {Number} options.page - Page number
   * @param {Number} options.limit - Items per page
   * @returns {Promise<Object>} Object with reports and pagination info
   */
  async getPendingReports(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'asc'
      } = options;

      const query = { status: 'pending' };

      const skip = (page - 1) * limit;

      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const reports = await AdvertisementReport.find(query)
        .populate('advertisementId', 'title description ownerId isHidden')
        .populate('reporterId', 'firstName lastName email')
        .populate('reviewedBy', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(limit);

      const total = await AdvertisementReport.countDocuments(query);

      return {
        reports,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Error getting pending reports:', error.message);
      throw error;
    }
  }

  /**
   * Get all reports for a specific advertisement
   * @param {ObjectId} advertisementId - ID of the advertisement
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Object with reports and pagination info
   */
  async getAdvertisementReports(advertisementId, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const query = { advertisementId };

      const skip = (page - 1) * limit;

      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const reports = await AdvertisementReport.find(query)
        .populate('reporterId', 'firstName lastName email')
        .populate('reviewedBy', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(limit);

      const total = await AdvertisementReport.countDocuments(query);

      return {
        reports,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Error getting advertisement reports:', error.message);
      throw error;
    }
  }

  /**
   * Submit an appeal for a hidden advertisement
   * @param {ObjectId} advertisementId - ID of the advertisement to appeal
   * @param {ObjectId} ownerId - ID of the advertisement owner
   * @param {String} reason - Reason for the appeal
   * @returns {Promise<Advertisement>} Updated advertisement object
   */
  async submitAppeal(advertisementId, ownerId, reason) {
    try {
      const advertisement = await Advertisement.findById(advertisementId);
      if (!advertisement) {
        throw new AppError('Advertisement not found', 404);
      }

      // Verify that the person appealing is the owner
      if (advertisement.ownerId.toString() !== ownerId.toString()) {
        throw new AppError('Only the owner of the advertisement can submit an appeal', 403);
      }

      // Check if ad is actually hidden
      if (!advertisement.isHidden) {
        throw new AppError('This advertisement is not hidden and therefore cannot be appealed', 400);
      }

      // Find the corresponding report and update its appeal status
      const report = await AdvertisementReport.findOne({
        advertisementId: advertisementId,
        isHidden: true
      });

      if (!report) {
        throw new AppError('No report found for this hidden advertisement', 404);
      }

      // Update appeal information
      report.appealed = true;
      report.appealReason = reason;
      report.appealedBy = ownerId;
      report.appealedAt = new Date();

      await report.save();

      // Update ad status to indicate it's under appeal review
      advertisement.isModerated = false; // Reset moderation status
      await advertisement.save();

      return advertisement;
    } catch (error) {
      logger.error('Error submitting appeal:', error.message);
      throw error;
    }
  }

  /**
   * Resolve an appeal
   * @param {ObjectId} advertisementId - ID of the advertisement
   * @param {ObjectId} moderatorId - ID of the moderator resolving
   * @param {String} action - Action to take ('restore', 'maintain_hide')
   * @param {String} resolutionNotes - Notes about the resolution
   * @returns {Promise<AdvertisementReport>} Updated report object
   */
  async resolveAppeal(advertisementId, moderatorId, action, resolutionNotes) {
    try {
      // Find the report with an active appeal
      const report = await AdvertisementReport.findOne({
        advertisementId: advertisementId,
        appealed: true,
        appealResolved: false
      });

      if (!report) {
        throw new AppError('No active appeal found for this advertisement', 404);
      }

      // Validate action
      const validActions = ['restore', 'maintain_hide'];
      if (!validActions.includes(action)) {
        throw new AppError(`Action must be one of: ${validActions.join(', ')}`, 400);
      }

      // Update appeal resolution
      report.appealResolved = true;
      report.appealResolutionNotes = resolutionNotes;

      let advertisement = await Advertisement.findById(advertisementId);
      if (!advertisement) {
        throw new AppError('Advertisement not found', 404);
      }

      // Take appropriate action based on resolution
      if (action === 'restore') {
        // Unhide the advertisement
        advertisement = await this.unhideAdvertisement(advertisementId, moderatorId);
        report.status = 'resolved'; // Change status since ad is restored
        report.isHidden = false; // Mark report as not leading to hide

        // Notify the owner that their advertisement has been restored
        await this.notifyAdOwner(advertisementId, 'appeal_resolved',
          `Your appeal was approved and your advertisement has been restored.`);
      } else if (action === 'maintain_hide') {
        // Keep the advertisement hidden
        report.status = 'resolved'; // Mark report as resolved
        // The advertisement remains hidden

        // Notify the owner that their appeal was denied
        await this.notifyAdOwner(advertisementId, 'appeal_resolved',
          `Your appeal was reviewed and the decision to keep the advertisement hidden has been maintained.`);
      }

      await report.save();

      // Populate and return the resolved report
      const populatedReport = await AdvertisementReport.findById(report._id)
        .populate('advertisementId', 'title description ownerId')
        .populate('reporterId', 'firstName lastName email')
        .populate('reviewedBy', 'firstName lastName email')
        .populate('appealedBy', 'firstName lastName email');

      return populatedReport;
    } catch (error) {
      logger.error('Error resolving appeal:', error.message);
      throw error;
    }
  }

  /**
   * Get all advertisements that were reported more than the threshold and should be auto-hidden
   * @returns {Promise<Array>} Array of advertisement objects
   */
  async getAutoHideCandidates() {
    try {
      // Get threshold from config or use default
      const threshold = 3; // This could be configurable
      
      const advertisements = await Advertisement.find({
        reportedCount: { $gte: threshold },
        isHidden: false // Only non-hidden ads with many reports
      });

      return advertisements;
    } catch (error) {
      logger.error('Error getting auto-hide candidates:', error.message);
      throw error;
    }
  }

  /**
   * Get statistics about moderation activity
   * @returns {Promise<Object>} Statistics object
   */
  async getModerationStats() {
    try {
      const stats = await AdvertisementReport.aggregate([
        {
          $group: {
            _id: null,
            totalReports: { $sum: 1 },
            pendingReports: {
              $sum: {
                $cond: [{ $eq: ['$status', 'pending'] }, 1, 0]
              }
            },
            resolvedReports: {
              $sum: {
                $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0]
              }
            },
            dismissedReports: {
              $sum: {
                $cond: [{ $eq: ['$status', 'dismissed'] }, 1, 0]
              }
            },
            hiddenAdsCount: {
              $sum: {
                $cond: ['$isHidden', 1, 0]
              }
            },
            appealedReports: {
              $sum: {
                $cond: ['$appealed', 1, 0]
              }
            },
            resolvedAppeals: {
              $sum: {
                $cond: ['$appealResolved', 1, 0]
              }
            }
          }
        }
      ]);

      return stats.length > 0 ? stats[0] : {
        totalReports: 0,
        pendingReports: 0,
        resolvedReports: 0,
        dismissedReports: 0,
        hiddenAdsCount: 0,
        appealedReports: 0,
        resolvedAppeals: 0
      };
    } catch (error) {
      logger.error('Error getting moderation stats:', error.message);
      throw error;
    }
  }

  /**
   * Send notification to ad owner about moderation action
   * @param {ObjectId} advertisementId - ID of the advertisement
   * @param {String} notificationType - Type of notification
   * @param {String} message - Notification message
   * @returns {Promise<void>}
   */
  async notifyAdOwner(advertisementId, notificationType, message) {
    try {
      const advertisement = await Advertisement.findById(advertisementId).populate('ownerId', 'firstName lastName email');
      if (!advertisement || !advertisement.ownerId) {
        logger.warn(`Could not find owner for advertisement ${advertisementId} to send notification`);
        return;
      }

      // Create notification for the owner
      const Notification = require('../models/Notification');
      const notification = new Notification({
        userId: advertisement.ownerId._id,
        type: notificationType,
        title: this.getNotificationTitle(notificationType),
        message: message,
        advertisementId: advertisement._id,
        priority: 'high' // High priority for moderation actions
      });

      await notification.save();

      // Here you could also send email or push notification if needed
      logger.info(`Notification sent to user ${advertisement.ownerId._id} about ${notificationType} for advertisement ${advertisementId}`);
    } catch (error) {
      logger.error('Error sending notification to ad owner:', error.message);
      // Don't throw error, as notification failure shouldn't break the main flow
    }
  }

  /**
   * Get appropriate notification title based on type
   * @param {String} notificationType - Type of notification
   * @returns {String} Title for the notification
   */
  getNotificationTitle(notificationType) {
    const titles = {
      'ad_hidden': 'Advertisement Hidden',
      'ad_unhidden': 'Advertisement Unhidden',
      'appeal_submitted': 'Appeal Submitted',
      'appeal_resolved': 'Appeal Resolved'
    };

    return titles[notificationType] || 'Notification';
  }
}

module.exports = new ModerationService();