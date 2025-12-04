// src/middleware/validation/chatValidation.js
const Joi = require('joi');
const Chat = require('../../models/Chat');

// Validation schema for creating a chat
const createChatSchema = Joi.object({
  participants: Joi.array()
    .items(Joi.string().length(24).hex()) // Assuming ObjectId format
    .min(2)
    .required()
    .messages({
      'array.min': 'Chat must have at least 2 participants',
      'string.length': 'Invalid participant ID format',
      'string.hex': 'Invalid participant ID format'
    }),
  advertisementId: Joi.string().length(24).hex().optional(),
  applicationId: Joi.string().length(24).hex().optional(),
  title: Joi.string().max(100).optional(),
  isGroup: Joi.boolean().optional()
});

// Validation schema for updating a chat
const updateChatSchema = Joi.object({
  title: Joi.string().max(100).optional(),
  isGroup: Joi.boolean().optional()
});

// Validation schema for adding a participant
const addParticipantSchema = Joi.object({
  participantId: Joi.string().length(24).hex().required()
});

// Validation schema for removing a participant
const removeParticipantSchema = Joi.object({
  participantId: Joi.string().length(24).hex().required()
});

module.exports = {
  validateCreateChat: (req, res, next) => {
    const { error } = createChatSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }
    next();
  },

  validateUpdateChat: (req, res, next) => {
    const { error } = updateChatSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }
    next();
  },

  validateAddParticipant: (req, res, next) => {
    const { error } = addParticipantSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }
    next();
  },

  validateRemoveParticipant: (req, res, next) => {
    const { error } = removeParticipantSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }
    next();
  },

  // Middleware to validate chat ID parameter
  validateChatId: (req, res, next) => {
    const chatId = req.params.id || req.params.chatId;
    
    if (!chatId || !/^[0-9a-fA-F]{24}$/.test(chatId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid chat ID format'
      });
    }
    
    next();
  },

  // Middleware to validate pagination parameters
  validateGetChatsQuery: (req, res, next) => {
    const { page, limit, includeArchived, sortBy, sortOrder } = req.query;
    
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
    
    // Validate includeArchived
    if (includeArchived !== undefined && !['true', 'false'].includes(includeArchived)) {
      return res.status(400).json({
        success: false,
        message: 'includeArchived must be either "true" or "false"'
      });
    }
    
    // Validate sortOrder
    if (sortOrder !== undefined && !['1', '-1', 'asc', 'desc'].includes(sortOrder)) {
      return res.status(400).json({
        success: false,
        message: 'sortOrder must be either "1", "-1", "asc", or "desc"'
      });
    }
    
    next();
  }
};