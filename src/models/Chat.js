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
  isPrivate: {
    type: Boolean,
    default: true // By default, chats are private between participants
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
  },
  isDeleted: {
    type: Boolean,
    default: false // For soft deletion of entire chat
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // User who deleted the chat (if applicable)
  },
  deletedAt: {
    type: Date // When the chat was deleted
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

// Index for private status
chatSchema.index({ isPrivate: 1 });

// Index for deletion status
chatSchema.index({ isDeleted: 1 });

// Compound index for participant and archived status (for efficient user chat queries)
chatSchema.index({ participants: 1, isArchived: 1 });

// Compound index for participant, archived and deleted status
chatSchema.index({ participants: 1, isArchived: 1, isDeleted: 1 });

// Index for group chats
chatSchema.index({ isGroup: 1 });

// Compound index for quick lookup of chat by participants for direct messages
chatSchema.index({ participants: 1, isGroup: 1 }, { unique: false }); // Not unique since multiple chats could theoretically have same participants

// Index for deletion tracking
chatSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('Chat', chatSchema);