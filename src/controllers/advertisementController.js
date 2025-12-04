// src/controllers/advertisementController.js
const Advertisement = require('../models/Advertisement');
const Category = require('../models/Category');
const Tag = require('../models/Tag');
const Profile = require('../models/Profile');
const User = require('../models/User');
const SearchService = require('../services/SearchService');
const { logger } = require('../logger/logger');
const AppError = require('../utils/AppError');

// Helper function to get all subcategories for a given category
async function getCategoryWithChildren(categoryId) {
  const CategoryModel = require('../models/Category');
  const categoriesToInclude = [categoryId];

  // Recursively find all child categories
  const findChildCategories = async (parentIds) => {
    const children = await CategoryModel.find({ parentId: { $in: parentIds } });
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

const advertisementController = {
  // Create new advertisement
  createAdvertisement: async (req, res, next) => {
    try {
      const { 
        title, 
        description, 
        categoryId, 
        tags = [], 
        type, 
        exchangePreferences, 
        location, 
        coordinates, 
        isUrgent, 
        expiresAt 
      } = req.body;

      // Verify that category exists
      const category = await Category.findById(categoryId);
      if (!category) {
        return next(new AppError('Category not found', 404));
      }

      // Verify that all tags exist
      if (tags.length > 0) {
        const existingTags = await Tag.find({ _id: { $in: tags } });
        if (existingTags.length !== tags.length) {
          return next(new AppError('One or more tags do not exist', 400));
        }
      }

      // Verify that profile exists (optional, but if provided)
      let profile = null;
      if (req.body.profileId) {
        profile = await Profile.findById(req.body.profileId);
        if (!profile) {
          return next(new AppError('Profile not found', 404));
        }
        // Check if profile belongs to user
        if (profile.userId.toString() !== req.user._id.toString()) {
          return next(new AppError('You do not own this profile', 403));
        }
      }

      // Prepare the advertisement data
      const advertisementData = {
        title,
        description,
        ownerId: req.user._id,
        categoryId,
        tags,
        type,
        exchangePreferences,
        location,
        isUrgent: Boolean(isUrgent),
        ...(expiresAt && { expiresAt: new Date(expiresAt) })
      };

      // Add coordinates if provided
      if (coordinates && coordinates.coordinates && coordinates.coordinates.length === 2) {
        advertisementData.coordinates = {
          type: 'Point',
          coordinates: [parseFloat(coordinates.coordinates[0]), parseFloat(coordinates.coordinates[1])]
        };
      }

      // Use profile if provided, otherwise no profile
      if (profile) {
        advertisementData.profileId = profile._id;
      }

      // Create the advertisement
      const advertisement = await Advertisement.create(advertisementData);

      // Update search vector to include tag names and other searchable fields
      await SearchService.updateAdvertisementSearchVector(advertisement._id);

      // Populate the response with related data
      const populatedAdvertisement = await Advertisement.findById(advertisement._id)
        .populate('ownerId', 'firstName lastName email')
        .populate('categoryId', 'name description')
        .populate('tags', 'name')
        .populate('profileId', 'firstName lastName');

      res.status(201).json({
        success: true,
        data: populatedAdvertisement,
        message: 'Advertisement created successfully'
      });
    } catch (error) {
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return next(new AppError(`Validation Error: ${errors.join(', ')}`, 400));
      }
      logger.error('Error creating advertisement:', error.message);
      next(error);
    }
  },

  // Get all advertisements with filtering, sorting, and pagination
  getAllAdvertisements: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
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
        longitude,
        latitude,
        maxDistance,
        hasPortfolio,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Build filter object
      const filter = { isActive: true }; // Only active by default

      if (isActive !== 'any') {
        filter.isActive = isActive === 'true';
      }

      // Allow filtering by archived status as well
      if (isArchived !== undefined) {
        if (isArchived === 'any') {
          delete filter.isActive; // Remove isActive filter to show all
        } else {
          filter.isArchived = isArchived === 'true';
        }
      }

      // Handle category filtering (single category ID, multiple category IDs, with or without subcategories)
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
      if (tagId) filter.tags = { $in: [tagId] };
      if (type) filter.type = type;
      if (location) filter.location = { $regex: location, $options: 'i' };
      if (isUrgent) filter.isUrgent = isUrgent === 'true';

      // Additional filters that were extracted from the query parameters
      if (ownerId) filter.ownerId = ownerId;
      if (profileId) filter.profileId = profileId;

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

      // Portfolio filter - need to handle this specially since it requires joining with Profile
      if (hasPortfolio !== undefined) {
        // This will be handled in the query builder section below
      }

      // Language filter - need to handle this specially since it requires joining with Profile
      if (languages && languages.length > 0) {
        // This will be handled in the query builder section below
      }

      // Use enhanced search if search query is provided
      if (search) {
        const result = await SearchService.searchAdvertisements(search, {
          page,
          limit,
          type,
          categoryId,
          tagId,
          location,
          isUrgent,
          isArchived,
          isActive,
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
          hasPortfolio, // Add the hasPortfolio filter
          languages, // Add the languages filter
          longitude,
          latitude,
          maxDistance,
          sortBy,
          sortOrder
        });

        res.status(200).json({
          success: true,
          data: result.advertisements,
          pagination: result.pagination,
          filters: {
            search,
            type,
            categoryId,
            tagId,
            location,
            isUrgent,
            isArchived,
            isActive,
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
            hasPortfolio, // Include hasPortfolio in filters
            longitude,
            latitude,
            maxDistance,
            sortBy,
            sortOrder
          }
        });
      } else {
        // For non-search queries, build the standard filter with geo-location if provided
        let advertisements;
        let total;

        if (hasPortfolio !== undefined || (languages && languages.length > 0)) {
          // Use aggregation pipeline for hasPortfolio or languages filter
          const pipeline = [];

          // Match phase with existing filters
          pipeline.push({ $match: filter });

          // Join with Profile collection to check for portfolio items or languages
          pipeline.push({
            $lookup: {
              from: 'profiles',
              localField: 'profileId',
              foreignField: '_id',
              as: 'profileInfo'
            }
          });

          // Handle portfolio filter if specified
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

          // Handle languages filter if specified
          if (languages && languages.length > 0) {
            // Match advertisements whose profile has any of the specified languages
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

          // Add geographic filtering if applicable
          if (longitude && latitude) {
            pipeline.push({
              $match: {
                coordinates: {
                  $geoWithin: {
                    $centerSphere: [
                      [parseFloat(longitude), parseFloat(latitude)],
                      parseFloat(maxDistance || 10000) / 6378137 // Convert meters to radians
                    ]
                  }
                }
              }
            });
          }

          // Sort
          const sortObj = {};
          sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;
          pipeline.push({ $sort: sortObj });

          // Skip and limit for pagination
          pipeline.push({ $skip: (parseInt(page) - 1) * parseInt(limit) });
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

          advertisements = await Advertisement.aggregate(pipeline);

          // For total count, we need a separate pipeline
          const countPipeline = [];
          countPipeline.push({ $match: filter });

          // Join profiles for count pipeline as well
          countPipeline.push({
            $lookup: {
              from: 'profiles',
              localField: 'profileId',
              foreignField: '_id',
              as: 'profileInfo'
            }
          });

          // Apply portfolio filter to count pipeline if needed
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

          if (longitude && latitude) {
            // Add geo filter to count pipeline too
            countPipeline.push({
              $match: {
                coordinates: {
                  $geoWithin: {
                    $centerSphere: [
                      [parseFloat(longitude), parseFloat(latitude)],
                      parseFloat(maxDistance || 10000) / 6378137 // Convert meters to radians
                    ]
                  }
                }
              }
            });
          }

          countPipeline.push({ $count: 'total' });
          const countResult = await Advertisement.aggregate(countPipeline);
          total = countResult.length > 0 ? countResult[0].total : 0;
        } else {
          // Regular find without portfolio or language filters, but with subcategory support
          let advertisementsQuery;
          let effectiveFilter = filter;

          // If we need to include subcategories, adjust the filter
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

          if (longitude && latitude) {
            // Geographic search using coordinates
            advertisementsQuery = Advertisement.find({
              ...effectiveFilter,
              coordinates: {
                $geoWithin: {
                  $centerSphere: [
                    [parseFloat(longitude), parseFloat(latitude)],
                    parseFloat(maxDistance || 10000) / 6378137 // Convert meters to radians
                  ]
                }
              }
            });
          } else {
            advertisementsQuery = Advertisement.find(effectiveFilter);
          }

          // Calculate pagination
          const skip = (parseInt(page) - 1) * parseInt(limit);

          // Set up query with populate
          const sortObj = {};
          sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;
          advertisementsQuery
            .populate('ownerId', 'firstName lastName email')
            .populate('categoryId', 'name description')
            .populate('tags', 'name')
            .populate('profileId', 'firstName lastName')
            .sort(sortObj)
            .skip(skip)
            .limit(parseInt(limit));

          advertisements = await advertisementsQuery;

          // Get total count for pagination
          // Use the same filters for count but without geo-location for efficiency
          let totalCountFilter = effectiveFilter;
          if (longitude && latitude) {
            totalCountFilter = { ...effectiveFilter }; // Count total without geo filter
          }
          total = await Advertisement.countDocuments(totalCountFilter);
        }

        res.status(200).json({
          success: true,
          data: advertisements,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
            hasNext: parseInt(page) * parseInt(limit) < total,
            hasPrev: parseInt(page) > 1
          },
          filters: {
            search,
            type,
            categoryId,
            tagId,
            location,
            isUrgent,
            isArchived,
            isActive,
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
            languages, // Include languages in filters
            longitude,
            latitude,
            maxDistance,
            sortBy,
            sortOrder
          }
        });
      }
    } catch (error) {
      logger.error('Error getting advertisements:', error.message);
      next(error);
    }
  },

  // Get advertisement by ID
  getAdvertisementById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const advertisement = await Advertisement.findById(id)
        .populate('ownerId', 'firstName lastName email')
        .populate('categoryId', 'name description')
        .populate('tags', 'name')
        .populate('profileId', 'firstName lastName');

      if (!advertisement) {
        return next(new AppError('Advertisement not found', 404));
      }

      // Increment view count
      advertisement.views += 1;
      await advertisement.save({ validateBeforeSave: false });

      res.status(200).json({
        success: true,
        data: advertisement
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return next(new AppError('Invalid advertisement ID format', 400));
      }
      logger.error('Error getting advertisement by ID:', error.message);
      next(error);
    }
  },

  // Update advertisement by ID
  updateAdvertisement: async (req, res, next) => {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };

      // Find the advertisement
      const advertisement = await Advertisement.findById(id);
      if (!advertisement) {
        return next(new AppError('Advertisement not found', 404));
      }

      // Check if user owns the advertisement
      if (advertisement.ownerId.toString() !== req.user._id.toString()) {
        return next(new AppError('You do not have permission to update this advertisement', 403));
      }

      // Verify category if it's being updated
      if (updateData.categoryId) {
        const category = await Category.findById(updateData.categoryId);
        if (!category) {
          return next(new AppError('Category not found', 404));
        }
      }

      // Verify tags if they're being updated
      if (updateData.tags && Array.isArray(updateData.tags) && updateData.tags.length > 0) {
        const existingTags = await Tag.find({ _id: { $in: updateData.tags } });
        if (existingTags.length !== updateData.tags.length) {
          return next(new AppError('One or more tags do not exist', 400));
        }
      }

      // Verify profile if it's being updated
      if (updateData.profileId) {
        const profile = await Profile.findById(updateData.profileId);
        if (!profile) {
          return next(new AppError('Profile not found', 404));
        }
        // Check if profile belongs to user
        if (profile.userId.toString() !== req.user._id.toString()) {
          return next(new AppError('You do not own this profile', 403));
        }
      }

      // Handle coordinates if provided
      if (updateData.coordinates) {
        if (updateData.coordinates.coordinates && updateData.coordinates.coordinates.length === 2) {
          updateData.coordinates = {
            type: 'Point',
            coordinates: [parseFloat(updateData.coordinates.coordinates[0]), parseFloat(updateData.coordinates.coordinates[1])]
          };
        }
      }

      // Update the advertisement
      Object.assign(advertisement, updateData);
      await advertisement.save();

      // Update search vector to include tag names and other searchable fields
      await SearchService.updateAdvertisementSearchVector(advertisement._id);

      // Populate and return updated advertisement
      const updatedAdvertisement = await Advertisement.findById(advertisement._id)
        .populate('ownerId', 'firstName lastName email')
        .populate('categoryId', 'name description')
        .populate('tags', 'name')
        .populate('profileId', 'firstName lastName');

      res.status(200).json({
        success: true,
        data: updatedAdvertisement,
        message: 'Advertisement updated successfully'
      });
    } catch (error) {
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return next(new AppError(`Validation Error: ${errors.join(', ')}`, 400));
      }
      if (error.name === 'CastError') {
        return next(new AppError('Invalid advertisement ID format', 400));
      }
      logger.error('Error updating advertisement:', error.message);
      next(error);
    }
  },

  // Delete advertisement by ID
  deleteAdvertisement: async (req, res, next) => {
    try {
      const { id } = req.params;

      const advertisement = await Advertisement.findById(id);
      if (!advertisement) {
        return next(new AppError('Advertisement not found', 404));
      }

      // Check if user owns the advertisement
      if (advertisement.ownerId.toString() !== req.user._id.toString()) {
        return next(new AppError('You do not have permission to delete this advertisement', 403));
      }

      await Advertisement.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: 'Advertisement deleted successfully'
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return next(new AppError('Invalid advertisement ID format', 400));
      }
      logger.error('Error deleting advertisement:', error.message);
      next(error);
    }
  },

  // Archive advertisement (soft delete)
  archiveAdvertisement: async (req, res, next) => {
    try {
      const { id } = req.params;

      const advertisement = await Advertisement.findById(id);
      if (!advertisement) {
        return next(new AppError('Advertisement not found', 404));
      }

      // Check if user owns the advertisement
      if (advertisement.ownerId.toString() !== req.user._id.toString()) {
        return next(new AppError('You do not have permission to archive this advertisement', 403));
      }

      // Update to archive the advertisement
      advertisement.isArchived = true;
      advertisement.archivedAt = new Date();
      advertisement.isActive = false;
      await advertisement.save();

      res.status(200).json({
        success: true,
        data: advertisement,
        message: 'Advertisement archived successfully'
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return next(new AppError('Invalid advertisement ID format', 400));
      }
      logger.error('Error archiving advertisement:', error.message);
      next(error);
    }
  },

  // Get user's advertisements
  getUserAdvertisements: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 10,
        isActive,
        isArchived,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Build filter object for user's advertisements
      const filter = {
        ownerId: req.user._id
      };

      if (isActive !== undefined) {
        filter.isActive = isActive === 'true';
      }

      if (isArchived !== undefined) {
        filter.isArchived = isArchived === 'true';
      }

      // Determine sort order
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Get user's advertisements with filtering and sorting
      let userAdsQuery = Advertisement.find(filter)
        .populate('categoryId', 'name description')
        .populate('tags', 'name')
        .populate('profileId', 'firstName lastName');

      if (Object.keys(sort).length > 0) {
        userAdsQuery = userAdsQuery.sort(sort);
      }

      const userAdvertisements = await userAdsQuery
        .skip(skip)
        .limit(parseInt(limit));

      // Get total count for pagination
      const total = await Advertisement.countDocuments(filter);

      res.status(200).json({
        success: true,
        data: userAdvertisements,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
          hasNext: parseInt(page) * parseInt(limit) < total,
          hasPrev: parseInt(page) > 1
        }
      });
    } catch (error) {
      logger.error('Error getting user advertisements:', error.message);
      next(error);
    }
  },

  // Activate an archived advertisement
  activateAdvertisement: async (req, res, next) => {
    try {
      const { id } = req.params;

      const advertisement = await Advertisement.findById(id);
      if (!advertisement) {
        return next(new AppError('Advertisement not found', 404));
      }

      // Check if user owns the advertisement
      if (advertisement.ownerId.toString() !== req.user._id.toString()) {
        return next(new AppError('You do not have permission to activate this advertisement', 403));
      }

      if (!advertisement.isArchived) {
        return next(new AppError('Advertisement is not archived', 400));
      }

      // Activate the advertisement
      advertisement.isArchived = false;
      advertisement.archivedAt = undefined;
      advertisement.isActive = true;

      // If the expiresAt date was in the past, set a new default expiration (e.g., 30 days from now)
      if (advertisement.expiresAt && advertisement.expiresAt < new Date()) {
        advertisement.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      }

      await advertisement.save();

      res.status(200).json({
        success: true,
        data: advertisement,
        message: 'Advertisement activated successfully'
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return next(new AppError('Invalid advertisement ID format', 400));
      }
      logger.error('Error activating advertisement:', error.message);
      next(error);
    }
  }
};

module.exports = advertisementController;