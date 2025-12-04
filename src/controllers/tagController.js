// src/controllers/tagController.js
const Tag = require('../models/Tag');
const Advertisement = require('../models/Advertisement');
const { logger } = require('../logger/logger');

class TagController {
  // Create a new tag
  static async createTag(req, res) {
    try {
      const { name, description, color, icon } = req.body;

      // Check if a tag with the same name already exists (case-insensitive due to lowercase: true in schema)
      const existingTag = await Tag.findOne({ 
        name: name.toLowerCase().trim()
      });
      if (existingTag) {
        return res.status(400).json({
          success: false,
          message: 'A tag with this name already exists'
        });
      }

      // Create new tag
      const tag = new Tag({
        name: name.trim(),
        description: description || '',
        color,
        icon
      });

      await tag.save();

      res.status(201).json({
        success: true,
        message: 'Tag created successfully',
        data: tag
      });
    } catch (error) {
      logger.error(`Error creating tag: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error creating tag',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get all tags (with optional filtering)
  static async getTags(req, res) {
    try {
      const { isActive, search, sortBy = 'name', sortOrder = 'asc', limit = 20, page = 1 } = req.query;
      let query = {};

      // Filter by active status
      if (isActive !== undefined) {
        query.isActive = isActive === 'true';
      }

      // Search by name or description
      if (search) {
        query.$or = [
          { name: new RegExp(search, 'i') },
          { description: new RegExp(search, 'i') }
        ];
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Sort order
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const tags = await Tag.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Tag.countDocuments(query);

      res.status(200).json({
        success: true,
        data: tags,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasNext: parseInt(page) * parseInt(limit) < total,
          hasPrev: parseInt(page) > 1
        }
      });
    } catch (error) {
      logger.error(`Error getting tags: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error retrieving tags',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get a specific tag by ID
  static async getTag(req, res) {
    try {
      const { id } = req.params;

      const tag = await Tag.findById(id);

      if (!tag) {
        return res.status(404).json({
          success: false,
          message: 'Tag not found'
        });
      }

      res.status(200).json({
        success: true,
        data: tag
      });
    } catch (error) {
      logger.error(`Error getting tag: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error retrieving tag',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Update a tag
  static async updateTag(req, res) {
    try {
      const { id } = req.params;
      const { name, description, isActive, color, icon } = req.body;

      const tag = await Tag.findById(id);

      if (!tag) {
        return res.status(404).json({
          success: false,
          message: 'Tag not found'
        });
      }

      // Check if updating to a name that already exists (case-insensitive, excluding self)
      if (name && name.toLowerCase().trim() !== tag.name.toLowerCase()) {
        const existingTag = await Tag.findOne({ 
          name: name.toLowerCase().trim(),
          _id: { $ne: id }
        });
        if (existingTag) {
          return res.status(400).json({
            success: false,
            message: 'A tag with this name already exists'
          });
        }
      }

      // Update allowed fields
      if (name) tag.name = name.trim();
      if (description !== undefined) tag.description = description;
      if (isActive !== undefined) tag.isActive = isActive;
      if (color !== undefined) tag.color = color;
      if (icon !== undefined) tag.icon = icon;

      await tag.save();

      res.status(200).json({
        success: true,
        message: 'Tag updated successfully',
        data: tag
      });
    } catch (error) {
      logger.error(`Error updating tag: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error updating tag',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Delete a tag
  static async deleteTag(req, res) {
    try {
      const { id } = req.params;

      const tag = await Tag.findById(id);

      if (!tag) {
        return res.status(404).json({
          success: false,
          message: 'Tag not found'
        });
      }

      // Check if any advertisements reference this tag
      const adsUsingTag = await Advertisement.countDocuments({ 
        tags: { $in: [id] } 
      });
      
      if (adsUsingTag > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete tag. ${adsUsingTag} advertisement(s) are using this tag. Remove the tag from all advertisements first.`
        });
      }

      await Tag.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: 'Tag deleted successfully'
      });
    } catch (error) {
      logger.error(`Error deleting tag: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error deleting tag',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get popular tags
  static async getPopularTags(req, res) {
    try {
      const { limit = 10 } = req.query;

      const popularTags = await Tag.find({ isActive: true })
        .sort({ usageCount: -1, name: 1 })
        .limit(parseInt(limit));

      res.status(200).json({
        success: true,
        data: popularTags
      });
    } catch (error) {
      logger.error(`Error getting popular tags: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Error retrieving popular tags',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = TagController;