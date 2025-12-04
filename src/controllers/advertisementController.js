// src/controllers/advertisementController.js
const Advertisement = require('../models/Advertisement');
const Category = require('../models/Category');
const Tag = require('../models/Tag');
const Profile = require('../models/Profile');
const User = require('../models/User');
const { logger } = require('../logger/logger');
const AppError = require('../utils/AppError');

const advertisementController = {
  // Create new advertisement
  createAdvertisement: async (req, res, next) => {
    try {
      const { 
        title, 
        description, 
        categoryId, 
        tags = [], 
        type, 
        exchangePreferences, 
        location, 
        coordinates, 
        isUrgent, 
        expiresAt 
      } = req.body;

      // Verify that category exists
      const category = await Category.findById(categoryId);
      if (!category) {
        return next(new AppError('Category not found', 404));
      }

      // Verify that all tags exist
      if (tags.length > 0) {
        const existingTags = await Tag.find({ _id: { $in: tags } });
        if (existingTags.length !== tags.length) {
          return next(new AppError('One or more tags do not exist', 400));
        }
      }

      // Verify that profile exists (optional, but if provided)
      let profile = null;
      if (req.body.profileId) {
        profile = await Profile.findById(req.body.profileId);
        if (!profile) {
          return next(new AppError('Profile not found', 404));
        }
        // Check if profile belongs to user
        if (profile.userId.toString() !== req.user._id.toString()) {
          return next(new AppError('You do not own this profile', 403));
        }
      }

      // Prepare the advertisement data
      const advertisementData = {
        title,
        description,
        ownerId: req.user._id,
        categoryId,
        tags,
        type,
        exchangePreferences,
        location,
        isUrgent: Boolean(isUrgent),
        ...(expiresAt && { expiresAt: new Date(expiresAt) })
      };

      // Add coordinates if provided
      if (coordinates && coordinates.coordinates && coordinates.coordinates.length === 2) {
        advertisementData.coordinates = {
          type: 'Point',
          coordinates: [parseFloat(coordinates.coordinates[0]), parseFloat(coordinates.coordinates[1])]
        };
      }

      // Use profile if provided, otherwise no profile
      if (profile) {
        advertisementData.profileId = profile._id;
      }

      // Create the advertisement
      const advertisement = await Advertisement.create(advertisementData);

      // Populate the response with related data
      const populatedAdvertisement = await Advertisement.findById(advertisement._id)
        .populate('ownerId', 'firstName lastName email')
        .populate('categoryId', 'name description')
        .populate('tags', 'name')
        .populate('profileId', 'firstName lastName');

      res.status(201).json({
        success: true,
        data: populatedAdvertisement,
        message: 'Advertisement created successfully'
      });
    } catch (error) {
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return next(new AppError(`Validation Error: ${errors.join(', ')}`, 400));
      }
      logger.error('Error creating advertisement:', error.message);
      next(error);
    }
  },

  // Get all advertisements with filtering, sorting, and pagination
  getAllAdvertisements: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        type,
        categoryId,
        tagId,
        location,
        isUrgent,
        isActive = true,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Build filter object
      const filter = { isActive: true }; // Only active by default

      if (isActive !== 'any') {
        filter.isActive = isActive === 'true';
      }

      // Allow filtering by archived status as well
      if (isArchived !== undefined && req.user) {
        // Only allow users to see archived ads if they are the owner or an admin/moderator
        if (req.user.role === 'admin' || req.user.role === 'moderator') {
          filter.isArchived = isArchived === 'true';
        }
      }

      if (categoryId) filter.categoryId = categoryId;
      if (tagId) filter.tags = { $in: [tagId] };
      if (type) filter.type = type;
      if (location) filter.location = { $regex: location, $options: 'i' };
      if (isUrgent) filter.isUrgent = isUrgent === 'true';

      // Add text search if provided
      if (search) {
        filter.$text = { $search: search };
      }

      // Determine sort order
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Get advertisements with filtering and sorting
      let advertisementsQuery = Advertisement.find(filter)
        .populate('ownerId', 'firstName lastName email')
        .populate('categoryId', 'name description')
        .populate('tags', 'name')
        .populate('profileId', 'firstName lastName');

      if (Object.keys(sort).length > 0) {
        advertisementsQuery = advertisementsQuery.sort(sort);
      }

      const advertisements = await advertisementsQuery
        .skip(skip)
        .limit(parseInt(limit));

      // Get total count for pagination
      const total = await Advertisement.countDocuments(filter);

      res.status(200).json({
        success: true,
        data: advertisements,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
          hasNext: parseInt(page) * parseInt(limit) < total,
          hasPrev: parseInt(page) > 1
        },
        filters: { search, type, categoryId, tagId, location, isUrgent, isActive, sortBy, sortOrder }
      });
    } catch (error) {
      logger.error('Error getting advertisements:', error.message);
      next(error);
    }
  },

  // Get advertisement by ID
  getAdvertisementById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const advertisement = await Advertisement.findById(id)
        .populate('ownerId', 'firstName lastName email')
        .populate('categoryId', 'name description')
        .populate('tags', 'name')
        .populate('profileId', 'firstName lastName');

      if (!advertisement) {
        return next(new AppError('Advertisement not found', 404));
      }

      // Increment view count
      advertisement.views += 1;
      await advertisement.save({ validateBeforeSave: false });

      res.status(200).json({
        success: true,
        data: advertisement
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return next(new AppError('Invalid advertisement ID format', 400));
      }
      logger.error('Error getting advertisement by ID:', error.message);
      next(error);
    }
  },

  // Update advertisement by ID
  updateAdvertisement: async (req, res, next) => {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };

      // Find the advertisement
      const advertisement = await Advertisement.findById(id);
      if (!advertisement) {
        return next(new AppError('Advertisement not found', 404));
      }

      // Check if user owns the advertisement
      if (advertisement.ownerId.toString() !== req.user._id.toString()) {
        return next(new AppError('You do not have permission to update this advertisement', 403));
      }

      // Verify category if it's being updated
      if (updateData.categoryId) {
        const category = await Category.findById(updateData.categoryId);
        if (!category) {
          return next(new AppError('Category not found', 404));
        }
      }

      // Verify tags if they're being updated
      if (updateData.tags && Array.isArray(updateData.tags) && updateData.tags.length > 0) {
        const existingTags = await Tag.find({ _id: { $in: updateData.tags } });
        if (existingTags.length !== updateData.tags.length) {
          return next(new AppError('One or more tags do not exist', 400));
        }
      }

      // Verify profile if it's being updated
      if (updateData.profileId) {
        const profile = await Profile.findById(updateData.profileId);
        if (!profile) {
          return next(new AppError('Profile not found', 404));
        }
        // Check if profile belongs to user
        if (profile.userId.toString() !== req.user._id.toString()) {
          return next(new AppError('You do not own this profile', 403));
        }
      }

      // Handle coordinates if provided
      if (updateData.coordinates) {
        if (updateData.coordinates.coordinates && updateData.coordinates.coordinates.length === 2) {
          updateData.coordinates = {
            type: 'Point',
            coordinates: [parseFloat(updateData.coordinates.coordinates[0]), parseFloat(updateData.coordinates.coordinates[1])]
          };
        }
      }

      // Update the advertisement
      Object.assign(advertisement, updateData);
      await advertisement.save();

      // Populate and return updated advertisement
      const updatedAdvertisement = await Advertisement.findById(advertisement._id)
        .populate('ownerId', 'firstName lastName email')
        .populate('categoryId', 'name description')
        .populate('tags', 'name')
        .populate('profileId', 'firstName lastName');

      res.status(200).json({
        success: true,
        data: updatedAdvertisement,
        message: 'Advertisement updated successfully'
      });
    } catch (error) {
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return next(new AppError(`Validation Error: ${errors.join(', ')}`, 400));
      }
      if (error.name === 'CastError') {
        return next(new AppError('Invalid advertisement ID format', 400));
      }
      logger.error('Error updating advertisement:', error.message);
      next(error);
    }
  },

  // Delete advertisement by ID
  deleteAdvertisement: async (req, res, next) => {
    try {
      const { id } = req.params;

      const advertisement = await Advertisement.findById(id);
      if (!advertisement) {
        return next(new AppError('Advertisement not found', 404));
      }

      // Check if user owns the advertisement
      if (advertisement.ownerId.toString() !== req.user._id.toString()) {
        return next(new AppError('You do not have permission to delete this advertisement', 403));
      }

      await Advertisement.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: 'Advertisement deleted successfully'
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return next(new AppError('Invalid advertisement ID format', 400));
      }
      logger.error('Error deleting advertisement:', error.message);
      next(error);
    }
  },

  // Archive advertisement (soft delete)
  archiveAdvertisement: async (req, res, next) => {
    try {
      const { id } = req.params;

      const advertisement = await Advertisement.findById(id);
      if (!advertisement) {
        return next(new AppError('Advertisement not found', 404));
      }

      // Check if user owns the advertisement
      if (advertisement.ownerId.toString() !== req.user._id.toString()) {
        return next(new AppError('You do not have permission to archive this advertisement', 403));
      }

      // Update to archive the advertisement
      advertisement.isArchived = true;
      advertisement.archivedAt = new Date();
      advertisement.isActive = false;
      await advertisement.save();

      res.status(200).json({
        success: true,
        data: advertisement,
        message: 'Advertisement archived successfully'
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return next(new AppError('Invalid advertisement ID format', 400));
      }
      logger.error('Error archiving advertisement:', error.message);
      next(error);
    }
  },

  // Get user's advertisements
  getUserAdvertisements: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 10,
        isActive,
        isArchived,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Build filter object for user's advertisements
      const filter = {
        ownerId: req.user._id
      };

      if (isActive !== undefined) {
        filter.isActive = isActive === 'true';
      }

      if (isArchived !== undefined) {
        filter.isArchived = isArchived === 'true';
      }

      // Determine sort order
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Get user's advertisements with filtering and sorting
      let userAdsQuery = Advertisement.find(filter)
        .populate('categoryId', 'name description')
        .populate('tags', 'name')
        .populate('profileId', 'firstName lastName');

      if (Object.keys(sort).length > 0) {
        userAdsQuery = userAdsQuery.sort(sort);
      }

      const userAdvertisements = await userAdsQuery
        .skip(skip)
        .limit(parseInt(limit));

      // Get total count for pagination
      const total = await Advertisement.countDocuments(filter);

      res.status(200).json({
        success: true,
        data: userAdvertisements,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
          hasNext: parseInt(page) * parseInt(limit) < total,
          hasPrev: parseInt(page) > 1
        }
      });
    } catch (error) {
      logger.error('Error getting user advertisements:', error.message);
      next(error);
    }
  },

  // Activate an archived advertisement
  activateAdvertisement: async (req, res, next) => {
    try {
      const { id } = req.params;

      const advertisement = await Advertisement.findById(id);
      if (!advertisement) {
        return next(new AppError('Advertisement not found', 404));
      }

      // Check if user owns the advertisement
      if (advertisement.ownerId.toString() !== req.user._id.toString()) {
        return next(new AppError('You do not have permission to activate this advertisement', 403));
      }

      if (!advertisement.isArchived) {
        return next(new AppError('Advertisement is not archived', 400));
      }

      // Activate the advertisement
      advertisement.isArchived = false;
      advertisement.archivedAt = undefined;
      advertisement.isActive = true;

      // If the expiresAt date was in the past, set a new default expiration (e.g., 30 days from now)
      if (advertisement.expiresAt && advertisement.expiresAt < new Date()) {
        advertisement.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      }

      await advertisement.save();

      res.status(200).json({
        success: true,
        data: advertisement,
        message: 'Advertisement activated successfully'
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return next(new AppError('Invalid advertisement ID format', 400));
      }
      logger.error('Error activating advertisement:', error.message);
      next(error);
    }
  }
};

module.exports = advertisementController;