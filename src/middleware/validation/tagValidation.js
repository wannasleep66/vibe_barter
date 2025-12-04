// src/middleware/validation/tagValidation.js
const Joi = require('joi');
const AppError = require('../../utils/AppError');

// Validation schema for getting popular tags
const getPopularTagsSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).optional().default(10),
  search: Joi.string().max(50).optional().allow('')
});

// Validation schema for searching tags
const searchTagsSchema = Joi.object({
  query: Joi.string().min(1).max(50).required()
    .messages({
      'string.min': 'Query must be at least 1 character long',
      'string.max': 'Query cannot exceed 50 characters',
      'string.empty': 'Query is required'
    }),
  limit: Joi.number().integer().min(1).max(50).optional().default(10)
});

// Validate get popular tags query parameters
exports.validateGetPopularTags = async (req, res, next) => {
  try {
    const validatedQuery = await getPopularTagsSchema.validateAsync(req.query, { abortEarly: false });
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

// Validate search tags query parameters
exports.validateSearchTags = async (req, res, next) => {
  try {
    const validatedQuery = await searchTagsSchema.validateAsync(req.query, { abortEarly: false });
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