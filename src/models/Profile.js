// src/models/Profile.js
const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
    trim: true
  }],
  languages: [{
    language: {
      type: String,
      required: true
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
    title: String,
    description: String,
    url: String
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Profile', profileSchema);