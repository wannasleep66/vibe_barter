// src/middleware/tagValidation.js
const Joi = require('joi');

// Validation schema for creating a tag
const createTagSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Tag name is required',
      'string.min': 'Tag name must be at least 1 character long',
      'string.max': 'Tag name cannot exceed 50 characters',
    }),
  description: Joi.string()
    .max(200)
    .optional()
    .messages({
      'string.max': 'Tag description cannot exceed 200 characters',
    }),
  color: Joi.string()
    .max(7)
    .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/) // Hex color pattern
    .optional()
    .messages({
      'string.max': 'Color code cannot exceed 7 characters',
      'string.pattern.base': 'Color must be a valid hex code (e.g., #FF0000)',
    }),
  icon: Joi.string()
    .max(50)
    .optional()
    .messages({
      'string.max': 'Icon reference cannot exceed 50 characters',
    }),
});

// Validation schema for updating a tag
const updateTagSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .messages({
      'string.min': 'Tag name must be at least 1 character long',
      'string.max': 'Tag name cannot exceed 50 characters',
    }),
  description: Joi.string()
    .max(200)
    .optional()
    .messages({
      'string.max': 'Tag description cannot exceed 200 characters',
    }),
  isActive: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'Active status must be a boolean value',
    }),
  color: Joi.string()
    .max(7)
    .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/) // Hex color pattern
    .optional()
    .messages({
      'string.max': 'Color code cannot exceed 7 characters',
      'string.pattern.base': 'Color must be a valid hex code (e.g., #FF0000)',
    }),
  icon: Joi.string()
    .max(50)
    .optional()
    .messages({
      'string.max': 'Icon reference cannot exceed 50 characters',
    }),
});

module.exports = {
  validateCreateTag: (req, res, next) => {
    const { error } = createTagSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }
    next();
  },
  
  validateUpdateTag: (req, res, next) => {
    const { error } = updateTagSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }
    next();
  }
};