// src/middleware/validation/advertisementValidation.js
const Joi = require('joi');
const Advertisement = require('../../models/Advertisement');
const Category = require('../../models/Category');
const Tag = require('../../models/Tag');
const AppError = require('../../utils/AppError');

// Validation schema for creating advertisement
const createAdvertisementSchema = Joi.object({
  title: Joi.string().trim().min(3).max(100).required()
    .messages({
      'string.min': 'Title must be at least 3 characters long',
      'string.max': 'Title cannot exceed 100 characters',
      'string.empty': 'Title is required'
    }),
  description: Joi.string().min(10).max(2000).required()
    .messages({
      'string.min': 'Description must be at least 10 characters long',
      'string.max': 'Description cannot exceed 2000 characters',
      'string.empty': 'Description is required'
    }),
  categoryId: Joi.string().required()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Invalid category ID format',
      'any.required': 'Category ID is required'
    }),
  tags: Joi.array().items(
    Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
  ).optional().default([]),
  type: Joi.string().valid('service', 'goods', 'skill', 'experience').required()
    .messages({
      'any.only': 'Type must be either service, goods, skill, or experience',
      'any.required': 'Type is required'
    }),
  exchangePreferences: Joi.string().max(500).optional().allow('', null),
  location: Joi.string().trim().max(100).optional().allow('', null),
  coordinates: Joi.object({
    coordinates: Joi.array().length(2).items(
      Joi.number()
    ).required()
  }).optional(),
  isUrgent: Joi.boolean().optional().default(false),
  expiresAt: Joi.date().iso().optional().greater('now'),
  profileId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional()
    .messages({
      'string.pattern.base': 'Invalid profile ID format'
    })
});

// Validation schema for updating advertisement
const updateAdvertisementSchema = Joi.object({
  title: Joi.string().trim().min(3).max(100).optional()
    .messages({
      'string.min': 'Title must be at least 3 characters long',
      'string.max': 'Title cannot exceed 100 characters'
    }),
  description: Joi.string().min(10).max(2000).optional()
    .messages({
      'string.min': 'Description must be at least 10 characters long',
      'string.max': 'Description cannot exceed 2000 characters'
    }),
  categoryId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional()
    .messages({
      'string.pattern.base': 'Invalid category ID format'
    }),
  tags: Joi.array().items(
    Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
  ).optional(),
  type: Joi.string().valid('service', 'goods', 'skill', 'experience').optional()
    .messages({
      'any.only': 'Type must be either service, goods, skill, or experience'
    }),
  exchangePreferences: Joi.string().max(500).optional().allow('', null),
  location: Joi.string().trim().max(100).optional().allow('', null),
  coordinates: Joi.object({
    coordinates: Joi.array().length(2).items(
      Joi.number()
    ).required()
  }).optional(),
  isUrgent: Joi.boolean().optional(),
  expiresAt: Joi.date().iso().optional().greater('now'),
  profileId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional()
    .messages({
      'string.pattern.base': 'Invalid profile ID format'
    }),
  isActive: Joi.boolean().optional()
});

// Validation schema for query parameters
const getAdvertisementsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
  search: Joi.string().max(100).optional().allow(''),
  type: Joi.string().valid('service', 'goods', 'skill', 'experience').optional(),
  categoryId: Joi.alternatives().try(
    Joi.string().pattern(/^[0-9a-fA-F]{24}$/), // Single category ID
    Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)) // Multiple category IDs
  ).optional(),
  includeSubcategories: Joi.boolean().optional().default(false), // Include subcategories in results
  tagId: Joi.alternatives().try(
    Joi.string().pattern(/^[0-9a-fA-F]{24}$/), // Single tag ID
    Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)) // Multiple tag IDs
  ).optional(),
  tagOperator: Joi.string().valid('and', 'or').optional().default('or'), // How to combine multiple tags ('and' or 'or')
  location: Joi.string().max(100).optional().allow(''),
  isUrgent: Joi.boolean().optional(),
  isArchived: Joi.string().valid('true', 'false', 'any').optional(),
  isActive: Joi.string().valid('true', 'false', 'any').optional().default('true'),
  ownerId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(), // For admin search
  profileId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  minRating: Joi.number().min(0).max(5).optional(), // Minimum average rating
  maxRating: Joi.number().min(0).max(5).optional(), // Maximum average rating (for advertisement)
  minAuthorRating: Joi.number().min(0).max(5).optional(), // Minimum author rating
  maxAuthorRating: Joi.number().min(0).max(5).optional(), // Maximum author rating
  minViews: Joi.number().integer().min(0).optional(), // Minimum number of views
  maxViews: Joi.number().integer().min(0).optional(), // Maximum number of views
  minApplications: Joi.number().integer().min(0).optional(), // Minimum number of applications
  maxApplications: Joi.number().integer().min(0).optional(), // Maximum number of applications
  expiresBefore: Joi.date().iso().optional(), // Expires before this date
  expiresAfter: Joi.date().iso().optional(), // Expires after this date
  minCreatedAt: Joi.date().iso().optional(), // Created after this date
  maxCreatedAt: Joi.date().iso().optional(), // Created before this date
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'title', 'views', 'expiresAt', 'rating.average', 'applicationCount').optional().default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').optional().default('desc'),
  longitude: Joi.number().min(-180).max(180).optional(), // For geo-location search
  latitude: Joi.number().min(-90).max(90).optional(),   // For geo-location search
  maxDistance: Joi.number().min(0).optional().default(10000), // Max distance in meters for geo-search
  hasPortfolio: Joi.string().valid('true', 'false', 'any').optional(), // Filter by whether author has portfolio
  languages: Joi.array().items(
    Joi.string().max(50).trim() // Language names can be up to 50 characters
  ).single().optional().default([]) // Accept both single language and array of languages
});

