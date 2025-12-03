// src/models/Ticket.js
const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [100, 'Subject cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    enum: {
      values: ['technical', 'billing', 'account', 'content', 'other'],
      message: 'Category must be either technical, billing, account, content, or other'
    },
    required: true
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high', 'critical'],
      message: 'Priority must be either low, medium, high, or critical'
    },
    default: 'medium'
  },
  status: {
    type: String,
    enum: {
      values: ['open', 'in-progress', 'resolved', 'closed', 'pending-user'],
      message: 'Status must be either open, in-progress, resolved, closed, or pending-user'
    },
    default: 'open'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Support agent assigned to this ticket
  },
  resolution: {
    type: String,
    maxlength: [2000, 'Resolution cannot exceed 2000 characters']
  },
  resolvedAt: {
    type: Date
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // User who resolved the ticket
  },
  satisfactionRating: {
    type: Number,
    min: 1,
    max: 5
  },
  tags: [{
    type: String // Additional tags for organization
  }]
}, {
  timestamps: true
});

// Index for user
ticketSchema.index({ userId: 1 });

// Index for status
ticketSchema.index({ status: 1 });

// Index for priority
ticketSchema.index({ priority: 1 });

// Index for category
ticketSchema.index({ category: 1 });

// Index for assigned support agent
ticketSchema.index({ assignedTo: 1 });

// Index for creation date
ticketSchema.index({ createdAt: -1 });

// Index for resolution date
ticketSchema.index({ resolvedAt: 1 });

// Index for satisfaction rating
ticketSchema.index({ satisfactionRating: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);