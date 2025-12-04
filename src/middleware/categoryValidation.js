// src/middleware/categoryValidation.js
const Joi = require('joi');

// Validation schema for creating a category
const createCategorySchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Category name is required',
      'string.min': 'Category name must be at least 1 character long',
      'string.max': 'Category name cannot exceed 100 characters',
    }),
  description: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Category description cannot exceed 500 characters',
    }),
  parentId: Joi.string()
    .optional()
    .pattern(/^[0-9a-fA-F]{24}$/) // MongoDB ObjectId pattern
    .messages({
      'string.pattern.base': 'Parent ID must be a valid MongoDB ObjectId',
    }),
  sortOrder: Joi.number()
    .integer()
    .min(0)
    .optional()
    .default(0)
    .messages({
      'number.base': 'Sort order must be a number',
      'number.integer': 'Sort order must be an integer',
      'number.min': 'Sort order cannot be negative',
    }),
  icon: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Icon reference cannot exceed 100 characters',
    }),
  color: Joi.string()
    .max(7)
    .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/) // Hex color pattern
    .optional()
    .messages({
      'string.max': 'Color code cannot exceed 7 characters',
      'string.pattern.base': 'Color must be a valid hex code (e.g., #FF0000)',
    }),
});

// Validation schema for updating a category
const updateCategorySchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Category name must be at least 1 character long',
      'string.max': 'Category name cannot exceed 100 characters',
    }),
  description: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Category description cannot exceed 500 characters',
    }),
  parentId: Joi.string()
    .allow(null)
    .pattern(/^[0-9a-fA-F]{24}$/) // MongoDB ObjectId pattern
    .optional()
    .messages({
      'string.pattern.base': 'Parent ID must be a valid MongoDB ObjectId',
    }),
  isActive: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'Active status must be a boolean value',
    }),
  sortOrder: Joi.number()
    .integer()
    .min(0)
    .optional()
    .messages({
      'number.base': 'Sort order must be a number',
      'number.integer': 'Sort order must be an integer',
      'number.min': 'Sort order cannot be negative',
    }),
  icon: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Icon reference cannot exceed 100 characters',
    }),
  color: Joi.string()
    .max(7)
    .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/) // Hex color pattern
    .optional()
    .messages({
      'string.max': 'Color code cannot exceed 7 characters',
      'string.pattern.base': 'Color must be a valid hex code (e.g., #FF0000)',
    }),
});

module.exports = {
  validateCreateCategory: (req, res, next) => {
    const { error } = createCategorySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }
    next();
  },
  
  validateUpdateCategory: (req, res, next) => {
    const { error } = updateCategorySchema.validate(req.body);
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