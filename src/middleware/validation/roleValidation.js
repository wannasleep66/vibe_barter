// src/middleware/validation/roleValidation.js
const Joi = require('joi');
const Role = require('../../models/Role');
const Permission = require('../../models/Permission');
const AppError = require('../../utils/AppError');

// Schema for creating a role
const createRoleSchema = Joi.object({
  name: Joi.string()
    .alphanum()
    .min(2)
    .max(30)
    .required()
    .messages({
      'string.alphanum': 'Role name must contain only alphanumeric characters',
      'string.min': 'Role name must be at least 2 characters long',
      'string.max': 'Role name cannot exceed 30 characters',
      'any.required': 'Role name is required'
    }),
  description: Joi.string()
    .max(200)
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 200 characters'
    }),
  permissions: Joi.array()
    .items(Joi.string().hex().length(24)) // Assuming MongoDB ObjectId format
    .messages({
      'array.base': 'Permissions must be an array of permission IDs'
    })
});

// Schema for updating a role
const updateRoleSchema = Joi.object({
  name: Joi.string()
    .alphanum()
    .min(2)
    .max(30)
    .messages({
      'string.alphanum': 'Role name must contain only alphanumeric characters',
      'string.min': 'Role name must be at least 2 characters long',
      'string.max': 'Role name cannot exceed 30 characters'
    }),
  description: Joi.string()
    .max(200)
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 200 characters'
    }),
  permissions: Joi.array()
    .items(Joi.string().hex().length(24)) // Assuming MongoDB ObjectId format
    .messages({
      'array.base': 'Permissions must be an array of permission IDs'
    })
}).min(1); // At least one field must be provided for update

// Schema for assigning role to user
const assignRoleToUserSchema = Joi.object({
  userId: Joi.string()
    .hex()
    .length(24)
    .required()
    .messages({
      'string.hex': 'User ID must be a valid hexadecimal string',
      'string.length': 'User ID must be a valid MongoDB ObjectId (24 characters)',
      'any.required': 'User ID is required'
    }),
  roleName: Joi.string()
    .alphanum()
    .min(2)
    .max(30)
    .required()
    .messages({
      'string.alphanum': 'Role name must contain only alphanumeric characters',
      'string.min': 'Role name must be at least 2 characters long',
      'string.max': 'Role name cannot exceed 30 characters',
      'any.required': 'Role name is required'
    })
});

// Schema for adding permission to role
const addPermissionToRoleSchema = Joi.object({
  roleName: Joi.string()
    .alphanum()
    .min(2)
    .max(30)
    .required()
    .messages({
      'string.alphanum': 'Role name must contain only alphanumeric characters',
      'string.min': 'Role name must be at least 2 characters long',
      'string.max': 'Role name cannot exceed 30 characters',
      'any.required': 'Role name is required'
    }),
  permissionName: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.min': 'Permission name is required',
      'string.max': 'Permission name cannot exceed 50 characters',
      'any.required': 'Permission name is required'
    })
});

// Validation middleware for creating a role
exports.validateCreateRole = async (req, res, next) => {
  try {
    // Validate the request body
    await createRoleSchema.validateAsync(req.body, { abortEarly: false });
    
    const { name, permissions } = req.body;
    
    // Check if role name is already in use
    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      return next(new AppError(`Role with name '${name}' already exists`, 409));
    }
    
    // If permissions are provided, validate that they exist
    if (permissions && permissions.length > 0) {
      const existingPermissions = await Permission.find({ _id: { $in: permissions } });
      if (existingPermissions.length !== permissions.length) {
        const invalidPermissionIds = permissions.filter(id => 
          !existingPermissions.some(perm => perm._id.toString() === id)
        );
        return next(new AppError(`Invalid permission IDs: ${invalidPermissionIds.join(', ')}`, 400));
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

// Validation middleware for updating a role
exports.validateUpdateRole = async (req, res, next) => {
  try {
    // Validate the request body
    const validatedData = await updateRoleSchema.validateAsync(req.body, { abortEarly: false });
    
    const { name } = validatedData;
    
    // If name is being updated, check if it's already in use by another role
    if (name) {
      const existingRole = await Role.findOne({ name, _id: { $ne: req.params.id } });
      if (existingRole) {
        return next(new AppError(`Role with name '${name}' already exists`, 409));
      }
    }
    
    // If permissions are provided, validate that they exist
    if (validatedData.permissions) {
      const existingPermissions = await Permission.find({ _id: { $in: validatedData.permissions } });
      if (existingPermissions.length !== validatedData.permissions.length) {
        const invalidPermissionIds = validatedData.permissions.filter(id => 
          !existingPermissions.some(perm => perm._id.toString() === id)
        );
        return next(new AppError(`Invalid permission IDs: ${invalidPermissionIds.join(', ')}`, 400));
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

// Validation middleware for assigning role to user
exports.validateAssignRoleToUser = async (req, res, next) => {
  try {
    await assignRoleToUserSchema.validateAsync(req.body, { abortEarly: false });
    
    const { userId, roleName } = req.body;
    
    // Check if role exists
    const role = await Role.findOne({ name: roleName });
    if (!role) {
      return next(new AppError(`Role '${roleName}' does not exist`, 404));
    }
    
    // Check if user exists
    const User = require('../../models/User'); // Require here to avoid circular dependency
    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError(`User with ID '${userId}' does not exist`, 404));
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

// Validation middleware for adding permission to role
exports.validateAddPermissionToRole = async (req, res, next) => {
  try {
    await addPermissionToRoleSchema.validateAsync(req.body, { abortEarly: false });
    
    const { roleName, permissionName } = req.body;
    
    // Check if role exists
    const role = await Role.findOne({ name: roleName });
    if (!role) {
      return next(new AppError(`Role '${roleName}' does not exist`, 404));
    }
    
    // Check if permission exists
    const permission = await Permission.findOne({ name: permissionName });
    if (!permission) {
      return next(new AppError(`Permission '${permissionName}' does not exist`, 404));
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

// Validation middleware for role ID parameter
exports.validateRoleId = async (req, res, next) => {
  try {
    // Check if the ID is a valid MongoDB ObjectId
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
    if (!isValidObjectId) {
      return next(new AppError('Invalid role ID format', 400));
    }
    
    // Check if role exists
    const role = await Role.findById(req.params.id);
    if (!role) {
      return next(new AppError('Role not found', 404));
    }
    
    next();
  } catch (error) {
    return next(error);
  }
};

// Validation middleware for role name parameter
exports.validateRoleName = async (req, res, next) => {
  try {
    // Check if role name is valid
    const isValidName = /^[a-zA-Z0-9_]+$/.test(req.params.roleName);
    if (!isValidName) {
      return next(new AppError('Invalid role name format', 400));
    }
    
    // Check if role exists
    const role = await Role.findOne({ name: req.params.roleName });
    if (!role) {
      return next(new AppError(`Role '${req.params.roleName}' does not exist`, 404));
    }
    
    next();
  } catch (error) {
    return next(error);
  }
};

// Validation middleware for getting all roles with optional filters
exports.validateGetRoles = async (req, res, next) => {
  try {
    const schema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      sort: Joi.string().valid('createdAt', '-createdAt', 'name', '-name'),
      search: Joi.string().min(1).max(50),
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