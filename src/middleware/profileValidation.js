const Joi = require('joi');

// Validation schema for profile creation
const createProfileSchema = Joi.object({
  bio: Joi.string().max(500).optional(),
  avatar: Joi.string().uri().optional(),
  location: Joi.string().max(100).optional(),
  skills: Joi.array().items(Joi.string().max(50).trim()).max(20).optional(),
  languages: Joi.array().items(
    Joi.object({
      language: Joi.string().trim().required(),
      level: Joi.string().valid('beginner', 'intermediate', 'advanced', 'fluent', 'native').optional().default('intermediate')
    })
  ).max(10).optional(),
  contacts: Joi.array().items(
    Joi.object({
      type: Joi.string().valid('email', 'phone', 'website', 'social').required(),
      value: Joi.string().required()
    })
  ).max(10).optional(),
  portfolio: Joi.array().items(
    Joi.object({
      title: Joi.string().trim().required(),
      description: Joi.string().optional(),
      url: Joi.string().uri().optional(),
      media: Joi.array().items(Joi.string().uri()).max(10).optional()
    })
  ).max(20).optional(),
  responseTimeHours: Joi.number().min(1).max(168).optional(), // Max 168 hours = 1 week
  availability: Joi.string().valid('always', 'weekdays', 'weekends', 'rarely').optional()
});

// Validation schema for profile updates
const updateProfileSchema = Joi.object({
  bio: Joi.string().max(500).optional(),
  avatar: Joi.string().uri().optional(),
  location: Joi.string().max(100).optional(),
  skills: Joi.array().items(Joi.string().max(50).trim()).max(20).optional(),
  languages: Joi.array().items(
    Joi.object({
      language: Joi.string().trim().required(),
      level: Joi.string().valid('beginner', 'intermediate', 'advanced', 'fluent', 'native').optional().default('intermediate')
    })
  ).max(10).optional(),
  contacts: Joi.array().items(
    Joi.object({
      type: Joi.string().valid('email', 'phone', 'website', 'social').required(),
      value: Joi.string().required()
    })
  ).max(10).optional(),
  portfolio: Joi.array().items(
    Joi.object({
      title: Joi.string().trim().required(),
      description: Joi.string().optional(),
      url: Joi.string().uri().optional(),
      media: Joi.array().items(Joi.string().uri()).max(10).optional()
    })
  ).max(20).optional(),
  responseTimeHours: Joi.number().min(1).max(168).optional(),
  availability: Joi.string().valid('always', 'weekdays', 'weekends', 'rarely').optional()
});

module.exports = {
  validateCreateProfile: (req, res, next) => {
    const { error } = createProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }
    next();
  },
  
  validateUpdateProfile: (req, res, next) => {
    const { error } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }
    next();
  },

  validateAddSkill: (req, res, next) => {
    const { skill } = req.body;

    if (!skill || typeof skill !== 'string' || skill.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Skill is required and must be a non-empty string'
      });
    }

    if (skill.trim().length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Skill name cannot exceed 50 characters'
      });
    }

    next();
  },

  validateUpdateSkill: (req, res, next) => {
    const { oldSkill, newSkill } = req.body;

    if (!oldSkill || typeof oldSkill !== 'string' || oldSkill.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Old skill name is required and must be a non-empty string'
      });
    }

    if (!newSkill || typeof newSkill !== 'string' || newSkill.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'New skill name is required and must be a non-empty string'
      });
    }

    if (newSkill.trim().length > 50) {
      return res.status(400).json({
        success: false,
        message: 'New skill name cannot exceed 50 characters'
      });
    }

    next();
  },

  validateAddLanguage: (req, res, next) => {
    const { language, level } = req.body;

    if (!language || typeof language !== 'string' || language.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Language is required and must be a non-empty string'
      });
    }

    const validLevels = ['beginner', 'intermediate', 'advanced', 'fluent', 'native'];
    if (level && (!validLevels.includes(level.toLowerCase()))) {
      return res.status(400).json({
        success: false,
        message: `Level must be one of: ${validLevels.join(', ')}`
      });
    }

    next();
  },

  validateUpdateLanguage: (req, res, next) => {
    const { language, newLanguage, newLevel } = req.body;

    if (!language || typeof language !== 'string' || language.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Language name is required and must be a non-empty string'
      });
    }

    const validLevels = ['beginner', 'intermediate', 'advanced', 'fluent', 'native'];
    if (newLanguage && (typeof newLanguage !== 'string' || newLanguage.trim().length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'New language must be a non-empty string if provided'
      });
    }

    if (newLevel && !validLevels.includes(newLevel.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Level must be one of: ${validLevels.join(', ')}`
      });
    }

    next();
  }
};