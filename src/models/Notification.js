// src/models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: {
      values: [
        'ad_reported',
        'ad_hidden', 
        'ad_unhidden',
        'appeal_submitted',
        'appeal_resolved',
        'moderation_action',
        'system_message'
      ],
      message: 'Type must be one of: ad_reported, ad_hidden, ad_unhidden, appeal_submitted, appeal_resolved, moderation_action, system_message'
    },
    required: [true, 'Notification type is required']
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  advertisementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Advertisement'
  },
  relatedEntityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  isRead: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    message: 'Priority must be one of: low, medium, high, critical'
  }
}, {
  timestamps: true
});

// Index for user
notificationSchema.index({ userId: 1 });

// Index for type
notificationSchema.index({ type: 1 });

// Index for read status
notificationSchema.index({ isRead: 1 });

// Index for priority
notificationSchema.index({ priority: 1 });

// Index for creation date
notificationSchema.index({ createdAt: -1 });

// Index for advertisement
notificationSchema.index({ advertisementId: 1 });

// Index for type and user (common query pattern)
notificationSchema.index({ userId: 1, type: 1 });

module.exports = mongoose.model('Notification', notificationSchema);