// src/models/TokenBlacklist.js
const mongoose = require('mongoose');

const tokenBlacklistSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true // Index for faster lookups
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['access', 'refresh'],
    default: 'access'
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true // Index for automatic cleanup
  }
}, {
  timestamps: true
});

// Index to support querying by token and expiration
tokenBlacklistSchema.index({ token: 1 });
tokenBlacklistSchema.index({ expiresAt: 1 });

// TTL index to automatically remove expired tokens
tokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('TokenBlacklist', tokenBlacklistSchema);