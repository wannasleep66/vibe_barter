// src/middleware/validation/userValidation.js
const Joi = require('joi');
const User = require('../../models/User');
const AppError = require('../../utils/AppError');

// Schema for creating a user
const createUserSchema = Joi.object({
  firstName: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name cannot exceed 50 characters',
      'any.required': 'First name is required'
    }),
  lastName: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name cannot exceed 50 characters',
      'any.required': 'Last name is required'
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .min(6)
    .max(128)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{6,}$'))
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
  role: Joi.string()
    .valid('user', 'moderator', 'admin'),
  isEmailVerified: Joi.boolean()
});

// Schema for updating a user
const updateUserSchema = Joi.object({
  firstName: Joi.string()
    .min(2)
    .max(50)
    .messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name cannot exceed 50 characters'
    }),
  lastName: Joi.string()
    .min(2)
    .max(50)
    .messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name cannot exceed 50 characters'
    }),
  email: Joi.string()
    .email()
    .messages({
      'string.email': 'Please provide a valid email address'
    }),
  password: Joi.string()
    .min(6)
    .max(128)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{6,}$'))
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }),
  role: Joi.string()
    .valid('user', 'moderator', 'admin'),
  isEmailVerified: Joi.boolean(),
  isActive: Joi.boolean()
});

// Validation middleware for user creation
exports.validateCreateUser = async (req, res, next) => {
  try {
    // Validate the input
    await createUserSchema.validateAsync(req.body, { abortEarly: false });
    
    // Additional check: verify email is unique
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return next(new AppError('Email already exists', 409));
    }
    
    next();
  } catch (error) {
    if (error.isJoi || error.name === 'ValidationError') {
      const errors = error.details.map(detail => detail.message);
      return next(new AppError(`Validation error: ${errors.join(', ')}`, 400));
    }
    return next(error);
  }
};

// Validation middleware for user updates
exports.validateUpdateUser = async (req, res, next) => {
  try {
    // Validate the input
    await updateUserSchema.validateAsync(req.body, { abortEarly: false });
    
    // Additional check: if email is being updated, verify it's unique
    if (req.body.email) {
      const existingUser = await User.findOne({ 
        email: req.body.email, 
        _id: { $ne: req.params.id } 
      });
      
      if (existingUser) {
        return next(new AppError('Email already exists', 409));
      }
    }
    
    next();
  } catch (error) {
    if (error.isJoi || error.name === 'ValidationError') {
      const errors = error.details.map(detail => detail.message);
      return next(new AppError(`Validation error: ${errors.join(', ')}`, 400));
    }
    return next(error);
  }
};

// Validation middleware for user ID parameter
exports.validateUserId = async (req, res, next) => {
  try {
    // Check if the ID is a valid MongoDB ObjectId
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
    if (!isValidObjectId) {
      return next(new AppError('Invalid user ID format', 400));
    }
    
    next();
  } catch (error) {
    return next(new AppError('Invalid user ID format', 400));
  }
};

// Validation for getting users with query parameters
exports.validateGetUsers = async (req, res, next) => {
  try {
    const schema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      sort: Joi.string().valid('createdAt', '-createdAt', 'email', '-email', 'firstName', '-firstName', 'lastName', '-lastName'),
      search: Joi.string().min(1).max(50),
      role: Joi.string().valid('user', 'moderator', 'admin'),
      isActive: Joi.boolean()
    });
    
    const validated = await schema.validateAsync(req.query, { abortEarly: false });
    req.query = validated;
    
    next();
  } catch (error) {
    if (error.isJoi || error.name === 'ValidationError') {
      const errors = error.details.map(detail => detail.message);
      return next(new AppError(`Validation error: ${errors.join(', ')}`, 400));
    }
    return next(error);
  }
};