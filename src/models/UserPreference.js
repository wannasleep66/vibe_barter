// src/models/UserPreference.js
const mongoose = require('mongoose');

const userPreferenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  preferredCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  preferredTypes: [{
    type: String,
    enum: ['service', 'goods', 'skill', 'experience']
  }],
  preferredTags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag'
  }],
  preferredLocations: [{
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  }],
  minRating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  maxDistance: {
    type: Number, // in kilometers
    default: 50
  },
  exchangePreferences: {
    type: String,
    maxlength: [500, 'Exchange preferences cannot exceed 500 characters']
  },
  preferredLanguages: [{
    language: {
      type: String,
      trim: true
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'fluent', 'native'],
      default: 'intermediate'
    }
  }],
  excludeInactiveUsers: {
    type: Boolean,
    default: true
  },
  excludeLowRatingUsers: {
    type: Boolean,
    default: false
  },
  minAuthorRating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  preferenceScoreWeights: {
    // Weights for different factors in recommendation algorithm
    categoryMatch: {
      type: Number,
      default: 0.3
    },
    typeMatch: {
      type: Number,
      default: 0.2
    },
    tagMatch: {
      type: Number,
      default: 0.2
    },
    locationMatch: {
      type: Number,
      default: 0.15
    },
    ratingMatch: {
      type: Number,
      default: 0.15
    }
  }
}, {
  timestamps: true
});

// Index for user
userPreferenceSchema.index({ userId: 1 });

// Index for preferred categories
userPreferenceSchema.index({ preferredCategories: 1 });

// Index for preferred types
userPreferenceSchema.index({ preferredTypes: 1 });

// Index for preferred tags
userPreferenceSchema.index({ preferredTags: 1 });

// Index for preferred locations
userPreferenceSchema.index({ preferredLocations: 1 });

// Index for recommendation optimization - compound index for efficient querying
userPreferenceSchema.index({
  userId: 1,
  'preferenceScoreWeights.categoryMatch': 1,
  'preferenceScoreWeights.typeMatch': 1,
  'preferenceScoreWeights.tagMatch': 1
});

module.exports = mongoose.model('UserPreference', userPreferenceSchema);