// Validation schema for advertisement ID parameter
const advertisementIdSchema = Joi.object({
  id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
    .messages({
      'string.pattern.base': 'Invalid advertisement ID format',
      'any.required': 'Advertisement ID is required'
    })
});

// Validation schema for updating user's advertisement
const updateUserAdvertisementSchema = Joi.object({
  title: Joi.string().trim().min(3).max(100).optional()
    .messages({
      'string.min': 'Title must be at least 3 characters long',
      'string.max': 'Title cannot exceed 100 characters'
    }),
  description: Joi.string().min(10).max(2000).optional()
    .messages({
      'string.min': 'Description must be at least 10 characters long',
      'string.max': 'Description cannot exceed 2000 characters'
    }),
  categoryId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional()
    .messages({
      'string.pattern.base': 'Invalid category ID format'
    }),
  tags: Joi.array().items(
    Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
  ).optional(),
  type: Joi.string().valid('service', 'goods', 'skill', 'experience').optional()
    .messages({
      'any.only': 'Type must be either service, goods, skill, or experience'
    }),
  exchangePreferences: Joi.string().max(500).optional().allow('', null),
  location: Joi.string().trim().max(100).optional().allow('', null),
  coordinates: Joi.object({
    coordinates: Joi.array().length(2).items(
      Joi.number()
    ).required()
  }).optional(),
  isUrgent: Joi.boolean().optional(),
  expiresAt: Joi.date().iso().optional().greater('now')
});

// Validation schema for getting user advertisements
const getUserAdvertisementsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
  isActive: Joi.boolean().optional(),
  isArchived: Joi.boolean().optional(),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'title', 'views', 'expiresAt').optional().default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').optional().default('desc')
});

// Validate create advertisement data
exports.validateCreateAdvertisement = async (req, res, next) => {
  try {
    const validatedData = await createAdvertisementSchema.validateAsync(req.body, { abortEarly: false });
    req.body = validatedData;
    next();
  } catch (error) {
    if (error.isJoi || error.name === 'ValidationError') {
      const errors = error.details.map(detail => detail.message);
      return next(new AppError(`Validation error: ${errors.join(', ')}`, 400));
    }
    return next(error);
  }
};

// Validate update advertisement data
exports.validateUpdateAdvertisement = async (req, res, next) => {
  try {
    const validatedData = await updateAdvertisementSchema.validateAsync(req.body, { abortEarly: false });
    req.body = validatedData;
    next();
  } catch (error) {
    if (error.isJoi || error.name === 'ValidationError') {
      const errors = error.details.map(detail => detail.message);
      return next(new AppError(`Validation error: ${errors.join(', ')}`, 400));
    }
    return next(error);
  }
};

// Validate get advertisements query parameters
exports.validateGetAdvertisementsQuery = async (req, res, next) => {
  try {
    const validatedQuery = await getAdvertisementsQuerySchema.validateAsync(req.query, { abortEarly: false });
    req.query = validatedQuery;
    next();
  } catch (error) {
    if (error.isJoi || error.name === 'ValidationError') {
      const errors = error.details.map(detail => detail.message);
      return next(new AppError(`Validation error: ${errors.join(', ')}`, 400));
    }
    return next(error);
  }
};

// Validate advertisement ID parameter
exports.validateAdvertisementId = async (req, res, next) => {
  try {
    await advertisementIdSchema.validateAsync(req.params, { abortEarly: false });
    next();
  } catch (error) {
    if (error.isJoi || error.name === 'ValidationError') {
      const errors = error.details.map(detail => detail.message);
      return next(new AppError(`Validation error: ${errors.join(', ')}`, 400));
    }
    return next(error);
  }
};

// Validate update user advertisement data
exports.validateUpdateUserAdvertisement = async (req, res, next) => {
  try {
    const validatedData = await updateUserAdvertisementSchema.validateAsync(req.body, { abortEarly: false });
    req.body = validatedData;
    next();
  } catch (error) {
    if (error.isJoi || error.name === 'ValidationError') {
      const errors = error.details.map(detail => detail.message);
      return next(new AppError(`Validation error: ${errors.join(', ')}`, 400));
    }
    return next(error);
  }
};

// Validate get user advertisements query parameters
exports.validateGetUserAdvertisementsQuery = async (req, res, next) => {
  try {
    const validatedQuery = await getUserAdvertisementsQuerySchema.validateAsync(req.query, { abortEarly: false });
    req.query = validatedQuery;
    next();
  } catch (error) {
    if (error.isJoi || error.name === 'ValidationError') {
      const errors = error.details.map(detail => detail.message);
      return next(new AppError(`Validation error: ${errors.join(', ')}`, 400));
    }
    return next(error);
  }
};