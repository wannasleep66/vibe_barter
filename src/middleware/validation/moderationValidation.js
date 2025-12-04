// src/middleware/validation/moderationValidation.js
const Joi = require('joi');

// Schema for reporting an advertisement
const reportAdvertisementSchema = Joi.object({
  reason: Joi.string()
    .valid(
      'inappropriate_content',
      'spam',
      'misleading_information', 
      'offensive_language',
      'fraudulent',
      'duplicate',
      'other'
    )
    .required()
    .messages({
      'any.required': 'Reason is required',
      'string.empty': 'Reason cannot be empty',
      'any.only': 'Reason must be one of: inappropriate_content, spam, misleading_information, offensive_language, fraudulent, duplicate, other'
    }),
  details: Joi.string()
    .max(1000)
    .optional()
    .messages({
      'string.max': 'Details cannot exceed 1000 characters'
    })
});

// Schema for reviewing a report
const reviewReportSchema = Joi.object({
  action: Joi.string()
    .valid('hide', 'dismiss', 'warn', 'restore', 'maintain_hide')
    .required()
    .messages({
      'any.required': 'Action is required',
      'string.empty': 'Action cannot be empty',
      'any.only': 'Action must be one of: hide, dismiss, warn, restore, maintain_hide'
    }),
  resolutionNotes: Joi.string()
    .max(1000)
    .optional()
    .messages({
      'string.max': 'Resolution notes cannot exceed 1000 characters'
    })
});

// Schema for moderator actions
const moderatorActionSchema = Joi.object({
  reason: Joi.string()
    .max(500)
    .required()
    .messages({
      'string.max': 'Reason cannot exceed 500 characters',
      'any.required': 'Reason is required',
      'string.empty': 'Reason cannot be empty'
    })
});

// Schema for appeal submission
const appealSubmissionSchema = Joi.object({
  reason: Joi.string()
    .max(500)
    .required()
    .messages({
      'string.max': 'Reason cannot exceed 500 characters',
      'any.required': 'Reason is required',
      'string.empty': 'Reason cannot be empty'
    })
});

module.exports = {
  validateReportAdvertisement: (req, res, next) => {
    const { error } = reportAdvertisementSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }
    next();
  },

  validateReviewReport: (req, res, next) => {
    const { error } = reviewReportSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }
    next();
  },

  validateModeratorAction: (req, res, next) => {
    const { error } = moderatorActionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }
    next();
  },

  validateAppealSubmission: (req, res, next) => {
    const { error } = appealSubmissionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }
    next();
  },

  // Middleware to validate advertisement ID parameter
  validateAdvertisementId: (req, res, next) => {
    const advertisementId = req.params.id || req.params.advertisementId;
    
    if (!advertisementId || !/^[0-9a-fA-F]{24}$/.test(advertisementId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid advertisement ID format'
      });
    }
    
    next();
  },

  // Middleware to validate report ID parameter
  validateReportId: (req, res, next) => {
    const reportId = req.params.id || req.params.reportId;
    
    if (!reportId || !/^[0-9a-fA-F]{24}$/.test(reportId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report ID format'
      });
    }
    
    next();
  }
};