// src/controllers/reviewController.js
const ReviewService = require('../services/ReviewService');
const AppError = require('../utils/AppError');
const { logger } = require('../logger/logger');

class ReviewController {
  /**
   * Create a new review
   */
  async createReview(req, res, next) {
    try {
      const { reviewerId, revieweeId, advertisementId, applicationId, rating, title, comment, isPositive, tags } = req.body;

      // Validate that the logged in user is the reviewer
      if (reviewerId.toString() !== req.user._id.toString()) {
        return next(new AppError('You can only create a review as yourself', 403));
      }

      const review = await ReviewService.createReview({
        reviewerId,
        revieweeId,
        advertisementId,
        applicationId,
        rating,
        title,
        comment,
        isPositive,
        tags
      }, req.user._id);

      res.status(201).json({
        success: true,
        data: review,
        message: 'Review created successfully'
      });
    } catch (error) {
      logger.error('Error creating review:', error.message);
      next(error);
    }
  }

  /**
   * Get all reviews for a specific user (reviews where user is the reviewee)
   */
  async getUserReviews(req, res, next) {
    try {
      const { id } = req.params;
      const {
        page = 1,
        limit = 10,
        minRating,
        maxRating,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        minRating: minRating ? parseFloat(minRating) : undefined,
        maxRating: maxRating ? parseFloat(maxRating) : undefined,
        sortBy,
        sortOrder
      };

      const result = await ReviewService.getUserReviews(id, options);

      res.status(200).json({
        success: true,
        data: result.reviews,
        pagination: result.pagination,
        averageRating: result.averageRating
      });
    } catch (error) {
      logger.error('Error getting user reviews:', error.message);
      next(error);
    }
  }

  /**
   * Get all reviews written by a specific user (reviews where user is the reviewer)
   */
  async getUserWrittenReviews(req, res, next) {
    try {
      const { id } = req.params;
      const {
        page = 1,
        limit = 10,
        minRating,
        maxRating,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        minRating: minRating ? parseFloat(minRating) : undefined,
        maxRating: maxRating ? parseFloat(maxRating) : undefined,
        sortBy,
        sortOrder
      };

      const result = await ReviewService.getUserWrittenReviews(id, options);

      res.status(200).json({
        success: true,
        data: result.reviews,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error getting user written reviews:', error.message);
      next(error);
    }
  }

  /**
   * Get a specific review by ID
   */
  async getReviewById(req, res, next) {
    try {
      const { id } = req.params;

      const review = await ReviewService.getReviewById(id, req.user._id);

      res.status(200).json({
        success: true,
        data: review
      });
    } catch (error) {
      logger.error('Error getting review by ID:', error.message);
      next(error);
    }
  }

  /**
   * Get reviews for a specific advertisement
   */
  async getAdvertisementReviews(req, res, next) {
    try {
      const { advertisementId } = req.params;
      const {
        page = 1,
        limit = 10,
        minRating,
        maxRating,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        minRating: minRating ? parseFloat(minRating) : undefined,
        maxRating: maxRating ? parseFloat(maxRating) : undefined,
        sortBy,
        sortOrder
      };

      const result = await ReviewService.getAdvertisementReviews(advertisementId, options);

      res.status(200).json({
        success: true,
        data: result.reviews,
        pagination: result.pagination,
        averageRating: result.averageRating
      });
    } catch (error) {
      logger.error('Error getting advertisement reviews:', error.message);
      next(error);
    }
  }

  /**
   * Update a review
   */
  async updateReview(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const review = await ReviewService.updateReview(id, req.user._id, updateData);

      res.status(200).json({
        success: true,
        data: review,
        message: 'Review updated successfully'
      });
    } catch (error) {
      logger.error('Error updating review:', error.message);
      next(error);
    }
  }

  /**
   * Delete a review
   */
  async deleteReview(req, res, next) {
    try {
      const { id } = req.params;

      await ReviewService.deleteReview(id, req.user._id);

      res.status(200).json({
        success: true,
        message: 'Review deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting review:', error.message);
      next(error);
    }
  }

  /**
   * Check if user can review someone for a specific interaction
   */
  async canReview(req, res, next) {
    try {
      const { revieweeId, applicationId } = req.body;

      const can = await ReviewService.canReview(req.user._id, revieweeId, applicationId);

      res.status(200).json({
        success: true,
        data: { canReview: can }
      });
    } catch (error) {
      logger.error('Error checking if user can review:', error.message);
      next(error);
    }
  }
}

module.exports = new ReviewController();