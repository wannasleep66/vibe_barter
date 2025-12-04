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
  },

  validateAddContact: (req, res, next) => {
    const { type, value } = req.body;

    const validContactTypes = ['email', 'phone', 'website', 'social'];
    if (!type || typeof type !== 'string' || !validContactTypes.includes(type.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Contact type is required and must be one of: ${validContactTypes.join(', ')}`
      });
    }

    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Contact value is required and must be a non-empty string'
      });
    }

    next();
  },

  validateUpdateContact: (req, res, next) => {
    const { currentType, currentValue, newType, newValue } = req.body;

    const validContactTypes = ['email', 'phone', 'website', 'social'];
    if (!currentType || typeof currentType !== 'string' || !validContactTypes.includes(currentType.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Current contact type is required and must be one of: ${validContactTypes.join(', ')}`
      });
    }

    if (!currentValue || typeof currentValue !== 'string' || currentValue.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Current contact value is required and must be a non-empty string'
      });
    }

    if (newType && (typeof newType !== 'string' || !validContactTypes.includes(newType.toLowerCase()))) {
      return res.status(400).json({
        success: false,
        message: `New contact type must be one of: ${validContactTypes.join(', ')}`
      });
    }

    if (newValue !== undefined && (typeof newValue !== 'string' || newValue.trim().length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'New contact value must be a non-empty string'
      });
    }

    next();
  },

  validateAddPortfolioItem: (req, res, next) => {
    const { title, description, url, media } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Title is required and must be a non-empty string'
      });
    }

    if (description !== undefined && typeof description !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Description must be a string if provided'
      });
    }

    if (url && (typeof url !== 'string' || !isValidUrl(url))) {
      return res.status(400).json({
        success: false,
        message: 'URL must be a valid URL string if provided'
      });
    }

    if (media && !Array.isArray(media)) {
      return res.status(400).json({
        success: false,
        message: 'Media must be an array of URLs if provided'
      });
    }

    if (media && Array.isArray(media)) {
      for (const item of media) {
        if (typeof item !== 'string' || !isValidUrl(item)) {
          return res.status(400).json({
            success: false,
            message: `Invalid URL in media array: ${item}`
          });
        }
      }
    }

    next();
  },

  validateUpdatePortfolioItem: (req, res, next) => {
    const { currentTitle, newTitle, description, url, media } = req.body;

    if (!currentTitle || typeof currentTitle !== 'string' || currentTitle.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Current title is required and must be a non-empty string'
      });
    }

    if (newTitle && (typeof newTitle !== 'string' || newTitle.trim().length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'New title must be a non-empty string if provided'
      });
    }

    if (description !== undefined && typeof description !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Description must be a string if provided'
      });
    }

    if (url !== undefined && url !== null && (typeof url !== 'string' || !isValidUrl(url))) {
      return res.status(400).json({
        success: false,
        message: 'URL must be a valid URL string if provided'
      });
    }

    if (media !== undefined && !Array.isArray(media)) {
      return res.status(400).json({
        success: false,
        message: 'Media must be an array of URLs if provided'
      });
    }

    if (media && Array.isArray(media)) {
      for (const item of media) {
        if (typeof item !== 'string' || !isValidUrl(item)) {
          return res.status(400).json({
            success: false,
            message: `Invalid URL in media array: ${item}`
          });
        }
      }
    }

    next();
  },

  validateUpdatePreferences: (req, res, next) => {
    const {
      preferredCategories,
      preferredTypes,
      preferredTags,
      preferredLocations,
      minRating,
      maxDistance,
      exchangePreferences,
      excludeInactiveUsers,
      excludeLowRatingUsers,
      minAuthorRating,
      preferenceScoreWeights
    } = req.body;

    // Validate preferredCategories if provided
    if (preferredCategories !== undefined) {
      if (!Array.isArray(preferredCategories)) {
        return res.status(400).json({
          success: false,
          message: 'Preferred categories must be an array of ObjectIds'
        });
      }
      // Check each category ID is a valid ObjectId format (basic check)
      for (const catId of preferredCategories) {
        if (typeof catId !== 'string' || !/^[0-9a-fA-F]{24}$/.test(catId)) {
          return res.status(400).json({
            success: false,
            message: 'Each category ID must be a valid ObjectId string'
          });
        }
      }
    }

    // Validate preferredTypes if provided
    if (preferredTypes !== undefined) {
      if (!Array.isArray(preferredTypes)) {
        return res.status(400).json({
          success: false,
          message: 'Preferred types must be an array'
        });
      }
      const validTypes = ['service', 'goods', 'skill', 'experience'];
      for (const type of preferredTypes) {
        if (typeof type !== 'string' || !validTypes.includes(type.toLowerCase())) {
          return res.status(400).json({
            success: false,
            message: `Each type must be one of: ${validTypes.join(', ')}`
          });
        }
      }
    }

    // Validate preferredTags if provided
    if (preferredTags !== undefined) {
      if (!Array.isArray(preferredTags)) {
        return res.status(400).json({
          success: false,
          message: 'Preferred tags must be an array of ObjectIds'
        });
      }
      // Check each tag ID is a valid ObjectId format (basic check)
      for (const tagId of preferredTags) {
        if (typeof tagId !== 'string' || !/^[0-9a-fA-F]{24}$/.test(tagId)) {
          return res.status(400).json({
            success: false,
            message: 'Each tag ID must be a valid ObjectId string'
          });
        }
      }
    }

    // Validate preferredLocations if provided
    if (preferredLocations !== undefined) {
      if (!Array.isArray(preferredLocations)) {
        return res.status(400).json({
          success: false,
          message: 'Preferred locations must be an array of strings'
        });
      }
      for (const location of preferredLocations) {
        if (typeof location !== 'string' || location.trim().length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Each location must be a non-empty string'
          });
        }
        if (location.length > 100) {
          return res.status(400).json({
            success: false,
            message: 'Each location cannot exceed 100 characters'
          });
        }
      }
    }

    // Validate minRating if provided
    if (minRating !== undefined) {
      if (typeof minRating !== 'number' || minRating < 0 || minRating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Min rating must be a number between 0 and 5'
        });
      }
    }

    // Validate maxDistance if provided
    if (maxDistance !== undefined) {
      if (typeof maxDistance !== 'number' || maxDistance < 1 || maxDistance > 10000) {
        return res.status(400).json({
          success: false,
          message: 'Max distance must be a positive number (e.g., in kilometers)'
        });
      }
    }

    // Validate exchangePreferences if provided
    if (exchangePreferences !== undefined) {
      if (typeof exchangePreferences !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Exchange preferences must be a string'
        });
      }
      if (exchangePreferences.length > 500) {
        return res.status(400).json({
          success: false,
          message: 'Exchange preferences cannot exceed 500 characters'
        });
      }
    }

    // Validate excludeInactiveUsers if provided
    if (excludeInactiveUsers !== undefined) {
      if (typeof excludeInactiveUsers !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'Exclude inactive users must be a boolean'
        });
      }
    }

    // Validate excludeLowRatingUsers if provided
    if (excludeLowRatingUsers !== undefined) {
      if (typeof excludeLowRatingUsers !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'Exclude low rating users must be a boolean'
        });
      }
    }

    // Validate minAuthorRating if provided
    if (minAuthorRating !== undefined) {
      if (typeof minAuthorRating !== 'number' || minAuthorRating < 0 || minAuthorRating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Min author rating must be a number between 0 and 5'
        });
      }
    }

    // Validate preferenceScoreWeights if provided
    if (preferenceScoreWeights !== undefined) {
      if (typeof preferenceScoreWeights !== 'object' || preferenceScoreWeights === null) {
        return res.status(400).json({
          success: false,
          message: 'Preference score weights must be an object'
        });
      }

      const { categoryMatch, typeMatch, tagMatch, locationMatch, ratingMatch } = preferenceScoreWeights;

      if (categoryMatch !== undefined && (typeof categoryMatch !== 'number' || categoryMatch < 0 || categoryMatch > 1)) {
        return res.status(400).json({
          success: false,
          message: 'Category match weight must be a number between 0 and 1'
        });
      }

      if (typeMatch !== undefined && (typeof typeMatch !== 'number' || typeMatch < 0 || typeMatch > 1)) {
        return res.status(400).json({
          success: false,
          message: 'Type match weight must be a number between 0 and 1'
        });
      }

      if (tagMatch !== undefined && (typeof tagMatch !== 'number' || tagMatch < 0 || tagMatch > 1)) {
        return res.status(400).json({
          success: false,
          message: 'Tag match weight must be a number between 0 and 1'
        });
      }

      if (locationMatch !== undefined && (typeof locationMatch !== 'number' || locationMatch < 0 || locationMatch > 1)) {
        return res.status(400).json({
          success: false,
          message: 'Location match weight must be a number between 0 and 1'
        });
      }

      if (ratingMatch !== undefined && (typeof ratingMatch !== 'number' || ratingMatch < 0 || ratingMatch > 1)) {
        return res.status(400).json({
          success: false,
          message: 'Rating match weight must be a number between 0 and 1'
        });
      }
    }

    next();
  }
};

// Helper function to validate URL
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}