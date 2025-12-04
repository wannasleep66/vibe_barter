const path = require('path');
const fs = require('fs').promises;
const FileHandler = require('../utils/FileHandler');
const AdvertisementMedia = require('../models/AdvertisementMedia');
const Advertisement = require('../models/Advertisement');
const { logger } = require('../logger/logger');

const fileHandler = new FileHandler('./uploads');

class FileController {
  // Upload file endpoint
  static async uploadFile(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file provided'
        });
      }

      // Validate file content
      const isValid = await fileHandler.validateFileContent(req.file.path, req.file.mimetype);
      if (!isValid) {
        // Remove potentially malicious file
        await fileHandler.removeFile(req.file.filename);
        return res.status(400).json({
          success: false,
          message: 'File validation failed. Possible malicious content detected.'
        });
      }

      // Additional security: check file size against expected limits from request
      const maxFileSize = 10 * 1024 * 1024; // 10MB
      if (req.file.size > maxFileSize) {
        await fileHandler.removeFile(req.file.filename);
        return res.status(400).json({
          success: false,
          message: 'File size exceeds maximum allowed size of 10MB'
        });
      }

      // Sanitize filename to prevent path traversal
      const sanitizedFilename = path.basename(req.file.filename);
      if (sanitizedFilename !== req.file.filename) {
        await fileHandler.removeFile(req.file.filename);
        return res.status(400).json({
          success: false,
          message: 'Invalid filename detected'
        });
      }

      // Check if request contains advertisement ID to link the file
      let mediaDoc = null;
      if (req.body.advertisementId) {
        // Verify user has permission to add media to this advertisement
        const advertisement = await Advertisement.findById(req.body.advertisementId);
        if (!advertisement) {
          return res.status(404).json({
            success: false,
            message: 'Advertisement not found'
          });
        }

        // Check if the current user owns the advertisement
        if (req.user._id.toString() !== advertisement.ownerId.toString()) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to add media to this advertisement'
          });
        }

        // Create media document
        mediaDoc = await AdvertisementMedia.create({
          advertisementId: req.body.advertisementId,
          url: fileHandler.getFileUrl(req.file.filename),
          type: req.file.mimetype.startsWith('image') ? 'image' :
            req.file.mimetype.startsWith('video') ? 'video' :
              req.file.mimetype === 'application/pdf' ? 'document' :
                req.file.mimetype.includes('audio') ? 'audio' : 'other',
          filename: req.file.filename,
          size: req.file.size,
          width: req.file.width || null,  // Extracted from file metadata if available
          height: req.file.height || null // Extracted from file metadata if available
        });

        // Update the advertisement's media array with the new file URL
        await Advertisement.findByIdAndUpdate(
          req.body.advertisementId,
          { $addToSet: { media: fileHandler.getFileUrl(req.file.filename) } },
          { new: true }
        );
      }

      res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          id: mediaDoc ? mediaDoc._id : null,
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          url: fileHandler.getFileUrl(req.file.filename),
          media: mediaDoc ? {
            _id: mediaDoc._id,
            advertisementId: mediaDoc.advertisementId,
            type: mediaDoc.type,
            filename: mediaDoc.filename,
            size: mediaDoc.size
          } : null
        }
      });
    } catch (error) {
      logger.error(`Error uploading file: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error uploading file',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Upload multiple files endpoint
  static async uploadMultipleFiles(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files provided'
        });
      }

      // Check total number of files
      if (req.files.length > 10) {
        // Remove uploaded files before returning error
        for (const file of req.files) {
          await fileHandler.removeFile(file.filename);
        }
        return res.status(400).json({
          success: false,
          message: 'Too many files uploaded at once. Maximum 10 files allowed.'
        });
      }

      const uploadedFiles = [];
      const errors = [];

      for (const file of req.files) {
        // Additional security: check file size against expected limits
        const maxFileSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxFileSize) {
          await fileHandler.removeFile(file.filename);
          errors.push({
            filename: file.originalname,
            error: 'File size exceeds maximum allowed size of 10MB'
          });
          continue;
        }

        // Sanitize filename to prevent path traversal
        const sanitizedFilename = path.basename(file.filename);
        if (sanitizedFilename !== file.filename) {
          await fileHandler.removeFile(file.filename);
          errors.push({
            filename: file.originalname,
            error: 'Invalid filename detected'
          });
          continue;
        }

        // Validate each file content
        const isValid = await fileHandler.validateFileContent(file.path, file.mimetype);
        if (!isValid) {
          // Remove potentially malicious file
          await fileHandler.removeFile(file.filename);
          errors.push({
            filename: file.originalname,
            error: 'File validation failed. Possible malicious content detected.'
          });
          continue;
        }

        // Check if request contains advertisement ID to link the file
        let mediaDoc = null;
        if (req.body.advertisementId) {
          // Verify user has permission to add media to this advertisement
          const advertisement = await Advertisement.findById(req.body.advertisementId);
          if (!advertisement) {
            await fileHandler.removeFile(file.filename);
            errors.push({
              filename: file.originalname,
              error: 'Advertisement not found'
            });
            continue;
          }

          // Check if the current user owns the advertisement
          if (req.user._id.toString() !== advertisement.ownerId.toString()) {
            await fileHandler.removeFile(file.filename);
            errors.push({
              filename: file.originalname,
              error: 'You do not have permission to add media to this advertisement'
            });
            continue;
          }

          // Create media document
          mediaDoc = await AdvertisementMedia.create({
            advertisementId: req.body.advertisementId,
            url: fileHandler.getFileUrl(file.filename),
            type: file.mimetype.startsWith('image') ? 'image' :
              file.mimetype.startsWith('video') ? 'video' :
                file.mimetype === 'application/pdf' ? 'document' :
                  file.mimetype.includes('audio') ? 'audio' : 'other',
            filename: file.filename,
            size: file.size,
            width: file.width || null,  // Extracted from file metadata if available
            height: file.height || null // Extracted from file metadata if available
          });

          // Update the advertisement's media array with the new file URL
          await Advertisement.findByIdAndUpdate(
            req.body.advertisementId,
            { $addToSet: { media: fileHandler.getFileUrl(file.filename) } },
            { new: true }
          );
        }

        uploadedFiles.push({
          id: mediaDoc ? mediaDoc._id : null,
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          url: fileHandler.getFileUrl(file.filename),
          media: mediaDoc ? {
            _id: mediaDoc._id,
            advertisementId: mediaDoc.advertisementId,
            type: mediaDoc.type,
            filename: mediaDoc.filename,
            size: mediaDoc.size
          } : null
        });
      }

      res.status(201).json({
        success: true,
        message: errors.length > 0
          ? `${uploadedFiles.length} files uploaded successfully, ${errors.length} files failed`
          : 'All files uploaded successfully',
        data: {
          uploaded: uploadedFiles,
          errors: errors
        }
      });
    } catch (error) {
      logger.error(`Error uploading multiple files: ${error.message}`);
      // Attempt to remove any files that were uploaded before the error
      if (req.files) {
        for (const file of req.files) {
          try {
            await fileHandler.removeFile(file.filename);
          } catch (removeError) {
            logger.error(`Error cleaning up file after upload error: ${removeError.message}`);
          }
        }
      }
      res.status(500).json({
        success: false,
        message: 'Error uploading files',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get file by filename
  static async getFile(req, res) {
    try {
      const { filename } = req.params;

      // Check if filename contains path traversal
      if (filename.includes('..') || filename.includes('/\\')) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid filename' 
        });
      }

      const filePath = path.join(fileHandler.uploadDir, filename);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (error) {
        return res.status(404).json({ 
          success: false, 
          message: 'File not found' 
        });
      }

      // In a real application, you might want to verify user permissions here
      // For now, we'll serve public files

      res.sendFile(filePath);
    } catch (error) {
      logger.error(`Error retrieving file: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error retrieving file',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get file info
  static async getFileInfo(req, res) {
    try {
      const { filename } = req.params;

      // Check if filename contains path traversal
      if (filename.includes('..') || filename.includes('/\\')) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid filename' 
        });
      }

      const fileInfo = await fileHandler.getFileInfo(filename);
      if (!fileInfo) {
        return res.status(404).json({ 
          success: false, 
          message: 'File not found' 
        });
      }

      res.status(200).json({
        success: true,
        data: fileInfo
      });
    } catch (error) {
      logger.error(`Error getting file info: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error retrieving file info',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Delete file
  static async deleteFile(req, res) {
    try {
      const { filename } = req.params;

      // Sanitize filename to prevent path traversal
      const sanitizedFilename = path.basename(filename);
      if (sanitizedFilename !== filename) {
        return res.status(400).json({
          success: false,
          message: 'Invalid filename'
        });
      }

      // Check if there are any AdvertisementMedia documents referencing this file
      const mediaDoc = await AdvertisementMedia.findOne({ filename });
      if (mediaDoc) {
        // Verify user has permission to delete media from this advertisement
        const advertisement = await Advertisement.findById(mediaDoc.advertisementId);
        if (!advertisement) {
          return res.status(404).json({
            success: false,
            message: 'Advertisement for this media not found'
          });
        }

        // Check if the current user owns the advertisement
        if (req.user._id.toString() !== advertisement.ownerId.toString()) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to delete this media'
          });
        }

        // Delete the media document
        await AdvertisementMedia.deleteOne({ _id: mediaDoc._id });
      }

      const deleted = await fileHandler.removeFile(sanitizedFilename);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'File deleted successfully'
      });
    } catch (error) {
      logger.error(`Error deleting file: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error deleting file',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get media for an advertisement
  static async getAdvertisementMedia(req, res) {
    try {
      const { advertisementId } = req.params;

      // Verify advertisement exists
      const advertisement = await Advertisement.findById(advertisementId);
      if (!advertisement) {
        return res.status(404).json({ 
          success: false, 
          message: 'Advertisement not found' 
        });
      }

      // Get all media for this advertisement
      const mediaList = await AdvertisementMedia.find({ 
        advertisementId: advertisementId 
      }).sort({ sortOrder: 1, createdAt: 1 });

      res.status(200).json({
        success: true,
        data: mediaList
      });
    } catch (error) {
      logger.error(`Error retrieving advertisement media: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error retrieving advertisement media',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = FileController;