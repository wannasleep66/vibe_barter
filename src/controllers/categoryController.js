// src/controllers/categoryController.js
const Category = require('../models/Category');
const { logger } = require('../logger/logger');

class CategoryController {
  // Create a new category
  static async createCategory(req, res) {
    try {
      const { name, description, parentId, sortOrder, icon, color } = req.body;

      // Check if a category with the same name already exists (case-insensitive)
      const existingCategory = await Category.findOne({ 
        name: new RegExp(`^${name}$`, 'i') 
      });
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }

      // If parentId is provided, validate that it exists
      if (parentId) {
        const parentCategory = await Category.findById(parentId);
        if (!parentCategory) {
          return res.status(404).json({
            success: false,
            message: 'Parent category not found'
          });
        }

        // Check for circular reference (if the parent's parent is this category)
        if (parentCategory.parentId && parentCategory.parentId.toString() === req.body._id) {
          return res.status(400).json({
            success: false,
            message: 'Cannot create circular reference: parent category cannot be a child of this category'
          });
        }
      }

      // Create new category
      const category = new Category({
        name,
        description,
        parentId: parentId || null,
        sortOrder: sortOrder || 0,
        icon,
        color
      });

      await category.save();

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: category
      });
    } catch (error) {
      logger.error(`Error creating category: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error creating category',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get all categories (with optional filtering)
  static async getCategories(req, res) {
    try {
      const { parentId, level, isActive, search } = req.query;
      let query = {};

      // Filter by parent ID
      if (parentId !== undefined) {
        query.parentId = parentId === 'null' || parentId === 'undefined' ? null : parentId;
      }

      // Filter by level
      if (level !== undefined) {
        query.level = parseInt(level);
      }

      // Filter by active status
      if (isActive !== undefined) {
        query.isActive = isActive === 'true';
      }

      // Search by name
      if (search) {
        query.name = new RegExp(search, 'i');
      }

      const categories = await Category.find(query)
        .sort({ sortOrder: 1, name: 1 })
        .populate('parentId', 'name');

      res.status(200).json({
        success: true,
        data: categories,
        count: categories.length
      });
    } catch (error) {
      logger.error(`Error getting categories: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error retrieving categories',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get a specific category by ID
  static async getCategory(req, res) {
    try {
      const { id } = req.params;

      const category = await Category.findById(id).populate('parentId', 'name');

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      res.status(200).json({
        success: true,
        data: category
      });
    } catch (error) {
      logger.error(`Error getting category: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error retrieving category',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Update a category
  static async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { name, description, parentId, isActive, sortOrder, icon, color } = req.body;

      const category = await Category.findById(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      // Check if trying to update to a name that already exists (case-insensitive, excluding self)
      if (name) {
        const existingCategory = await Category.findOne({ 
          name: new RegExp(`^${name}$`, 'i'),
          _id: { $ne: id }
        });
        if (existingCategory) {
          return res.status(400).json({
            success: false,
            message: 'Category with this name already exists'
          });
        }
      }

      // If changing parent, validate the new parent exists and avoid circular references
      if (parentId !== undefined) {
        if (parentId) {
          // Check that the new parent exists
          const parentCategory = await Category.findById(parentId);
          if (!parentCategory) {
            return res.status(404).json({
              success: false,
              message: 'Parent category not found'
            });
          }

          // Check for circular reference
          if (parentCategory._id.toString() === id) {
            return res.status(400).json({
              success: false,
              message: 'Category cannot be its own parent'
            });
          }

          // Check if the new parent would create a circular reference
          if (await CategoryController.wouldCreateCircularReference(parentId, id)) {
            return res.status(400).json({
              success: false,
              message: 'Cannot create circular reference: this would create a loop in the category hierarchy'
            });
          }
        }

        // Prevent changing parent if the category has children
        const children = await Category.find({ parentId: id });
        if (children.length > 0 && parentId !== category.parentId) {
          return res.status(400).json({
            success: false,
            message: 'Cannot change parent of a category that has subcategories'
          });
        }

        category.parentId = parentId;
      }

      // Update allowed fields
      if (name) category.name = name;
      if (description !== undefined) category.description = description;
      if (isActive !== undefined) category.isActive = isActive;
      if (sortOrder !== undefined) category.sortOrder = sortOrder;
      if (icon !== undefined) category.icon = icon;
      if (color !== undefined) category.color = color;

      await category.save();

      res.status(200).json({
        success: true,
        message: 'Category updated successfully',
        data: category
      });
    } catch (error) {
      logger.error(`Error updating category: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error updating category',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Delete a category
  static async deleteCategory(req, res) {
    try {
      const { id } = req.params;

      const category = await Category.findById(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      // Check if the category has subcategories
      const subcategories = await Category.find({ parentId: id });
      if (subcategories.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete category with subcategories. Please delete subcategories first.'
        });
      }

      // Check if any advertisements reference this category
      const Advertisement = require('../models/Advertisement');
      const adsUsingCategory = await Advertisement.countDocuments({ categoryId: id });
      if (adsUsingCategory > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete category. ${adsUsingCategory} advertisement(s) are using this category.`
        });
      }

      await Category.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (error) {
      logger.error(`Error deleting category: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error deleting category',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get category hierarchy (tree view)
  static async getCategoryTree(req, res) {
    try {
      const { isActive } = req.query;
      let query = { parentId: null }; // Only root categories
      
      if (isActive !== undefined) {
        query.isActive = isActive === 'true';
      }

      const rootCategories = await Category.find(query).sort({ sortOrder: 1, name: 1 });

      const buildTree = async (categories) => {
        const tree = [];
        
        for (const category of categories) {
          const node = category.toObject();
          const children = await Category.find({ parentId: category._id });
          
          if (children.length > 0) {
            node.children = await buildTree(children);
          } else {
            node.children = [];
          }
          
          tree.push(node);
        }
        
        return tree;
      };

      const categoryTree = await buildTree(rootCategories);

      res.status(200).json({
        success: true,
        data: categoryTree
      });
    } catch (error) {
      logger.error(`Error getting category tree: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error retrieving category tree',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Helper function to detect circular references
  static async wouldCreateCircularReference(newParentId, categoryId) {
    if (newParentId.toString() === categoryId) {
      return true; // Direct circular reference
    }

    // Check if newParent is a child of the current category
    const parentCategory = await Category.findById(newParentId);
    if (parentCategory && parentCategory.parentId) {
      return await CategoryController.wouldCreateCircularReference(parentCategory.parentId, categoryId);
    }

    return false;
  }
}

module.exports = CategoryController;