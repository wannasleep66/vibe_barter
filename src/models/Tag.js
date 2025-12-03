// src/models/Tag.js
const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tag name is required'],
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: [30, 'Tag name cannot exceed 30 characters']
  },
  description: {
    type: String,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  isSystemTag: {
    type: Boolean,
    default: false // Indicates if this is a predefined system tag
  }
}, {
  timestamps: true
});

// Index for name for faster lookups and case-insensitive searches
tagSchema.index({ name: 1 });

// Index for active tags
tagSchema.index({ isActive: 1 });

// Index for system tags
tagSchema.index({ isSystemTag: 1 });

module.exports = mongoose.model('Tag', tagSchema);