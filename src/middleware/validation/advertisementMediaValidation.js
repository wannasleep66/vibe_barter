// src/middleware/validation/advertisementMediaValidation.js
const Joi = require('joi');
const Advertisement = require('../../models/Advertisement');
const AdvertisementMedia = require('../../models/AdvertisementMedia');
const AppError = require('../../utils/AppError');

// Validation schema for creating advertisement media
const createAdvertisementMediaSchema = Joi.object({
  advertisementId: Joi.string().required()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Invalid advertisement ID format',
      'any.required': 'Advertisement ID is required'
    }),
  altText: Joi.string().max(200).optional().allow('', null),
  isPrimary: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().min(0).optional().default(0)
});

// Validation schema for updating advertisement media
const updateAdvertisementMediaSchema = Joi.object({
  altText: Joi.string().max(200).optional().allow('', null),
  isPrimary: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().min(0).optional()
});

// Validation schema for media ID parameter
const mediaIdSchema = Joi.object({
  id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
    .messages({
      'string.pattern.base': 'Invalid media ID format',
      'any.required': 'Media ID is required'
    })
});

// Validation schema for advertisement ID parameter
const advertisementIdSchema = Joi.object({
  advertisementId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
    .messages({
      'string.pattern.base': 'Invalid advertisement ID format',
      'any.required': 'Advertisement ID is required'
    })
});

// Validate create advertisement media data
exports.validateCreateAdvertisementMedia = async (req, res, next) => {
  try {
    // Check if file exists
    if (!req.file) {
      return next(new AppError('No file provided', 400));
    }

    // Validate the request body
    const validatedData = await createAdvertisementMediaSchema.validateAsync(req.body, { abortEarly: false });
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

// Validate update advertisement media data
exports.validateUpdateAdvertisementMedia = async (req, res, next) => {
  try {
    const validatedData = await updateAdvertisementMediaSchema.validateAsync(req.body, { abortEarly: false });
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

// Validate media ID parameter
exports.validateMediaId = async (req, res, next) => {
  try {
    await mediaIdSchema.validateAsync(req.params, { abortEarly: false });
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

// Additional validation middleware for file size and type
exports.validateMediaFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('No file provided', 400));
    }

    // Check file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (req.file.size > maxSize) {
      return next(new AppError('File size exceeds maximum allowed size of 10MB', 400));
    }

    // Check file type
    const allowedMimes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedMimes.includes(req.file.mimetype)) {
      return next(new AppError(`File type ${req.file.mimetype} is not allowed`, 400));
    }

    next();
  } catch (error) {
    return next(error);
  }
};