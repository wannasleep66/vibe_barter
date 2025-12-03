// src/models/Review.js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  reviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  revieweeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  advertisementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Advertisement'
  },
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application'
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating must be at most 5']
  },
  title: {
    type: String,
    maxlength: [100, 'Review title cannot exceed 100 characters']
  },
  comment: {
    type: String,
    maxlength: [1000, 'Review comment cannot exceed 1000 characters']
  },
  isPositive: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false // Whether the reviewer actually exchanged with the reviewee
  },
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag' // Tags for the review (e.g., punctual, professional, etc.)
  }]
}, {
  timestamps: true
});

// Index for reviewer
reviewSchema.index({ reviewerId: 1 });

// Index for reviewee
reviewSchema.index({ revieweeId: 1 });

// Index for advertisement
reviewSchema.index({ advertisementId: 1 });

// Index for application
reviewSchema.index({ applicationId: 1 });

// Index for rating
reviewSchema.index({ rating: 1 });

// Index for verification status
reviewSchema.index({ isVerified: 1 });

// Compound index to prevent duplicate reviews from same user to same user for same application
reviewSchema.index({ reviewerId: 1, revieweeId: 1, applicationId: 1 }, { unique: true });

// Index for creation date
reviewSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);