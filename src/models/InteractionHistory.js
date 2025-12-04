// src/models/InteractionHistory.js
const mongoose = require('mongoose');

const interactionHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  advertisementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Advertisement',
    required: true
  },
  type: {
    type: String,
    enum: {
      values: ['view', 'apply', 'accept', 'reject', 'favorite', 'hide'],
      message: 'Interaction type must be either view, apply, accept, reject, favorite, or hide'
    },
    required: true
  },
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application'
  },
  rating: {
    type: Number,
    min: 0,
    max: 5
  },
  review: {
    type: String,
    maxlength: [500, 'Review cannot exceed 500 characters']
  },
  feedback: {
    positive: {
      type: Boolean,
      default: false
    },
    reason: {
      type: String,
      maxlength: [200, 'Reason cannot exceed 200 characters']
    }
  },
  interactionData: {
    // Additional data specific to interaction type
    searchQuery: String, // What search query led to this ad?
    searchResultsPosition: Number, // Position of ad in search results
    timeOnPage: Number // How long did user spend on ad page (in seconds)
  }
}, {
  timestamps: true
});

// Index for user
interactionHistorySchema.index({ userId: 1 });

// Index for advertisement
interactionHistorySchema.index({ advertisementId: 1 });

// Compound index for user and advertisement to prevent duplicate interactions of same type
interactionHistorySchema.index({ userId: 1, advertisementId: 1, type: 1 });

// Index for interaction type
interactionHistorySchema.index({ type: 1 });

// Index for rating
interactionHistorySchema.index({ rating: 1 });

// Index for creation date (for time-based queries)
interactionHistorySchema.index({ createdAt: -1 });

// Index for type and time (for recent interactions)
interactionHistorySchema.index({ type: 1, createdAt: -1 });

// Index for recommendation optimization
interactionHistorySchema.index({
  userId: 1,
  type: 1,
  createdAt: -1
}); // For efficient fetching of user interaction history

module.exports = mongoose.model('InteractionHistory', interactionHistorySchema);