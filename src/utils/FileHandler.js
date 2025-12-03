const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs').promises;
const { logger } = require('../logger/logger');

class FileHandler {
  constructor(uploadDir = './uploads') {
    this.uploadDir = uploadDir;
    this.ensureUploadDir();
  }

  // Ensure upload directory exists
  ensureUploadDir() {
    try {
      fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      logger.error(`Error creating upload directory: ${error.message}`);
    }
  }

  // Generate unique filename
  generateUniqueFilename(originalName) {
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    const randomString = crypto.randomBytes(16).toString('hex');
    return `${baseName}_${randomString}${ext}`;
  }

  // Create multer storage configuration
  getStorageConfig(options = {}) {
    return multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueFilename = this.generateUniqueFilename(file.originalname);
        cb(null, uniqueFilename);
      }
    });
  }

  // Create multer upload middleware with validation
  createUploadMiddleware(fieldname, options = {}) {
    const {
      maxSize = 5 * 1024 * 1024, // 5MB default
      allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      maxCount = 5
    } = options;

    const storage = this.getStorageConfig();

    const fileFilter = (req, file, cb) => {
      // Check allowed MIME types
      if (!allowedMimes.includes(file.mimetype)) {
        cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedMimes.join(', ')}`), false);
        return;
      }

      // Additional security check: check file extension
      const ext = path.extname(file.originalname).toLowerCase();
      const allowedExtensions = allowedMimes.map(mime => {
        switch (mime) {
          case 'image/jpeg':
          case 'image/jpg':
            return ['.jpg', '.jpeg'];
          case 'image/png':
            return ['.png'];
          case 'image/gif':
            return ['.gif'];
          case 'application/pdf':
            return ['.pdf'];
          case 'application/msword':
            return ['.doc'];
          case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            return ['.docx'];
          default:
            return [];
        }
      }).flat();

      if (!allowedExtensions.includes(ext)) {
        cb(new Error(`Invalid file extension: ${ext}`), false);
        return;
      }

      // Check for potential malicious content
      if (this.isPotentialMaliciousFile(file)) {
        cb(new Error('File appears to be potentially malicious'), false);
        return;
      }

      // Additional validation: check file size against limit
      // Note: this is also handled by multer limits, but we can add additional checks here
      cb(null, true);
    };

    const upload = multer({
      storage,
      limits: {
        fileSize: maxSize,
        files: maxCount // Maximum number of files
      },
      fileFilter
    });

    if (maxCount > 1) {
      return upload.array(fieldname, maxCount);
    } else {
      return upload.single(fieldname);
    }
  }

  // Security check for potentially malicious files
  isPotentialMaliciousFile(file) {
    // Check for potentially executable extensions in non-executable MIME types
    const dangerousExtensions = ['.exe', '.bat', '.sh', '.com', '.scr', '.pif', '.js', '.vbs', '.msi', '.cmd', '.ps1', '.svg'];
    const ext = path.extname(file.originalname).toLowerCase();

    // For image files, check if the extension is dangerous
    if (file.mimetype.startsWith('image/') && dangerousExtensions.includes(ext)) {
      return true;
    }

    // Check if it's a text/html file which could contain malicious scripts
    if (file.mimetype === 'text/html' || file.mimetype === 'application/x-msdownload') {
      return true;
    }

    // Check for potential double extensions that might be used to bypass checks
    const originalName = file.originalname.toLowerCase();
    if ((originalName.includes('.php') || originalName.includes('.asp') || originalName.includes('.jsp')) &&
        (originalName.includes('.jpg') || originalName.includes('.png') || originalName.includes('.gif'))) {
      return true;
    }

    return false;
  }

  // Validate file content (basic check)
  async validateFileContent(filePath, mimetype) {
    // For images, we could check magic bytes
    try {
      const buffer = await fs.readFile(filePath);
      
      if (mimetype.startsWith('image/')) {
        return this.validateImageFile(buffer, mimetype);
      }
      
      return true; // For now, we'll trust other validations
    } catch (error) {
      logger.error(`Error validating file content: ${error.message}`);
      return false;
    }
  }

  validateImageFile(buffer, mimetype) {
    // Check magic bytes for common image formats
    const magicBytes = {
      'image/jpeg': [0xFF, 0xD8, 0xFF],
      'image/png': [0x89, 0x50, 0x4E, 0x47],
      'image/gif': [0x47, 0x49, 0x46, 0x38]
    };
    
    const expectedBytes = magicBytes[mimetype];
    if (!expectedBytes) return true; // Don't validate unknown types
    
    for (let i = 0; i < expectedBytes.length; i++) {
      if (buffer[i] !== expectedBytes[i]) {
        return false;
      }
    }
    
    return true;
  }

  // Get public URL for a file
  getFileUrl(filename) {
    return `/uploads/${filename}`;
  }

  // Remove file
  async removeFile(filename) {
    try {
      const filePath = path.join(this.uploadDir, filename);
      await fs.unlink(filePath);
      logger.info(`File deleted: ${filename}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting file ${filename}: ${error.message}`);
      return false;
    }
  }

  // Get file info
  async getFileInfo(filename) {
    try {
      const filePath = path.join(this.uploadDir, filename);
      const stats = await fs.stat(filePath);
      return {
        filename,
        size: stats.size,
        createdAt: stats.birthtime,
        updatedAt: stats.mtime,
        path: filePath,
        url: this.getFileUrl(filename)
      };
    } catch (error) {
      logger.error(`Error getting file info for ${filename}: ${error.message}`);
      return null;
    }
  }
}

module.exports = FileHandler;