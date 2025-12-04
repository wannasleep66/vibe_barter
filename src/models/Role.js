// src/models/Role.js
const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Role name is required'],
    unique: true,
    trim: true,
    maxlength: [30, 'Role name cannot exceed 30 characters']
  },
  description: {
    type: String,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  permissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  systemRole: {
    type: Boolean,
    default: false // Indicates if this is a predefined system role
  }
}, {
  timestamps: true
});

// Index for name for faster lookups
roleSchema.index({ name: 1 });

// Index for active roles
roleSchema.index({ isActive: 1 });

// Index for system roles
roleSchema.index({ systemRole: 1 });

module.exports = mongoose.model('Role', roleSchema);