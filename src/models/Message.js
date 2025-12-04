// src/models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  messageType: {
    type: String,
    enum: {
      values: ['text', 'image', 'video', 'file', 'system'],
      message: 'Message type must be either text, image, video, file, or system'
    },
    default: 'text'
  },
  mediaUrl: {
    type: String // URL for media messages
  },
  isRead: {
    type: Map, // Map of userId -> boolean
    of: Boolean,
    default: {}
  },
  readAt: {
    type: Map, // Map of userId -> Date
    of: Date,
    default: {}
  },
  repliedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message' // Reference to the message this is replying to
  },
  status: {
    type: String,
    enum: {
      values: ['sent', 'delivered', 'read'],
      message: 'Status must be either sent, delivered, or read'
    },
    default: 'sent'
  }
}, {
  timestamps: true
});

// Index for chat
messageSchema.index({ chatId: 1 });

// Index for sender
messageSchema.index({ senderId: 1 });

// Index for creation date (for chronological ordering)
messageSchema.index({ createdAt: 1 });

// Index for read status
messageSchema.index({ 'isRead.$**': 1 });

// Index for message type
messageSchema.index({ messageType: 1 });

module.exports = mongoose.model('Message', messageSchema);