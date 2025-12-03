// src/models/Chat.js
const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  advertisementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Advertisement'
  },
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application'
  },
  title: {
    type: String,
    trim: true,
    maxlength: [100, 'Chat title cannot exceed 100 characters']
  },
  isGroup: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  lastMessageAt: {
    type: Date
  },
  lastMessage: {
    type: String,
    maxlength: [500, 'Last message cannot exceed 500 characters']
  },
  unreadCount: {
    type: Map, // Map of userId -> count
    of: Number,
    default: {}
  }
}, {
  timestamps: true
});

// Index for participants
chatSchema.index({ participants: 1 });

// Index for advertisement
chatSchema.index({ advertisementId: 1 });

// Index for application
chatSchema.index({ applicationId: 1 });

// Compound index for participant pairs (for direct messages)
chatSchema.index({ participants: 1 }, { sparse: true });

// Index for last message date
chatSchema.index({ lastMessageAt: -1 });

// Index for archived status
chatSchema.index({ isArchived: 1 });

module.exports = mongoose.model('Chat', chatSchema);