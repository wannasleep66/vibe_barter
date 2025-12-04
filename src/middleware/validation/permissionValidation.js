// src/middleware/validation/permissionValidation.js
const Joi = require('joi');
const Permission = require('../../models/Permission');
const AppError = require('../../utils/AppError');

// Schema for creating a permission
const createPermissionSchema = Joi.object({
  name: Joi.string()
    .alphanum()
    .min(3)
    .max(50)
    .required()
    .messages({
      'string.alphanum': 'Permission name must contain only alphanumeric characters',
      'string.min': 'Permission name must be at least 3 characters long',
      'string.max': 'Permission name cannot exceed 50 characters',
      'any.required': 'Permission name is required'
    }),
  description: Joi.string()
    .max(200)
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 200 characters'
    }),
  resource: Joi.string()
    .alphanum()
    .min(2)
    .max(30)
    .required()
    .messages({
      'string.alphanum': 'Resource name must contain only alphanumeric characters',
      'string.min': 'Resource name must be at least 2 characters long',
      'string.max': 'Resource name cannot exceed 30 characters',
      'any.required': 'Resource name is required'
    }),
  action: Joi.string()
    .alphanum()
    .min(2)
    .max(20)
    .required()
    .messages({
      'string.alphanum': 'Action name must contain only alphanumeric characters',
      'string.min': 'Action name must be at least 2 characters long',
      'string.max': 'Action name cannot exceed 20 characters',
      'any.required': 'Action name is required'
    }),
  isActive: Joi.boolean()
});

// Schema for updating a permission
const updatePermissionSchema = Joi.object({
  name: Joi.string()
    .alphanum()
    .min(3)
    .max(50)
    .messages({
      'string.alphanum': 'Permission name must contain only alphanumeric characters',
      'string.min': 'Permission name must be at least 3 characters long',
      'string.max': 'Permission name cannot exceed 50 characters'
    }),
  description: Joi.string()
    .max(200)
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 200 characters'
    }),
  resource: Joi.string()
    .alphanum()
    .min(2)
    .max(30)
    .messages({
      'string.alphanum': 'Resource name must contain only alphanumeric characters',
      'string.min': 'Resource name must be at least 2 characters long',
      'string.max': 'Resource name cannot exceed 30 characters'
    }),
  action: Joi.string()
    .alphanum()
    .min(2)
    .max(20)
    .messages({
      'string.alphanum': 'Action name must contain only alphanumeric characters',
      'string.min': 'Action name must be at least 2 characters long',
      'string.max': 'Action name cannot exceed 20 characters'
    }),
  isActive: Joi.boolean()
}).min(1); // At least one field must be provided for update

// Validation middleware for creating a permission
exports.validateCreatePermission = async (req, res, next) => {
  try {
    // Validate the request body
    const validatedData = await createPermissionSchema.validateAsync(req.body, { abortEarly: false });

    // Check if permission name is already in use
    const existingPermission = await Permission.findOne({ name: validatedData.name });
    if (existingPermission) {
      return next(new AppError(`Permission with name '${validatedData.name}' already exists`, 409));
    }

    req.validatedBody = validatedData;
    next();
  } catch (error) {
    if (error.isJoi || error.name === 'ValidationError') {
      const errors = error.details.map(detail => detail.message);
      return next(new AppError(`Validation error: ${errors.join(', ')}`, 400));
    }
    return next(error);
  }
};

// Validation middleware for updating a permission
exports.validateUpdatePermission = async (req, res, next) => {
  try {
    // Validate the request body
    const validatedData = await updatePermissionSchema.validateAsync(req.body, { abortEarly: false });

    // If name is being updated, check if it's already in use by another permission
    if (validatedData.name) {
      const existingPermission = await Permission.findOne({
        name: validatedData.name,
        _id: { $ne: req.params.id }
      });
      if (existingPermission) {
        return next(new AppError(`Permission with name '${validatedData.name}' already exists`, 409));
      }
    }

    req.validatedBody = validatedData;
    next();
  } catch (error) {
    if (error.isJoi || error.name === 'ValidationError') {
      const errors = error.details.map(detail => detail.message);
      return next(new AppError(`Validation error: ${errors.join(', ')}`, 400));
    }
    return next(error);
  }
};

// Validation middleware for permission ID parameter
exports.validatePermissionId = async (req, res, next) => {
  try {
    // Check if the ID is a valid MongoDB ObjectId
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
    if (!isValidObjectId) {
      return next(new AppError('Invalid permission ID format', 400));
    }
    
    // Check if permission exists
    const permission = await Permission.findById(req.params.id);
    if (!permission) {
      return next(new AppError('Permission not found', 404));
    }
    
    next();
  } catch (error) {
    return next(error);
  }
};

// Validation middleware for getting permissions with query parameters
exports.validateGetPermissions = async (req, res, next) => {
  try {
    const schema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      search: Joi.string().min(1).max(50),
      resource: Joi.string().alphanum().min(2).max(30),
      action: Joi.string().alphanum().min(2).max(20),
      isActive: Joi.boolean(),
      sort: Joi.string().valid('createdAt', '-createdAt', 'name', '-name', 'resource', '-resource', 'action', '-action')
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

// Validation middleware for permission search
exports.validateSearchPermissions = async (req, res, next) => {
  try {
    const schema = Joi.object({
      q: Joi.string().min(1).max(50).required(),
      resource: Joi.string().alphanum().min(2).max(30),
      action: Joi.string().alphanum().min(2).max(20),
      limit: Joi.number().integer().min(1).max(50).default(20)
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