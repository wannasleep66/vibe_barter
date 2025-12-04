// src/models/Category.js
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: [100, 'Category name cannot exceed 100 characters'],
    unique: true
  },
  description: {
    type: String,
    maxlength: [500, 'Category description cannot exceed 500 characters']
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null // Root category if no parent
  },
  level: {
    type: Number,
    default: 0, // 0 for root categories, increases for subcategories
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  icon: {
    type: String, // URL or class name for icon
    maxlength: [100, 'Icon reference cannot exceed 100 characters']
  },
  color: {
    type: String, // Color code for the category
    maxlength: [7, 'Color code cannot exceed 7 characters (e.g., #FF0000)']
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
categorySchema.index({ name: 1 });
categorySchema.index({ parentId: 1 });
categorySchema.index({ level: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ sortOrder: 1 });
categorySchema.index({ parentId: 1, isActive: 1 });

// Pre-save middleware to set the level based on parent
categorySchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('parentId')) {
    if (!this.parentId) {
      this.level = 0;
    } else {
      // Get parent category to determine level
      const parentCategory = await mongoose.model('Category').findById(this.parentId);
      if (parentCategory) {
        this.level = parentCategory.level + 1;
      } else {
        this.level = 0;
      }
    }
  }
  next();
});

// Method to get children categories
categorySchema.methods.getChildren = async function() {
  return await mongoose.model('Category').find({ parentId: this._id });
};

// Method to get parent category
categorySchema.methods.getParent = async function() {
  if (!this.parentId) return null;
  return await mongoose.model('Category').findById(this.parentId);
};

// Method to get full path of category (for hierarchical display)
categorySchema.methods.getPath = async function() {
  const path = [];
  let currentCategory = this;
  
  while (currentCategory) {
    path.unshift({ _id: currentCategory._id, name: currentCategory.name });
    if (currentCategory.parentId) {
      currentCategory = await mongoose.model('Category').findById(currentCategory.parentId);
    } else {
      break;
    }
  }
  
  return path;
};

module.exports = mongoose.model('Category', categorySchema);