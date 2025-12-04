// src/models/Tag.js
const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tag name is required'],
    trim: true,
    lowercase: true,
    maxlength: [50, 'Tag name cannot exceed 50 characters'],
    unique: true
  },
  description: {
    type: String,
    maxlength: [200, 'Tag description cannot exceed 200 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  color: {
    type: String, // Color code for the tag
    maxlength: [7, 'Color code cannot exceed 7 characters (e.g., #FF0000)']
  },
  icon: {
    type: String, // Icon class or URL for the tag
    maxlength: [50, 'Icon reference cannot exceed 50 characters']
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
tagSchema.index({ name: 1 });
tagSchema.index({ isActive: 1 });
tagSchema.index({ usageCount: -1 }); // Sort by usage count descending

// Method to increment usage count
tagSchema.methods.incrementUsage = async function() {
  this.usageCount += 1;
  await this.save();
};

// Method to decrement usage count
tagSchema.methods.decrementUsage = async function() {
  this.usageCount = Math.max(0, this.usageCount - 1);
  await this.save();
};

module.exports = mongoose.model('Tag', tagSchema);