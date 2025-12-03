const Profile = require('../models/Profile');
const User = require('../models/User');
const { logger } = require('../logger/logger');

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
}

module.exports = ProfileController;