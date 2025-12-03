// src/models/AdvertisementMedia.js
const mongoose = require('mongoose');

const advertisementMediaSchema = new mongoose.Schema({
  advertisementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Advertisement',
    required: true
  },
  url: {
    type: String,
    required: [true, 'Media URL is required']
  },
  type: {
    type: String,
    enum: {
      values: ['image', 'video', 'document', 'other'],
      message: 'Type must be either image, video, document, or other'
    },
    required: true
  },
  filename: {
    type: String,
    required: [true, 'Filename is required']
  },
  size: {
    type: Number, // Size in bytes
  },
  width: {
    type: Number // For images/videos
  },
  height: {
    type: Number // For images/videos
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  isPrimary: {
    type: Boolean,
    default: false // Primary media for the advertisement
  },
  altText: {
    type: String,
    maxlength: [200, 'Alt text cannot exceed 200 characters']
  }
}, {
  timestamps: true
});

// Index for advertisement
advertisementMediaSchema.index({ advertisementId: 1 });

// Index for media type
advertisementMediaSchema.index({ type: 1 });

// Index for primary media
advertisementMediaSchema.index({ isPrimary: 1 });

// Index for sort order
advertisementMediaSchema.index({ sortOrder: 1 });

module.exports = mongoose.model('AdvertisementMedia', advertisementMediaSchema);