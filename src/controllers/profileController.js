const Profile = require('../models/Profile');
const User = require('../models/User');
const FileHandler = require('../utils/FileHandler');
const { logger } = require('../logger/logger');

const fileHandler = new FileHandler('./uploads');

class ProfileController {
  // Create profile
  static async createProfile(req, res) {
    try {
      const { bio, avatar, location, skills, languages, contacts, portfolio, responseTimeHours, availability } = req.body;

      // Check if user already has a profile
      const existingProfile = await Profile.findOne({ user: req.user._id });
      if (existingProfile) {
        return res.status(400).json({
          success: false,
          message: 'User already has a profile'
        });
      }

      // Create new profile
      const profile = new Profile({
        user: req.user._id,
        bio,
        avatar,
        location,
        skills: skills || [],
        languages: languages || [],
        contacts: contacts || [],
        portfolio: portfolio || [],
        responseTimeHours,
        availability
      });

      await profile.save();

      res.status(201).json({
        success: true,
        message: 'Profile created successfully',
        data: profile
      });
    } catch (error) {
      logger.error(`Error creating profile: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error creating profile',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get profile by user ID
  static async getProfile(req, res) {
    try {
      const { userId } = req.params;

      // Find the profile by user ID
      const profile = await Profile.findOne({ user: userId }).populate('user', 'email firstName lastName role');

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      // Check if current user can access this profile
      if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
        // For non-admin users viewing other profiles, we'll return public profile data
        // For now, we'll return the profile data as is, but in a real application
        // you might want to restrict certain fields
      }

      res.status(200).json({
        success: true,
        data: profile
      });
    } catch (error) {
      logger.error(`Error getting profile: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error retrieving profile',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get own profile
  static async getOwnProfile(req, res) {
    try {
      const profile = await Profile.findOne({ user: req.user._id }).populate('user', 'email firstName lastName role');

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      res.status(200).json({
        success: true,
        data: profile
      });
    } catch (error) {
      logger.error(`Error getting own profile: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error retrieving profile',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Update profile
  static async updateProfile(req, res) {
    try {
      const { bio, avatar, location, skills, languages, contacts, portfolio, responseTimeHours, availability } = req.body;

      // Find the profile by user ID
      const profile = await Profile.findOne({ user: req.user._id });

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      // Update only the fields that are provided
      if (bio !== undefined) profile.bio = bio;
      if (avatar !== undefined) profile.avatar = avatar;
      if (location !== undefined) profile.location = location;
      if (skills !== undefined) profile.skills = skills;
      if (languages !== undefined) profile.languages = languages;
      if (contacts !== undefined) profile.contacts = contacts;
      if (portfolio !== undefined) profile.portfolio = portfolio;
      if (responseTimeHours !== undefined) profile.responseTimeHours = responseTimeHours;
      if (availability !== undefined) profile.availability = availability;

      await profile.save();

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: profile
      });
    } catch (error) {
      logger.error(`Error updating profile: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error updating profile',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Delete profile
  static async deleteProfile(req, res) {
    try {
      const profile = await Profile.findOne({ user: req.user._id });

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      // Optionally, we might want to update the associated user to remove the profile reference
      await User.findByIdAndUpdate(req.user._id, { $unset: { profile: 1 } });

      // Delete the profile
      await Profile.deleteOne({ _id: profile._id });

      res.status(200).json({
        success: true,
        message: 'Profile deleted successfully'
      });
    } catch (error) {
      logger.error(`Error deleting profile: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error deleting profile',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get all profiles (for admin use or public directory)
  static async getAllProfiles(req, res) {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        // For non-admin users, only return public profiles (without sensitive data)
        const profiles = await Profile.find({}).populate('user', 'firstName lastName role');

        return res.status(200).json({
          success: true,
          data: profiles
        });
      }

      // For admin users, return all profiles with more details
      const profiles = await Profile.find({}).populate('user', 'email firstName lastName role');

      res.status(200).json({
        success: true,
        data: profiles
      });
    } catch (error) {
      logger.error(`Error getting all profiles: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error retrieving profiles',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Search profiles by location or skills
  static async searchProfiles(req, res) {
    try {
      const { location, skills, page = 1, limit = 10 } = req.query;
      const query = {};

      if (location) {
        query.location = new RegExp(location, 'i');
      }

      if (skills) {
        const skillArray = Array.isArray(skills) ? skills : skills.split(',');
        query.skills = { $in: skillArray.map(skill => new RegExp(skill.trim(), 'i')) };
      }

      const profiles = await Profile.find(query)
        .populate('user', 'firstName lastName role')
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec();

      const total = await Profile.countDocuments(query);

      res.status(200).json({
        success: true,
        data: profiles,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error(`Error searching profiles: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error searching profiles',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Upload profile photo
  static async uploadProfilePhoto(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file provided'
        });
      }

      // Validate file content to ensure it's a legitimate image
      const isValid = await fileHandler.validateFileContent(req.file.path, req.file.mimetype);
      if (!isValid) {
        // Remove the potentially malicious file
        await fileHandler.removeFile(req.file.filename);
        return res.status(400).json({
          success: false,
          message: 'File validation failed. Possible malicious content detected.'
        });
      }

      // Process the image (resize and optimize)
      try {
        await fileHandler.processProfilePhoto(req.file.path, {
          width: 300,
          height: 300,
          quality: 80
        });
      } catch (processError) {
        logger.error(`Error processing profile photo: ${processError.message}`);
        // Remove the file if processing fails
        await fileHandler.removeFile(req.file.filename);
        return res.status(500).json({
          success: false,
          message: 'Error processing image file'
        });
      }

      // Find or create profile for the user
      let profile = await Profile.findOne({ user: req.user._id });
      if (!profile) {
        // Create a basic profile if it doesn't exist
        profile = await Profile.create({
          user: req.user._id,
          avatar: fileHandler.getFileUrl(req.file.filename)
        });
      } else {
        // Update existing profile with new avatar
        // If there was an old avatar, we might want to delete it (optional cleanup)
        const oldAvatar = profile.avatar;
        profile.avatar = fileHandler.getFileUrl(req.file.filename);
        await profile.save();

        // Delete old avatar file if it exists (optional)
        if (oldAvatar && oldAvatar.startsWith('/uploads/')) {
          const oldFilename = oldAvatar.replace('/uploads/', '');
          if (oldFilename !== req.file.filename) { // Don't delete the new file
            await fileHandler.removeFile(oldFilename);
          }
        }
      }

      res.status(200).json({
        success: true,
        message: 'Profile photo uploaded successfully',
        data: {
          avatar: profile.avatar
        }
      });
    } catch (error) {
      logger.error(`Error uploading profile photo: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error uploading profile photo',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Remove profile photo
  static async removeProfilePhoto(req, res) {
    try {
      const profile = await Profile.findOne({ user: req.user._id });
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      // If there's an existing avatar, remove the file
      if (profile.avatar && profile.avatar.startsWith('/uploads/')) {
        const filename = profile.avatar.replace('/uploads/', '');
        await fileHandler.removeFile(filename);
      }

      // Remove avatar from profile
      profile.avatar = null;
      await profile.save();

      res.status(200).json({
        success: true,
        message: 'Profile photo removed successfully',
        data: {
          avatar: profile.avatar
        }
      });
    } catch (error) {
      logger.error(`Error removing profile photo: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error removing profile photo',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Add a skill to profile
  static async addSkill(req, res) {
    try {
      const { skill } = req.body;

      // Validate skill input
      if (!skill || typeof skill !== 'string' || skill.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Skill is required and must be a non-empty string'
        });
      }

      const trimmedSkill = skill.trim();

      // Validate skill length
      if (trimmedSkill.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Skill name cannot exceed 50 characters'
        });
      }

      const profile = await Profile.findOne({ user: req.user._id });
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      // Check if skill already exists
      if (profile.skills.includes(trimmedSkill)) {
        return res.status(400).json({
          success: false,
          message: 'Skill already exists in profile'
        });
      }

      // Add skill to profile
      profile.skills.push(trimmedSkill);
      await profile.save();

      res.status(200).json({
        success: true,
        message: 'Skill added successfully',
        data: {
          skills: profile.skills
        }
      });
    } catch (error) {
      logger.error(`Error adding skill: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error adding skill',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get all skills from profile
  static async getSkills(req, res) {
    try {
      const profile = await Profile.findOne({ user: req.user._id });
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          skills: profile.skills
        }
      });
    } catch (error) {
      logger.error(`Error getting skills: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error retrieving skills',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Update a skill in profile (rename skill)
  static async updateSkill(req, res) {
    try {
      const { oldSkill, newSkill } = req.body;

      // Validate inputs
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

      const trimmedOldSkill = oldSkill.trim();
      const trimmedNewSkill = newSkill.trim();

      // Validate new skill length
      if (trimmedNewSkill.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'New skill name cannot exceed 50 characters'
        });
      }

      const profile = await Profile.findOne({ user: req.user._id });
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      // Check if old skill exists
      const oldSkillIndex = profile.skills.findIndex(skill => skill.toLowerCase() === trimmedOldSkill.toLowerCase());
      if (oldSkillIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Skill not found in profile'
        });
      }

      // Check if new skill already exists
      if (profile.skills.includes(trimmedNewSkill)) {
        return res.status(400).json({
          success: false,
          message: 'New skill name already exists in profile'
        });
      }

      // Update the skill
      profile.skills[oldSkillIndex] = trimmedNewSkill;
      await profile.save();

      res.status(200).json({
        success: true,
        message: 'Skill updated successfully',
        data: {
          skills: profile.skills
        }
      });
    } catch (error) {
      logger.error(`Error updating skill: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error updating skill',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Remove a skill from profile
  static async removeSkill(req, res) {
    try {
      const { skill } = req.params;

      if (!skill || skill.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Skill name is required'
        });
      }

      const trimmedSkill = skill.trim();

      const profile = await Profile.findOne({ user: req.user._id });
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      // Check if skill exists
      const skillIndex = profile.skills.findIndex(s => s.toLowerCase() === trimmedSkill.toLowerCase());
      if (skillIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Skill not found in profile'
        });
      }

      // Remove the skill
      profile.skills.splice(skillIndex, 1);
      await profile.save();

      res.status(200).json({
        success: true,
        message: 'Skill removed successfully',
        data: {
          skills: profile.skills
        }
      });
    } catch (error) {
      logger.error(`Error removing skill: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error removing skill',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Add a language to profile
  static async addLanguage(req, res) {
    try {
      const { language, level } = req.body;

      // Validate language input
      if (!language || typeof language !== 'string' || language.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Language is required and must be a non-empty string'
        });
      }

      const trimmedLanguage = language.trim();

      // Validate level if provided
      const validLevels = ['beginner', 'intermediate', 'advanced', 'fluent', 'native'];
      let validatedLevel = 'intermediate'; // default
      if (level) {
        if (typeof level !== 'string' || !validLevels.includes(level.toLowerCase())) {
          return res.status(400).json({
            success: false,
            message: `Level must be one of: ${validLevels.join(', ')}`
          });
        }
        validatedLevel = level.toLowerCase();
      }

      const profile = await Profile.findOne({ user: req.user._id });
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      // Check if language already exists
      const existingLanguage = profile.languages.find(lang =>
        lang.language.toLowerCase() === trimmedLanguage.toLowerCase()
      );
      if (existingLanguage) {
        return res.status(400).json({
          success: false,
          message: 'Language already exists in profile'
        });
      }

      // Add language to profile
      profile.languages.push({
        language: trimmedLanguage,
        level: validatedLevel
      });
      await profile.save();

      res.status(200).json({
        success: true,
        message: 'Language added successfully',
        data: {
          languages: profile.languages
        }
      });
    } catch (error) {
      logger.error(`Error adding language: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error adding language',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get all languages from profile
  static async getLanguages(req, res) {
    try {
      const profile = await Profile.findOne({ user: req.user._id });
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          languages: profile.languages
        }
      });
    } catch (error) {
      logger.error(`Error getting languages: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error retrieving languages',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Update a language in profile
  static async updateLanguage(req, res) {
    try {
      const { language, newLanguage, newLevel } = req.body;

      // Validate inputs
      if (!language || typeof language !== 'string' || language.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Language is required and must be a non-empty string'
        });
      }

      const trimmedLanguage = language.trim();
      let trimmedNewLanguage = trimmedLanguage; // If not provided, keep the same language

      // Validate new language if provided
      if (newLanguage) {
        if (typeof newLanguage !== 'string' || newLanguage.trim().length === 0) {
          return res.status(400).json({
            success: false,
            message: 'New language must be a non-empty string if provided'
          });
        }
        trimmedNewLanguage = newLanguage.trim();
      }

      // Validate level if provided
      const validLevels = ['beginner', 'intermediate', 'advanced', 'fluent', 'native'];
      let validatedNewLevel = null;
      if (newLevel) {
        if (typeof newLevel !== 'string' || !validLevels.includes(newLevel.toLowerCase())) {
          return res.status(400).json({
            success: false,
            message: `Level must be one of: ${validLevels.join(', ')}`
          });
        }
        validatedNewLevel = newLevel.toLowerCase();
      }

      const profile = await Profile.findOne({ user: req.user._id });
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      // Find the language to update
      const languageIndex = profile.languages.findIndex(lang =>
        lang.language.toLowerCase() === trimmedLanguage.toLowerCase()
      );
      if (languageIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Language not found in profile'
        });
      }

      // If updating to a new language name, check if it already exists
      if (trimmedNewLanguage !== trimmedLanguage) {
        const existingLanguage = profile.languages.find((lang, index) =>
          lang.language.toLowerCase() === trimmedNewLanguage.toLowerCase() &&
          index !== languageIndex
        );
        if (existingLanguage) {
          return res.status(400).json({
            success: false,
            message: 'New language name already exists in profile'
          });
        }
      }

      // Update the language
      if (trimmedNewLanguage !== trimmedLanguage) {
        profile.languages[languageIndex].language = trimmedNewLanguage;
      }
      if (validatedNewLevel) {
        profile.languages[languageIndex].level = validatedNewLevel;
      }

      await profile.save();

      res.status(200).json({
        success: true,
        message: 'Language updated successfully',
        data: {
          languages: profile.languages
        }
      });
    } catch (error) {
      logger.error(`Error updating language: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error updating language',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Remove a language from profile
  static async removeLanguage(req, res) {
    try {
      const { language } = req.params;

      if (!language || language.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Language is required'
        });
      }

      const trimmedLanguage = language.trim();

      const profile = await Profile.findOne({ user: req.user._id });
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      // Find the language to remove
      const languageIndex = profile.languages.findIndex(lang =>
        lang.language.toLowerCase() === trimmedLanguage.toLowerCase()
      );
      if (languageIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Language not found in profile'
        });
      }

      // Remove the language
      profile.languages.splice(languageIndex, 1);
      await profile.save();

      res.status(200).json({
        success: true,
        message: 'Language removed successfully',
        data: {
          languages: profile.languages
        }
      });
    } catch (error) {
      logger.error(`Error removing language: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error removing language',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Add a contact to profile
  static async addContact(req, res) {
    try {
      const { type, value } = req.body;

      // Validate type input
      const validContactTypes = ['email', 'phone', 'website', 'social'];
      if (!type || typeof type !== 'string' || !validContactTypes.includes(type.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: `Contact type is required and must be one of: ${validContactTypes.join(', ')}`
        });
      }

      const validatedType = type.toLowerCase();

      // Validate value input
      if (!value || typeof value !== 'string' || value.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Contact value is required and must be a non-empty string'
        });
      }

      const trimmedValue = value.trim();

      const profile = await Profile.findOne({ user: req.user._id });
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      // Check if contact with same type and value already exists
      const existingContact = profile.contacts.find(contact =>
        contact.type.toLowerCase() === validatedType.toLowerCase() &&
        contact.value.toLowerCase() === trimmedValue.toLowerCase()
      );
      if (existingContact) {
        return res.status(400).json({
          success: false,
          message: 'Contact with this type and value already exists in profile'
        });
      }

      // Add contact to profile
      profile.contacts.push({
        type: validatedType,
        value: trimmedValue
      });
      await profile.save();

      res.status(200).json({
        success: true,
        message: 'Contact added successfully',
        data: {
          contacts: profile.contacts
        }
      });
    } catch (error) {
      logger.error(`Error adding contact: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error adding contact',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get all contacts from profile
  static async getContacts(req, res) {
    try {
      const profile = await Profile.findOne({ user: req.user._id });
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          contacts: profile.contacts
        }
      });
    } catch (error) {
      logger.error(`Error getting contacts: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error retrieving contacts',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Update a contact in profile
  static async updateContact(req, res) {
    try {
      const { currentType, currentValue, newType, newValue } = req.body;

      // Validate current type
      const validContactTypes = ['email', 'phone', 'website', 'social'];
      if (!currentType || typeof currentType !== 'string' || !validContactTypes.includes(currentType.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: `Current contact type is required and must be one of: ${validContactTypes.join(', ')}`
        });
      }

      // Validate current value
      if (!currentValue || typeof currentValue !== 'string' || currentValue.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Current contact value is required and must be a non-empty string'
        });
      }

      const currentValidatedType = currentType.toLowerCase();
      const currentTrimmedValue = currentValue.trim();

      // Validate new type if provided
      let validatedNewType = currentValidatedType; // default to current type
      if (newType) {
        if (typeof newType !== 'string' || !validContactTypes.includes(newType.toLowerCase())) {
          return res.status(400).json({
            success: false,
            message: `New contact type must be one of: ${validContactTypes.join(', ')}`
          });
        }
        validatedNewType = newType.toLowerCase();
      }

      // Validate new value if provided
      let validatedNewValue = currentTrimmedValue; // default to current value
      if (newValue !== undefined) { // newValue can be an empty string
        if (typeof newValue !== 'string') {
          return res.status(400).json({
            success: false,
            message: 'New contact value must be a string'
          });
        }
        validatedNewValue = newValue.trim();
        if (validatedNewValue.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'New contact value cannot be empty'
          });
        }
      }

      const profile = await Profile.findOne({ user: req.user._id });
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      // Find the contact to update
      const contactIndex = profile.contacts.findIndex(contact =>
        contact.type.toLowerCase() === currentValidatedType.toLowerCase() &&
        contact.value.toLowerCase() === currentTrimmedValue.toLowerCase()
      );
      if (contactIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Contact not found in profile'
        });
      }

      // Check if the new contact combination already exists
      const existingContact = profile.contacts.find((contact, index) =>
        contact.type.toLowerCase() === validatedNewType.toLowerCase() &&
        contact.value.toLowerCase() === validatedNewValue.toLowerCase() &&
        index !== contactIndex
      );
      if (existingContact) {
        return res.status(400).json({
          success: false,
          message: 'A contact with this type and value already exists in profile'
        });
      }

      // Update the contact
      profile.contacts[contactIndex].type = validatedNewType;
      profile.contacts[contactIndex].value = validatedNewValue;
      await profile.save();

      res.status(200).json({
        success: true,
        message: 'Contact updated successfully',
        data: {
          contacts: profile.contacts
        }
      });
    } catch (error) {
      logger.error(`Error updating contact: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error updating contact',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Remove a contact from profile
  static async removeContact(req, res) {
    try {
      const { type, value } = req.query;

      // Validate type input
      const validContactTypes = ['email', 'phone', 'website', 'social'];
      if (!type || typeof type !== 'string' || !validContactTypes.includes(type.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: `Contact type is required and must be one of: ${validContactTypes.join(', ')}`
        });
      }

      // Validate value input
      if (!value || typeof value !== 'string' || value.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Contact value is required and must be a non-empty string'
        });
      }

      const validatedType = type.toLowerCase();
      const trimmedValue = value.trim();

      const profile = await Profile.findOne({ user: req.user._id });
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      // Find the contact to remove
      const contactIndex = profile.contacts.findIndex(contact =>
        contact.type.toLowerCase() === validatedType.toLowerCase() &&
        contact.value.toLowerCase() === trimmedValue.toLowerCase()
      );
      if (contactIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Contact not found in profile'
        });
      }

      // Remove the contact
      profile.contacts.splice(contactIndex, 1);
      await profile.save();

      res.status(200).json({
        success: true,
        message: 'Contact removed successfully',
        data: {
          contacts: profile.contacts
        }
      });
    } catch (error) {
      logger.error(`Error removing contact: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error removing contact',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Add a portfolio item to profile
  static async addPortfolioItem(req, res) {
    try {
      const { title, description, url, media } = req.body;

      // Validate title input
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Title is required and must be a non-empty string'
        });
      }

      const trimmedTitle = title.trim();

      // Validate description if provided
      let validatedDescription = '';
      if (description !== undefined) {
        if (typeof description !== 'string') {
          return res.status(400).json({
            success: false,
            message: 'Description must be a string if provided'
          });
        }
        validatedDescription = description;
      }

      // Validate url if provided
      let validatedUrl = null;
      if (url) {
        if (typeof url !== 'string') {
          return res.status(400).json({
            success: false,
            message: 'URL must be a string if provided'
          });
        }
        try {
          new URL(url); // Validate URL format
          validatedUrl = url;
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: 'URL must be a valid URL if provided'
          });
        }
      }

      // Validate media if provided
      let validatedMedia = [];
      if (media) {
        if (!Array.isArray(media)) {
          return res.status(400).json({
            success: false,
            message: 'Media must be an array of URLs if provided'
          });
        }

        for (const item of media) {
          if (typeof item !== 'string') {
            return res.status(400).json({
              success: false,
              message: 'Media array must contain only string URLs'
            });
          }
          try {
            new URL(item); // Validate URL format
          } catch (e) {
            return res.status(400).json({
              success: false,
              message: `Invalid URL in media array: ${item}`
            });
          }
        }
        validatedMedia = media;
      }

      const profile = await Profile.findOne({ user: req.user._id });
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      // Check if portfolio item with same title already exists
      const existingPortfolio = profile.portfolio.find(item =>
        item.title.toLowerCase() === trimmedTitle.toLowerCase()
      );
      if (existingPortfolio) {
        return res.status(400).json({
          success: false,
          message: 'Portfolio item with this title already exists in profile'
        });
      }

      // Add portfolio item to profile
      profile.portfolio.push({
        title: trimmedTitle,
        description: validatedDescription,
        url: validatedUrl,
        media: validatedMedia
      });
      await profile.save();

      res.status(200).json({
        success: true,
        message: 'Portfolio item added successfully',
        data: {
          portfolio: profile.portfolio
        }
      });
    } catch (error) {
      logger.error(`Error adding portfolio item: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error adding portfolio item',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get all portfolio items from profile
  static async getPortfolio(req, res) {
    try {
      const profile = await Profile.findOne({ user: req.user._id });
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          portfolio: profile.portfolio
        }
      });
    } catch (error) {
      logger.error(`Error getting portfolio: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error retrieving portfolio',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Update a portfolio item in profile
  static async updatePortfolioItem(req, res) {
    try {
      const { currentTitle, newTitle, description, url, media } = req.body;

      // Validate current title input
      if (!currentTitle || typeof currentTitle !== 'string' || currentTitle.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Current title is required and must be a non-empty string'
        });
      }

      const currentTrimmedTitle = currentTitle.trim();
      let validatedNewTitle = currentTrimmedTitle; // Default to current title

      // Validate new title if provided
      if (newTitle) {
        if (typeof newTitle !== 'string' || newTitle.trim().length === 0) {
          return res.status(400).json({
            success: false,
            message: 'New title must be a non-empty string if provided'
          });
        }
        validatedNewTitle = newTitle.trim();
      }

      // Validate description if provided
      let validatedDescription = undefined;
      if (description !== undefined) {
        if (typeof description !== 'string') {
          return res.status(400).json({
            success: false,
            message: 'Description must be a string if provided'
          });
        }
        validatedDescription = description;
      }

      // Validate url if provided
      let validatedUrl = undefined;
      if (url !== undefined) {
        if (url) { // If url is provided and not null/empty
          if (typeof url !== 'string') {
            return res.status(400).json({
              success: false,
              message: 'URL must be a string if provided'
            });
          }
          try {
            new URL(url); // Validate URL format
          } catch (e) {
            return res.status(400).json({
              success: false,
              message: 'URL must be a valid URL if provided'
            });
          }
          validatedUrl = url;
        } else {
          validatedUrl = null; // Allow setting to null
        }
      }

      // Validate media if provided
      let validatedMedia = undefined;
      if (media !== undefined) {
        if (!Array.isArray(media)) {
          return res.status(400).json({
            success: false,
            message: 'Media must be an array of URLs if provided'
          });
        }

        for (const item of media) {
          if (typeof item !== 'string') {
            return res.status(400).json({
              success: false,
              message: 'Media array must contain only string URLs'
            });
          }
          try {
            new URL(item); // Validate URL format
          } catch (e) {
            return res.status(400).json({
              success: false,
              message: `Invalid URL in media array: ${item}`
            });
          }
        }
        validatedMedia = media;
      }

      const profile = await Profile.findOne({ user: req.user._id });
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      // Find the portfolio item to update
      const portfolioIndex = profile.portfolio.findIndex(item =>
        item.title.toLowerCase() === currentTrimmedTitle.toLowerCase()
      );
      if (portfolioIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Portfolio item not found in profile'
        });
      }

      // If updating to a new title, check if it already exists
      if (validatedNewTitle !== currentTrimmedTitle) {
        const existingItem = profile.portfolio.find((item, index) =>
          item.title.toLowerCase() === validatedNewTitle.toLowerCase() &&
          index !== portfolioIndex
        );
        if (existingItem) {
          return res.status(400).json({
            success: false,
            message: 'Portfolio item with this title already exists in profile'
          });
        }
      }

      // Update the portfolio item
      if (validatedNewTitle !== currentTrimmedTitle) {
        profile.portfolio[portfolioIndex].title = validatedNewTitle;
      }
      if (validatedDescription !== undefined) {
        profile.portfolio[portfolioIndex].description = validatedDescription;
      }
      if (validatedUrl !== undefined) {
        profile.portfolio[portfolioIndex].url = validatedUrl;
      }
      if (validatedMedia !== undefined) {
        profile.portfolio[portfolioIndex].media = validatedMedia;
      }

      await profile.save();

      res.status(200).json({
        success: true,
        message: 'Portfolio item updated successfully',
        data: {
          portfolio: profile.portfolio
        }
      });
    } catch (error) {
      logger.error(`Error updating portfolio item: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error updating portfolio item',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Remove a portfolio item from profile
  static async removePortfolioItem(req, res) {
    try {
      const { title } = req.params;

      if (!title || title.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Title is required'
        });
      }

      const trimmedTitle = title.trim();

      const profile = await Profile.findOne({ user: req.user._id });
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      // Find the portfolio item to remove
      const portfolioIndex = profile.portfolio.findIndex(item =>
        item.title.toLowerCase() === trimmedTitle.toLowerCase()
      );
      if (portfolioIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Portfolio item not found in profile'
        });
      }

      // Remove the portfolio item
      profile.portfolio.splice(portfolioIndex, 1);
      await profile.save();

      res.status(200).json({
        success: true,
        message: 'Portfolio item removed successfully',
        data: {
          portfolio: profile.portfolio
        }
      });
    } catch (error) {
      logger.error(`Error removing portfolio item: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error removing portfolio item',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  // Get user preferences
  static async getPreferences(req, res) {
    try {
      // Get preferences from UserPreference model
      const UserPreference = require('../models/UserPreference');
      let userPreference = await UserPreference.findOne({ userId: req.user._id }).populate('preferredCategories preferredTags');

      if (!userPreference) {
        // If no preferences exist, return an empty preferences object
        userPreference = {
          preferredCategories: [],
          preferredTypes: [],
          preferredTags: [],
          preferredLocations: [],
          minRating: 0,
          maxDistance: 50,
          exchangePreferences: '',
          excludeInactiveUsers: true,
          excludeLowRatingUsers: false,
          minAuthorRating: 0,
          preferenceScoreWeights: {
            categoryMatch: 0.3,
            typeMatch: 0.2,
            tagMatch: 0.2,
            locationMatch: 0.15,
            ratingMatch: 0.15
          }
        };
      }

      res.status(200).json({
        success: true,
        data: userPreference
      });
    } catch (error) {
      logger.error(`Error getting preferences: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error retrieving preferences',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Update user preferences
  static async updatePreferences(req, res) {
    try {
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

      // Get the UserPreference model
      const UserPreference = require('../models/UserPreference');

      // Find existing preferences or create new
      let userPreference = await UserPreference.findOne({ userId: req.user._id });

      if (!userPreference) {
        // Create new preferences
        userPreference = new UserPreference({
          userId: req.user._id,
          preferredCategories: preferredCategories || [],
          preferredTypes: preferredTypes || [],
          preferredTags: preferredTags || [],
          preferredLocations: preferredLocations || [],
          minRating: minRating !== undefined ? minRating : 0,
          maxDistance: maxDistance !== undefined ? maxDistance : 50,
          exchangePreferences: exchangePreferences || '',
          excludeInactiveUsers: excludeInactiveUsers !== undefined ? excludeInactiveUsers : true,
          excludeLowRatingUsers: excludeLowRatingUsers !== undefined ? excludeLowRatingUsers : false,
          minAuthorRating: minAuthorRating !== undefined ? minAuthorRating : 0,
          preferenceScoreWeights: preferenceScoreWeights || {
            categoryMatch: 0.3,
            typeMatch: 0.2,
            tagMatch: 0.2,
            locationMatch: 0.15,
            ratingMatch: 0.15
          }
        });
      } else {
        // Update existing preferences
        if (preferredCategories) userPreference.preferredCategories = preferredCategories;
        if (preferredTypes) userPreference.preferredTypes = preferredTypes;
        if (preferredTags) userPreference.preferredTags = preferredTags;
        if (preferredLocations) userPreference.preferredLocations = preferredLocations;
        if (minRating !== undefined) userPreference.minRating = minRating;
        if (maxDistance !== undefined) userPreference.maxDistance = maxDistance;
        if (exchangePreferences !== undefined) userPreference.exchangePreferences = exchangePreferences;
        if (excludeInactiveUsers !== undefined) userPreference.excludeInactiveUsers = excludeInactiveUsers;
        if (excludeLowRatingUsers !== undefined) userPreference.excludeLowRatingUsers = excludeLowRatingUsers;
        if (minAuthorRating !== undefined) userPreference.minAuthorRating = minAuthorRating;
        if (preferenceScoreWeights) userPreference.preferenceScoreWeights = preferenceScoreWeights;
      }

      await userPreference.save();

      // Clear recommendation cache for this user to reflect new preferences
      const RecommendationService = require('../services/RecommendationService');
      RecommendationService.clearUserCache(req.user._id);

      res.status(200).json({
        success: true,
        message: 'Preferences updated successfully',
        data: userPreference
      });
    } catch (error) {
      logger.error(`Error updating preferences: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error updating preferences',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = ProfileController;