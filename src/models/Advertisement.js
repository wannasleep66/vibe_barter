// src/models/Advertisement.js
const mongoose = require('mongoose');

const advertisementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  profileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile'
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag'
  }],
  type: {
    type: String,
    enum: {
      values: ['service', 'goods', 'skill', 'experience'],
      message: 'Type must be either service, goods, skill, or experience'
    },
    required: true
  },
  exchangePreferences: {
    type: String,
    maxlength: [500, 'Exchange preferences cannot exceed 500 characters']
  },
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  coordinates: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  media: [{
    type: String // URLs to media files
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date
  },
  views: {
    type: Number,
    default: 0
  },
  applicationCount: {
    type: Number,
    default: 0
  },
  rating: {
    average: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date
  },
  searchVector: {
    type: String // For full-text search optimization - stores tag names, location, etc.
  }
}, {
  timestamps: true
});

// Index for full-text search
advertisementSchema.index({ 
  title: 'text', 
  description: 'text', 
  exchangePreferences: 'text' 
});

// Index for filtering by category
advertisementSchema.index({ categoryId: 1 });

// Index for filtering by owner
advertisementSchema.index({ ownerId: 1 });

// Index for filtering by type
advertisementSchema.index({ type: 1 });

// Index for filtering by location
advertisementSchema.index({ location: 1 });

// Index for filtering by activity status
advertisementSchema.index({ isActive: 1, isArchived: 1 });

// Index for sorting by creation date
advertisementSchema.index({ createdAt: -1 });

// Index for urgent advertisements
advertisementSchema.index({ isUrgent: 1 });

// Index for expiration
advertisementSchema.index({ expiresAt: 1 });

// Index for coordinates
advertisementSchema.index({ coordinates: '2dsphere' });

// Index for profile
advertisementSchema.index({ profileId: 1 });

module.exports = mongoose.model('Advertisement', advertisementSchema);