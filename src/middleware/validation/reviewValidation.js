// src/middleware/validation/reviewValidation.js
const Joi = require('joi');
const Review = require('../../models/Review');

// Validation schema for creating a review
const createReviewSchema = Joi.object({
  reviewerId: Joi.string().length(24).hex().required(),
  revieweeId: Joi.string().length(24).hex().required(),
  advertisementId: Joi.string().length(24).hex().optional(),
  applicationId: Joi.string().length(24).hex().optional(),
  rating: Joi.number().integer().min(1).max(5).required(),
  title: Joi.string().max(100).optional(),
  comment: Joi.string().max(1000).optional(),
  isPositive: Joi.boolean().optional(),
  tags: Joi.array().items(Joi.string().length(24).hex()).optional()
});

// Validation schema for updating a review
const updateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).optional(),
  title: Joi.string().max(100).optional(),
  comment: Joi.string().max(1000).optional(),
  isPositive: Joi.boolean().optional(),
  tags: Joi.array().items(Joi.string().length(24).hex()).optional()
});

module.exports = {
  validateCreateReview: (req, res, next) => {
    const { error } = createReviewSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }
    next();
  },

  validateUpdateReview: (req, res, next) => {
    const { error } = updateReviewSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }
    next();
  },

  // Middleware to validate review ID parameter
  validateReviewId: (req, res, next) => {
    const reviewId = req.params.id;
    
    if (!reviewId || !/^[0-9a-fA-F]{24}$/.test(reviewId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review ID format'
      });
    }
    
    next();
  },

  // Middleware to validate advertisement ID parameter
  validateAdvertisementId: (req, res, next) => {
    const advertisementId = req.params.advertisementId;
    
    if (!advertisementId || !/^[0-9a-fA-F]{24}$/.test(advertisementId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid advertisement ID format'
      });
    }
    
    next();
  },

  // Middleware to validate user ID parameter
  validateUserId: (req, res, next) => {
    const userId = req.params.id;
    
    if (!userId || !/^[0-9a-fA-F]{24}$/.test(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }
    
    next();
  },

  // Middleware to validate pagination and filter parameters
  validateReviewsQuery: (req, res, next) => {
    const { page, limit, minRating, maxRating, sortBy, sortOrder } = req.query;
    
    // Validate page
    if (page !== undefined && (isNaN(page) || parseInt(page) < 1)) {
      return res.status(400).json({
        success: false,
        message: 'Page must be a positive integer'
      });
    }
    
    // Validate limit
    if (limit !== undefined && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be a positive integer between 1 and 100'
      });
    }
    
    // Validate rating filters
    if (minRating !== undefined && (isNaN(minRating) || parseFloat(minRating) < 1 || parseFloat(minRating) > 5)) {
      return res.status(400).json({
        success: false,
        message: 'Minimum rating must be between 1 and 5'
      });
    }
    
    if (maxRating !== undefined && (isNaN(maxRating) || parseFloat(maxRating) < 1 || parseFloat(maxRating) > 5)) {
      return res.status(400).json({
        success: false,
        message: 'Maximum rating must be between 1 and 5'
      });
    }
    
    if (minRating !== undefined && maxRating !== undefined && parseFloat(minRating) > parseFloat(maxRating)) {
      return res.status(400).json({
        success: false,
        message: 'Minimum rating cannot be greater than maximum rating'
      });
    }
    
    // Validate sort options
    const validSortFields = ['createdAt', 'updatedAt', 'rating'];
    if (sortBy !== undefined && !validSortFields.includes(sortBy)) {
      return res.status(400).json({
        success: false,
        message: `sortBy must be one of: ${validSortFields.join(', ')}`
      });
    }
    
    if (sortOrder !== undefined && !['asc', 'desc', '1', '-1'].includes(sortOrder)) {
      return res.status(400).json({
        success: false,
        message: 'sortOrder must be either "asc", "desc", "1", or "-1"'
      });
    }
    
    next();
  }
};