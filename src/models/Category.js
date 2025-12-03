// src/models/Category.js
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
    maxlength: [50, 'Category name cannot exceed 50 characters']
  },
  description: {
    type: String,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  icon: {
    type: String, // URL or class name for category icon
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  advertisementCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for name for faster lookups
categorySchema.index({ name: 1 });

// Index for active categories
categorySchema.index({ isActive: 1 });

// Index for parent category to support hierarchical queries
categorySchema.index({ parentCategory: 1 });

module.exports = mongoose.model('Category', categorySchema);