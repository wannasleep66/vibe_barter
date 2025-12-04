// src/models/AdvertisementReport.js
const mongoose = require('mongoose');

const advertisementReportSchema = new mongoose.Schema({
  advertisementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Advertisement',
    required: true
  },
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    enum: {
      values: [
        'inappropriate_content',
        'spam',
        'misleading_information',
        'offensive_language',
        'fraudulent',
        'duplicate',
        'other'
      ],
      message: 'Reason must be one of: inappropriate_content, spam, misleading_information, offensive_language, fraudulent, duplicate, other'
    }
  },
  details: {
    type: String,
    maxlength: [1000, 'Details cannot exceed 1000 characters']
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'reviewed', 'resolved', 'dismissed'],
      default: 'pending'
    },
    message: 'Status must be one of: pending, reviewed, resolved, dismissed'
  },
  isHidden: {
    type: Boolean,
    default: false
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Moderator who reviewed the report
  },
  reviewedAt: {
    type: Date
  },
  resolutionNotes: {
    type: String,
    maxlength: [1000, 'Resolution notes cannot exceed 1000 characters']
  },
  hideReason: {
    type: String // Reason for hiding (set when action is taken)
  },
  appealed: {
    type: Boolean,
    default: false
  },
  appealReason: {
    type: String,
    maxlength: [500, 'Appeal reason cannot exceed 500 characters']
  },
  appealResolved: {
    type: Boolean,
    default: false
  },
  appealResolutionNotes: {
    type: String,
    maxlength: [1000, 'Appeal resolution notes cannot exceed 1000 characters']
  },
  appealedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Owner of the advertisement who appealed
  },
  appealedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for advertisement
advertisementReportSchema.index({ advertisementId: 1 });

// Index for reporter
advertisementReportSchema.index({ reporterId: 1 });

// Index for status
advertisementReportSchema.index({ status: 1 });

// Index for hiding status
advertisementReportSchema.index({ isHidden: 1 });

// Index for reviewed by
advertisementReportSchema.index({ reviewedBy: 1 });

// Index for creation date
advertisementReportSchema.index({ createdAt: -1 });

// Compound index for advertisement and reporter (prevent duplicate reports from same user)
advertisementReportSchema.index({ advertisementId: 1, reporterId: 1 }, { unique: true });

// Index for appeal status
advertisementReportSchema.index({ appealed: 1, appealResolved: 1 });

module.exports = mongoose.model('AdvertisementReport', advertisementReportSchema);