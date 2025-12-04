// src/models/Profile.js
const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  avatar: {
    type: String, // URL to avatar image
  },
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  skills: [{
    type: String,
    trim: true,
    maxlength: [50, 'Skill cannot exceed 50 characters']
  }],
  languages: [{
    language: {
      type: String,
      required: true,
      trim: true
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'fluent', 'native'],
      default: 'intermediate'
    }
  }],
  contacts: [{
    type: {
      type: String,
      enum: ['email', 'phone', 'website', 'social'],
      required: true
    },
    value: {
      type: String,
      required: true
    }
  }],
  portfolio: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: String,
    url: String,
    media: [String] // URLs to portfolio media
  }],
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
  responseTimeHours: {
    type: Number, // Average response time in hours
    default: 24
  },
  availability: {
    type: String,
    enum: ['always', 'weekdays', 'weekends', 'rarely'],
    default: 'always'
  }
}, {
  timestamps: true
});

// Index for location-based searches
profileSchema.index({ location: 'text', skills: 'text' });

// Index for availability filtering
profileSchema.index({ availability: 1 });

module.exports = mongoose.model('Profile', profileSchema);