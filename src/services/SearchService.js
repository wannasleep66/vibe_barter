// src/services/SearchService.js
const Advertisement = require('../models/Advertisement');
const Tag = require('../models/Tag');
const { logger } = require('../logger/logger');

class SearchService {
  /**
   * Update the search vector for an advertisement based on associated tags and other text fields
   */
  async updateAdvertisementSearchVector(advertisementId) {
    try {
      const advertisement = await Advertisement.findById(advertisementId).populate('tags', 'name');
      
      if (!advertisement) {
        throw new Error('Advertisement not found');
      }
      
      // Combine all searchable text into a single string
      // This will be used for MongoDB's text search when reference fields can't be indexed
      const searchableText = [
        advertisement.title,
        advertisement.description,
        advertisement.exchangePreferences,
        advertisement.location,
      ]
      .filter(text => text) // Remove null/undefined values
      .join(' ');
      
      // Add tag names to the searchable text
      if (advertisement.tags && advertisement.tags.length > 0) {
        const tagNames = advertisement.tags.map(tag => tag.name).join(' ');
        advertisement.searchVector = `${searchableText} ${tagNames}`;
      } else {
        advertisement.searchVector = searchableText;
      }
      
      await advertisement.save();
      
      logger.info(`Updated search vector for advertisement ${advertisementId}`);
      return advertisement;
    } catch (error) {
      logger.error(`Error updating search vector for advertisement:`, error.message);
      throw error;
    }
  }

  /**
   * Enhanced search that looks in title, description, exchange preferences, location, and tags
   */
  async searchAdvertisements(query, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        type,
        categoryId,
        tagId,
        location,
        isUrgent,
        isActive = true,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      // Build filter object
      const filter = { isActive: true }; // Only active by default

      if (isActive !== 'any') {
        filter.isActive = isActive === 'true';
      }

      if (categoryId) filter.categoryId = categoryId;
      if (tagId) filter.tags = { $in: [tagId] };
      if (type) filter.type = type;
      if (location) filter.location = { $regex: location, $options: 'i' };
      if (isUrgent) filter.isUrgent = isUrgent === 'true';

      // Enhanced search that looks in multiple fields
      if (query) {
        const searchRegex = new RegExp(query, 'i');
        
        // Create a complex search filter
        filter.$or = [
          { title: { $regex: searchRegex } },
          { description: { $regex: searchRegex } },
          { exchangePreferences: { $regex: searchRegex } },
          { location: { $regex: searchRegex } },
          { searchVector: { $regex: searchRegex } } // Includes tags
        ];
      }

      // Determine sort order
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Get advertisements with filtering and sorting
      const advertisements = await Advertisement.find(filter)
        .populate('ownerId', 'firstName lastName email')
        .populate('categoryId', 'name description')
        .populate('tags', 'name')
        .populate('profileId', 'firstName lastName')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      // Get total count for pagination
      const total = await Advertisement.countDocuments(filter);

      return {
        advertisements,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
          hasNext: parseInt(page) * parseInt(limit) < total,
          hasPrev: parseInt(page) > 1
        }
      };
    } catch (error) {
      logger.error('Error during enhanced advertisement search:', error.message);
      throw error;
    }
  }
}

module.exports = new SearchService();