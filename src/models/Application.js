// src/models/Application.js
const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  advertisementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Advertisement',
    required: true
  },
  applicantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'accepted', 'rejected', 'cancelled', 'completed'],
      message: 'Status must be either pending, accepted, rejected, cancelled, or completed'
    },
    default: 'pending'
  },
  responseMessage: {
    type: String,
    maxlength: [1000, 'Response message cannot exceed 1000 characters']
  },
  respondedAt: {
    type: Date
  },
  respondedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // The user who responded (owner or applicant)
  },
  exchangeDate: {
    type: Date
  },
  exchangeLocation: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat'
  },
  ratingGiven: {
    type: Number,
    min: 0,
    max: 5
  }
}, {
  timestamps: true
});

// Index for advertisement
applicationSchema.index({ advertisementId: 1 });

// Index for applicant
applicationSchema.index({ applicantId: 1 });

// Index for owner
applicationSchema.index({ ownerId: 1 });

// Index for status
applicationSchema.index({ status: 1 });

// Index for creation date
applicationSchema.index({ createdAt: -1 });

// Index for responded date
applicationSchema.index({ respondedAt: 1 });

// Compound index for user and advertisement (to prevent duplicate applications)
applicationSchema.index({ applicantId: 1, advertisementId: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);