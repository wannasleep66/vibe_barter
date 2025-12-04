// src/controllers/advertisementMediaController.js
const AdvertisementMedia = require('../models/AdvertisementMedia');
const Advertisement = require('../models/Advertisement');
const FileHandler = require('../utils/FileHandler');
const path = require('path');
const { logger } = require('../logger/logger');
const AppError = require('../utils/AppError');

const fileHandler = new FileHandler('./uploads');

const advertisementMediaController = {
  // Upload new media to an advertisement
  createAdvertisementMedia: async (req, res, next) => {
    try {
      if (!req.file) {
        return next(new AppError('No file provided', 400));
      }

      const { advertisementId } = req.body;

      if (!advertisementId) {
        return next(new AppError('Advertisement ID is required', 400));
      }

      // Check if advertisement exists and user owns it
      const advertisement = await Advertisement.findById(advertisementId);
      if (!advertisement) {
        // Remove uploaded file since it's not associated with valid advertisement
        await fileHandler.removeFile(req.file.filename);
        return next(new AppError('Advertisement not found', 404));
      }

      // Check if user owns the advertisement
      if (advertisement.ownerId.toString() !== req.user._id.toString()) {
        // Remove uploaded file as user doesn't have permission
        await fileHandler.removeFile(req.file.filename);
        return next(new AppError('You do not have permission to add media to this advertisement', 403));
      }

      // Validate file content
      const isValid = await fileHandler.validateFileContent(req.file.path, req.file.mimetype);
      if (!isValid) {
        await fileHandler.removeFile(req.file.filename);
        return next(new AppError('File validation failed. Possible malicious content detected.', 400));
      }

      // Determine media type based on file extension and mimetype
      const getMediaType = (mimetype, filename) => {
        const ext = path.extname(filename).toLowerCase();
        if (mimetype.startsWith('image/')) return 'image';
        if (mimetype.startsWith('video/')) return 'video';
        if (mimetype === 'application/pdf' || ext === '.pdf') return 'document';
        return 'other';
      };

      // Create media entry in database
      const media = await AdvertisementMedia.create({
        advertisementId,
        url: fileHandler.getFileUrl(req.file.filename),
        type: getMediaType(req.file.mimetype, req.file.originalname),
        filename: req.file.filename,
        size: req.file.size,
        altText: req.body.altText || '',
        isPrimary: req.body.isPrimary === 'true' || req.body.isPrimary === true,
        sortOrder: req.body.sortOrder ? parseInt(req.body.sortOrder) : 0
      });

      res.status(201).json({
        success: true,
        data: media,
        message: 'Advertisement media added successfully'
      });
    } catch (error) {
      // If there's an error, try to remove the uploaded file
      if (req.file && req.file.filename) {
        try {
          await fileHandler.removeFile(req.file.filename);
        } catch (removeError) {
          logger.error(`Error removing file after upload error: ${removeError.message}`);
        }
      }

      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('File size exceeds maximum allowed size', 400));
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(new AppError('Invalid file provided', 400));
      }
      
      logger.error('Error creating advertisement media:', error.message);
      next(error);
    }
  },

  // Get all media for an advertisement
  getAdvertisementMedia: async (req, res, next) => {
    try {
      const { advertisementId } = req.params;

      // Verify advertisement exists
      const advertisement = await Advertisement.findById(advertisementId);
      if (!advertisement) {
        return next(new AppError('Advertisement not found', 404));
      }

      // Check if user has permission to view media (owner, admin, or moderator)
      const userIsOwner = advertisement.ownerId.toString() === req.user._id.toString();
      const userHasAdminPermissions = ['admin', 'moderator'].includes(req.user.role);
      
      if (!userIsOwner && !userHasAdminPermissions) {
        return next(new AppError('You do not have permission to view media for this advertisement', 403));
      }

      // Get all media for this advertisement sorted by sortOrder
      const mediaList = await AdvertisementMedia.find({
        advertisementId: advertisementId
      }).sort({ sortOrder: 1, createdAt: 1 });

      res.status(200).json({
        success: true,
        data: mediaList,
        count: mediaList.length
      });
    } catch (error) {
      logger.error('Error retrieving advertisement media:', error.message);
      next(error);
    }
  },

  // Get media by ID
  getMediaById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const media = await AdvertisementMedia.findById(id).populate('advertisementId', 'title ownerId');

      if (!media) {
        return next(new AppError('Media not found', 404));
      }

      // Check if user has permission to view this media
      const userIsOwner = media.advertisementId.ownerId.toString() === req.user._id.toString();
      const userHasAdminPermissions = ['admin', 'moderator'].includes(req.user.role);
      
      if (!userIsOwner && !userHasAdminPermissions) {
        return next(new AppError('You do not have permission to view this media', 403));
      }

      res.status(200).json({
        success: true,
        data: media
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return next(new AppError('Invalid media ID format', 400));
      }
      logger.error('Error retrieving media by ID:', error.message);
      next(error);
    }
  },

  // Update media metadata
  updateMedia: async (req, res, next) => {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };

      const media = await AdvertisementMedia.findById(id).populate('advertisementId', 'ownerId');

      if (!media) {
        return next(new AppError('Media not found', 404));
      }

      // Check if user owns the advertisement this media is attached to
      const userIsOwner = media.advertisementId.ownerId.toString() === req.user._id.toString();
      const userHasAdminPermissions = ['admin', 'moderator'].includes(req.user.role);
      
      if (!userIsOwner && !userHasAdminPermissions) {
        return next(new AppError('You do not have permission to update this media', 403));
      }

      // Update allowed fields
      if (updateData.altText !== undefined) media.altText = updateData.altText;
      if (updateData.isPrimary !== undefined) media.isPrimary = updateData.isPrimary;
      if (updateData.sortOrder !== undefined) media.sortOrder = updateData.sortOrder;

      await media.save();

      res.status(200).json({
        success: true,
        data: media,
        message: 'Media updated successfully'
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return next(new AppError('Invalid media ID format', 400));
      }
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return next(new AppError(`Validation Error: ${errors.join(', ')}`, 400));
      }
      logger.error('Error updating media:', error.message);
      next(error);
    }
  },

  // Delete media and file
  deleteMedia: async (req, res, next) => {
    try {
      const { id } = req.params;

      const media = await AdvertisementMedia.findById(id).populate('advertisementId', 'ownerId');
      if (!media) {
        return next(new AppError('Media not found', 404));
      }

      // Check if user owns the advertisement this media is attached to
      const userIsOwner = media.advertisementId.ownerId.toString() === req.user._id.toString();
      const userHasAdminPermissions = ['admin', 'moderator'].includes(req.user.role);
      
      if (!userIsOwner && !userHasAdminPermissions) {
        return next(new AppError('You do not have permission to delete this media', 403));
      }

      // Remove the file from the filesystem
      try {
        await fileHandler.removeFile(media.filename);
      } catch (fileError) {
        logger.error(`Error removing file ${media.filename}: ${fileError.message}`);
        // Continue with database deletion even if file removal fails
      }

      // Remove the media entry from database
      await AdvertisementMedia.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: 'Media deleted successfully'
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return next(new AppError('Invalid media ID format', 400));
      }
      logger.error('Error deleting media:', error.message);
      next(error);
    }
  },

  // Set a media as primary for an advertisement
  setAsPrimary: async (req, res, next) => {
    try {
      const { id } = req.params;

      const media = await AdvertisementMedia.findById(id).populate('advertisementId', 'ownerId');
      if (!media) {
        return next(new AppError('Media not found', 404));
      }

      // Check if user owns the advertisement this media is attached to
      const userIsOwner = media.advertisementId.ownerId.toString() === req.user._id.toString();
      const userHasAdminPermissions = ['admin', 'moderator'].includes(req.user.role);
      
      if (!userIsOwner && !userHasAdminPermissions) {
        return next(new AppError('You do not have permission to modify this media', 403));
      }

      // First, unset any existing primary media for this advertisement
      await AdvertisementMedia.updateMany(
        { 
          advertisementId: media.advertisementId._id, 
          isPrimary: true 
        }, 
        { isPrimary: false }
      );

      // Set this media as primary
      media.isPrimary = true;
      await media.save();

      res.status(200).json({
        success: true,
        data: media,
        message: 'Media set as primary successfully'
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return next(new AppError('Invalid media ID format', 400));
      }
      logger.error('Error setting media as primary:', error.message);
      next(error);
    }
  },

  // Get primary media for an advertisement
  getPrimaryMedia: async (req, res, next) => {
    try {
      const { advertisementId } = req.params;

      // Verify advertisement exists
      const advertisement = await Advertisement.findById(advertisementId);
      if (!advertisement) {
        return next(new AppError('Advertisement not found', 404));
      }

      // Check if user has permission to view media (owner, admin, or moderator)
      const userIsOwner = advertisement.ownerId.toString() === req.user._id.toString();
      const userHasAdminPermissions = ['admin', 'moderator'].includes(req.user.role);
      
      if (!userIsOwner && !userHasAdminPermissions) {
        return next(new AppError('You do not have permission to view media for this advertisement', 403));
      }

      // Get primary media for this advertisement
      const primaryMedia = await AdvertisementMedia.findOne({
        advertisementId: advertisementId,
        isPrimary: true
      });

      res.status(200).json({
        success: true,
        data: primaryMedia
      });
    } catch (error) {
      logger.error('Error retrieving primary media:', error.message);
      next(error);
    }
  }
};

module.exports = advertisementMediaController;