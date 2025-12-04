const express = require('express');
const router = express.Router();
const FileController = require('../controllers/fileController');
const FileHandler = require('../utils/FileHandler');
const { protect } = require('../middleware/auth');
const { requirePermissions } = require('../middleware/rbac');

const fileHandler = new FileHandler('./uploads');

// Define allowed file types and sizes
const uploadOptions = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedMimes: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  maxCount: 5
};

// Upload single file
router.post('/upload', protect, fileHandler.createUploadMiddleware('file', uploadOptions), FileController.uploadFile);

// Upload multiple files
router.post('/upload-multiple', protect, fileHandler.createUploadMiddleware('files', { ...uploadOptions, maxCount: 10 }), FileController.uploadMultipleFiles);

// Get file by filename (public access for now, could be restricted based on media ownership)
router.get('/files/:filename', FileController.getFile);

// Get file info (requires authentication)
router.get('/info/:filename', protect, FileController.getFileInfo);

// Delete file (user must own the file or have delete permissions)
router.delete('/files/:filename', protect, FileController.deleteFile);

// Get media for an advertisement
router.get('/advertisement/:advertisementId/media', FileController.getAdvertisementMedia);

module.exports = router;