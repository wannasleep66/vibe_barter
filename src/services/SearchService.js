// src/services/SearchService.js
const Advertisement = require('../models/Advertisement');
const Tag = require('../models/Tag');
const { logger } = require('../logger/logger');

// Helper function to get all subcategories for a given category
async function getCategoryWithChildren(categoryId) {
  const Category = require('../models/Category');
  const categoriesToInclude = [categoryId];

  // Recursively find all child categories
  const findChildCategories = async (parentIds) => {
    const children = await Category.find({ parentId: { $in: parentIds } });
    if (children.length === 0) return; // No more children

    const childIds = children.map(child => child._id.toString());
    categoriesToInclude.push(...childIds);

    // Recursively find children of these children
    await findChildCategories(childIds);
  };

  // Start with the specified category
  await findChildCategories([categoryId]);

  return categoriesToInclude;
}

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
        isArchived,
        isActive = true,
        ownerId,
        profileId,
        minRating,
        maxRating,
        minViews,
        maxViews,
        minApplications,
        maxApplications,
        expiresBefore,
        expiresAfter,
        minCreatedAt,
        maxCreatedAt,
        hasPortfolio,
        languages, // Added languages parameter
        includeSubcategories = false, // Include subcategories in search
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      // Build filter object
      const filter = { isActive: true }; // Only active by default

      if (isActive !== 'any') {
        filter.isActive = isActive === 'true';
      }

      if (isArchived !== undefined) {
        if (isArchived === 'any') {
          delete filter.isActive; // Remove isActive filter to show all
        } else {
          filter.isArchived = isArchived === 'true';
        }
      }

      if (categoryId) filter.categoryId = categoryId;
      if (tagId) filter.tags = { $in: [tagId] };
      if (type) filter.type = type;
      if (location) filter.location = { $regex: location, $options: 'i' };
      if (isUrgent) filter.isUrgent = isUrgent === 'true';
      if (ownerId) filter.ownerId = ownerId;
      if (profileId) filter.profileId = profileId;

      // Handle category filtering (with or without subcategories)
      if (categoryId) {
        if (Array.isArray(categoryId)) {
          // Multiple categories - match any of the specified categories
          filter.categoryId = { $in: categoryId };
        } else {
          // Single category - could include subcategories if requested
          if (includeSubcategories) {
            // Include both the specified category and its subcategories
            const Category = require('../models/Category');
            const categoryIds = await getCategoryWithChildren(categoryId);
            filter.categoryId = { $in: categoryIds };
          } else {
            // Just the specified category
            filter.categoryId = categoryId;
          }
        }
      }

      // Apply additional filters
      // Rating filters
      if (minRating !== undefined || maxRating !== undefined) {
        filter['rating.average'] = {};
        if (minRating !== undefined) filter['rating.average'].$gte = parseFloat(minRating);
        if (maxRating !== undefined) filter['rating.average'].$lte = parseFloat(maxRating);
      }

      // Views filters
      if (minViews !== undefined || maxViews !== undefined) {
        if (!filter.views) filter.views = {};
        if (minViews !== undefined) filter.views.$gte = parseInt(minViews);
        if (maxViews !== undefined) filter.views.$lte = parseInt(maxViews);
      }

      // Application count filters
      if (minApplications !== undefined || maxApplications !== undefined) {
        if (!filter.applicationCount) filter.applicationCount = {};
        if (minApplications !== undefined) filter.applicationCount.$gte = parseInt(minApplications);
        if (maxApplications !== undefined) filter.applicationCount.$lte = parseInt(maxApplications);
      }

      // Expiration date filters
      if (expiresBefore || expiresAfter) {
        filter.expiresAt = {};
        if (expiresBefore) filter.expiresAt.$lte = new Date(expiresBefore);
        if (expiresAfter) filter.expiresAt.$gte = new Date(expiresAfter);
      }

      // Created at filters
      if (minCreatedAt || maxCreatedAt) {
        if (!filter.createdAt) filter.createdAt = {};
        if (minCreatedAt) filter.createdAt.$gte = new Date(minCreatedAt);
        if (maxCreatedAt) filter.createdAt.$lte = new Date(maxCreatedAt);
      }

      // Portfolio filter - handled separately in the actual query due to complexity
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

      // If hasPortfolio, languages, or includeSubcategories filter is applied, we need to use aggregation pipeline
      if (hasPortfolio !== undefined || (languages && languages.length > 0) || includeSubcategories) {
        const pipeline = [];

        // Apply category filtering with subcategories if needed
        const adjustedFilter = { ...filter };
        if (categoryId && includeSubcategories) {
          if (Array.isArray(categoryId)) {
            // Multiple categories - get children for each
            const allCategoryIds = [];
            for (const catId of categoryId) {
              const childIds = await getCategoryWithChildren(catId);
              allCategoryIds.push(...childIds);
            }
            adjustedFilter.categoryId = { $in: [...new Set(allCategoryIds)] }; // Use Set to deduplicate
          } else {
            // Single category - get its children
            const categoryIds = await getCategoryWithChildren(categoryId);
            adjustedFilter.categoryId = { $in: categoryIds };
          }
        }

        // Match phase with adjusted filters (handling categories with subcategories if needed)
        pipeline.push({ $match: adjustedFilter });

        // Join with Profile collection to check for portfolio items or languages
        pipeline.push({
          $lookup: {
            from: 'profiles',
            localField: 'profileId',
            foreignField: '_id',
            as: 'profileInfo'
          }
        });

        // Filter based on whether the profile has portfolio items
        if (hasPortfolio !== undefined) {
          if (hasPortfolio === 'true') {
            pipeline.push({
              $match: {
                $or: [
                  { 'profileInfo.portfolio.0': { $exists: true } }  // Check if first element exists
                ]
              }
            });
          } else if (hasPortfolio === 'false') {
            pipeline.push({
              $match: {
                $or: [
                  { 'profileInfo.portfolio': { $exists: true, $size: 0 } },  // Empty array
                  { 'profileInfo.portfolio': { $exists: false } },           // Field doesn't exist
                  { 'profileInfo': { $size: 0 } }                            // No profile found
                ]
              }
            });
          }
          // If hasPortfolio === 'any', we don't add an extra match condition
        }

        // Apply languages filter if specified
        if (languages && languages.length > 0) {
          pipeline.push({
            $match: {
              $or: [
                { 'profileInfo.languages.language': {
                  $in: languages.map(lang => new RegExp(lang, 'i')) // Case insensitive match
                }}
              ]
            }
          });
        }

        // Sort
        pipeline.push({ $sort: sort });

        // Skip and limit for pagination
        pipeline.push({ $skip: skip });
        pipeline.push({ $limit: parseInt(limit) });

        // Perform population using lookup
        pipeline.push({
          $lookup: {
            from: 'users',
            localField: 'ownerId',
            foreignField: '_id',
            as: 'ownerId'
          }
        });

        pipeline.push({
          $lookup: {
            from: 'categories',
            localField: 'categoryId',
            foreignField: '_id',
            as: 'categoryId'
          }
        });

        pipeline.push({
          $lookup: {
            from: 'tags',
            localField: 'tags',
            foreignField: '_id',
            as: 'tags'
          }
        });

        pipeline.push({
          $lookup: {
            from: 'profiles',
            localField: 'profileId',
            foreignField: '_id',
            as: 'profileId'
          }
        });

        // Format the data similar to populate
        pipeline.push({
          $addFields: {
            'ownerId': { $arrayElemAt: ['$ownerId', 0] },
            'categoryId': { $arrayElemAt: ['$categoryId', 0] },
            'profileId': { $arrayElemAt: ['$profileId', 0] }
          }
        });

        const advertisements = await Advertisement.aggregate(pipeline);

        // For total count, we need a separate pipeline
        const countPipeline = [];
        // Use the same adjusted filter for count
        countPipeline.push({ $match: adjustedFilter });

        // Join with Profile collection for count as well
        countPipeline.push({
          $lookup: {
            from: 'profiles',
            localField: 'profileId',
            foreignField: '_id',
            as: 'profileInfo'
          }
        });

        // Apply hasPortfolio filter to count pipeline if needed
        if (hasPortfolio === 'true') {
          countPipeline.push({
            $match: {
              $or: [
                { 'profileInfo.portfolio.0': { $exists: true } }
              ]
            }
          });
        } else if (hasPortfolio === 'false') {
          countPipeline.push({
            $match: {
              $or: [
                { 'profileInfo.portfolio': { $exists: true, $size: 0 } },
                { 'profileInfo.portfolio': { $exists: false } },
                { 'profileInfo': { $size: 0 } }
              ]
            }
          });
        }

        // Apply languages filter to count pipeline if needed
        if (languages && languages.length > 0) {
          countPipeline.push({
            $match: {
              $or: [
                { 'profileInfo.languages.language': {
                  $in: languages.map(lang => new RegExp(lang, 'i')) // Case insensitive match
                }}
              ]
            }
          });
        }

        countPipeline.push({ $count: 'total' });
        const countResult = await Advertisement.aggregate(countPipeline);
        const total = countResult.length > 0 ? countResult[0].total : 0;

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
      } else {
        // Use regular find without hasPortfolio or languages filter
        // Get advertisements with filtering and sorting

        // If we need to include subcategories, adjust the filter
        let effectiveFilter = filter;
        if (categoryId && includeSubcategories) {
          if (Array.isArray(categoryId)) {
            // Multiple categories - get children for each
            const allCategoryIds = [];
            for (const catId of categoryId) {
              const childIds = await getCategoryWithChildren(catId);
              allCategoryIds.push(...childIds);
            }
            effectiveFilter = { ...filter, categoryId: { $in: [...new Set(allCategoryIds)] } };
          } else {
            // Single category - get its children
            const categoryIds = await getCategoryWithChildren(categoryId);
            effectiveFilter = { ...filter, categoryId: { $in: categoryIds } };
          }
        }

        const advertisements = await Advertisement.find(effectiveFilter)
          .populate('ownerId', 'firstName lastName email')
          .populate('categoryId', 'name description')
          .populate('tags', 'name')
          .populate('profileId', 'firstName lastName')
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit));

        // Get total count for pagination
        const total = await Advertisement.countDocuments(effectiveFilter);

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
      }
    } catch (error) {
      logger.error('Error during enhanced advertisement search:', error.message);
      throw error;
    }
  }
}

module.exports = new SearchService();