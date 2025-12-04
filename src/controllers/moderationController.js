// src/controllers/moderationController.js
const ModerationService = require('../services/ModerationService');
const Advertisement = require('../models/Advertisement');
const AdvertisementReport = require('../models/AdvertisementReport');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { logger } = require('../logger/logger');

class ModerationController {
  /**
   * Report an advertisement as inappropriate
   */
  async reportAdvertisement(req, res, next) {
    try {
      const { id } = req.params;
      const { reason, details } = req.body;

      const report = await ModerationService.reportAdvertisement({
        advertisementId: id,
        reason,
        details
      }, req.user._id);

      res.status(201).json({
        success: true,
        data: report,
        message: 'Advertisement reported successfully'
      });
    } catch (error) {
      logger.error('Error reporting advertisement:', error.message);
      next(error);
    }
  }

  /**
   * Review a report
   */
  async reviewReport(req, res, next) {
    try {
      const { id } = req.params;
      const { action, resolutionNotes } = req.body;

      // Check if user has moderation permissions
      // This will be handled by the middleware already
      
      const report = await ModerationService.reviewReport(
        id,
        req.user._id,
        action,
        resolutionNotes
      );

      res.status(200).json({
        success: true,
        data: report,
        message: 'Report reviewed successfully'
      });
    } catch (error) {
      logger.error('Error reviewing report:', error.message);
      next(error);
    }
  }

  /**
   * Get pending reports for moderators
   */
  async getPendingReports(req, res, next) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'asc'
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
      };

      const result = await ModerationService.getPendingReports(options);

      res.status(200).json({
        success: true,
        data: result.reports,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error getting pending reports:', error.message);
      next(error);
    }
  }

  /**
   * Get reports for a specific advertisement
   */
  async getAdvertisementReports(req, res, next) {
    try {
      const { id } = req.params;
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
      };

      const result = await ModerationService.getAdvertisementReports(id, options);

      res.status(200).json({
        success: true,
        data: result.reports,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error getting advertisement reports:', error.message);
      next(error);
    }
  }

  /**
   * Hide an advertisement (for moderators)
   */
  async hideAdvertisement(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const advertisement = await ModerationService.hideAdvertisement(
        id,
        req.user._id,
        reason
      );

      res.status(200).json({
        success: true,
        data: advertisement,
        message: 'Advertisement hidden successfully'
      });
    } catch (error) {
      logger.error('Error hiding advertisement:', error.message);
      next(error);
    }
  }

  /**
   * Unhide an advertisement (for moderators)
   */
  async unhideAdvertisement(req, res, next) {
    try {
      const { id } = req.params;

      const advertisement = await ModerationService.unhideAdvertisement(
        id,
        req.user._id
      );

      res.status(200).json({
        success: true,
        data: advertisement,
        message: 'Advertisement unhidden successfully'
      });
    } catch (error) {
      logger.error('Error unhiding advertisement:', error.message);
      next(error);
    }
  }

  /**
   * Submit an appeal for a hidden advertisement (for ad owners)
   */
  async submitAppeal(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const advertisement = await ModerationService.submitAppeal(
        id,
        req.user._id,
        reason
      );

      res.status(200).json({
        success: true,
        data: advertisement,
        message: 'Appeal submitted successfully'
      });
    } catch (error) {
      logger.error('Error submitting appeal:', error.message);
      next(error);
    }
  }

  /**
   * Resolve an appeal (for moderators)
   */
  async resolveAppeal(req, res, next) {
    try {
      const { id } = req.params;
      const { action, resolutionNotes } = req.body;

      const report = await ModerationService.resolveAppeal(
        id,
        req.user._id,
        action,
        resolutionNotes
      );

      res.status(200).json({
        success: true,
        data: report,
        message: 'Appeal resolved successfully'
      });
    } catch (error) {
      logger.error('Error resolving appeal:', error.message);
      next(error);
    }
  }

  /**
   * Get moderation statistics
   */
  async getModerationStats(req, res, next) {
    try {
      const stats = await ModerationService.getModerationStats();

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting moderation stats:', error.message);
      next(error);
    }
  }

  /**
   * Get advertisements that are candidates for auto-hiding
   */
  async getAutoHideCandidates(req, res, next) {
    try {
      const candidates = await ModerationService.getAutoHideCandidates();

      res.status(200).json({
        success: true,
        data: candidates
      });
    } catch (error) {
      logger.error('Error getting auto-hide candidates:', error.message);
      next(error);
    }
  }
}

module.exports = new ModerationController();