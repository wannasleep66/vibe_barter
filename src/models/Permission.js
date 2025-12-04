// src/models/Permission.js
const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Permission name is required'],
    unique: true,
    trim: true,
    maxlength: [50, 'Permission name cannot exceed 50 characters']
  },
  description: {
    type: String,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  resource: {
    type: String, // The resource this permission applies to (e.g., 'user', 'advertisement', 'review')
    required: true,
    trim: true,
    maxlength: [30, 'Resource name cannot exceed 30 characters']
  },
  action: {
    type: String, // The action this permission allows (e.g., 'create', 'read', 'update', 'delete')
    required: true,
    trim: true,
    maxlength: [20, 'Action name cannot exceed 20 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  systemPermission: {
    type: Boolean,
    default: false // Indicates if this is a predefined system permission
  }
}, {
  timestamps: true
});

// Index for name for faster lookups
permissionSchema.index({ name: 1 });

// Index for resource and action combination
permissionSchema.index({ resource: 1, action: 1 });

// Index for active permissions
permissionSchema.index({ isActive: 1 });

// Index for system permissions
permissionSchema.index({ systemPermission: 1 });

module.exports = mongoose.model('Permission', permissionSchema);