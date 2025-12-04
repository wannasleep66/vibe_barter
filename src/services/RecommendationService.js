// src/services/RecommendationService.js
const Advertisement = require('../models/Advertisement');
const UserPreference = require('../models/UserPreference');
const InteractionHistory = require('../models/InteractionHistory');
const { logger } = require('../logger/logger');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10 minutes cache

class RecommendationService {
  /**
   * Get recommended advertisements for a user based on their preferences and interaction history
   */
  async getRecommendedAdvertisements(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        fallbackToGeneral = true,   // Whether to fall back to general search when no preferences found
        minRelevanceScore = 0.1,    // Minimum relevance score for inclusion
        excludeInteracted = true    // Whether to exclude previously interacted ads
      } = options;

      // Create cache key based on parameters
      const cacheKey = `recommendations_${userId}_${page}_${limit}_${minRelevanceScore}_${excludeInteracted}`;
      const cachedResult = cache.get(cacheKey);

      if (cachedResult) {
        logger.info(`Using cached recommendations for user ${userId}`);
        return cachedResult;
      }

      // Get user preferences
      const userPreferences = await UserPreference.findOne({ userId }).populate('preferredCategories preferredTags');

      // If user has no preferences and fallback is enabled, return general recommendations
      if (!userPreferences && fallbackToGeneral) {
        const result = await this.getGeneralAdvertisements({ page, limit });
        cache.set(cacheKey, result);
        return result;
      }

      // Use optimized approach: apply initial filters to database query first,
      // then calculate relevance scores on smaller dataset
      const query = this.buildRecommendationQuery(userId, userPreferences, { excludeInteracted });

      // Use aggregation pipeline for better performance with complex queries
      const pipeline = [];

      // Match stage - Apply initial filters from query.filter
      pipeline.push({ $match: query.filter });

      // Exclude previously interacted ads if requested
      if (excludeInteracted) {
        // Get IDs of ads user has interacted with
        const interactedAds = await InteractionHistory.find({ userId: userId }, { advertisementId: 1 });
        const interactedAdIds = interactedAds.map(interaction => interaction.advertisementId);

        if (interactedAdIds.length > 0) {
          pipeline.push({ $match: { _id: { $nin: interactedAdIds } } });
        }
      }

      // Add popularity-based boost for initial ranking
      pipeline.push({
        $addFields: {
          popularityScore: {
            $add: [
              { $multiply: [ { $ifNull: ['$rating.average', 0] }, 0.4 ] },  // Rating weight
              { $multiply: [ { $divide: [{ $log: { $add: ['$views', 1] } }, 10] }, 0.3 ] },  // View weight (log scale)
              { $cond: { if: '$isUrgent', then: 0.3, else: 0 } }  // Urgent boost
            ]
          }
        }
      });

      // Sort by popularity score first to reduce processing for later stages
      pipeline.push({ $sort: { popularityScore: -1 } });

      // Limit to a reasonable number before relevance calculation (optimization)
      pipeline.push({ $limit: parseInt(limit) * 5 }); // Fetch 5x more than needed for relevance filtering

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

      let advertisements = await Advertisement.aggregate(pipeline);

      // Calculate relevance scores for the smaller set of advertisements
      const scoredAds = await this.calculateRelevanceScores(
        advertisements,
        userPreferences,
        userId
      );

      // Filter by minimum relevance score
      const filteredAds = scoredAds.filter(ad => ad.relevanceScore >= minRelevanceScore);

      // Sort by relevance score (descending)
      filteredAds.sort((a, b) => b.relevanceScore - a.relevanceScore);

      // Pagination
      const startIndex = (parseInt(page) - 1) * parseInt(limit);
      const endIndex = startIndex + parseInt(limit);
      const paginatedAds = filteredAds.slice(startIndex, endIndex);
      const total = filteredAds.length;

      const result = {
        advertisements: paginatedAds,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
          hasNext: parseInt(page) * parseInt(limit) < total,
          hasPrev: parseInt(page) > 1
        },
        filters: {
          type: 'recommended',
          page,
          limit
        }
      };

      // Cache the result for future requests
      cache.set(cacheKey, result);

      return result;
    } catch (error) {
      logger.error('Error getting recommended advertisements:', error.message);
      throw error;
    }
  }

  /**
   * Build query to find advertisements matching user preferences
   */
  buildRecommendationQuery(userId, userPreferences, options = {}) {
    const { excludeInteracted = true } = options;
    const query = { isActive: true, isArchived: false }; // Only active and not archived ads

    if (userPreferences) {
      // Add category filter if preferences exist
      if (userPreferences.preferredCategories && userPreferences.preferredCategories.length > 0) {
        const categoryIds = userPreferences.preferredCategories.map(cat =>
          typeof cat === 'object' ? cat._id : cat
        );
        query.categoryId = { $in: categoryIds };
      }

      // Add type filter
      if (userPreferences.preferredTypes && userPreferences.preferredTypes.length > 0) {
        query.type = { $in: userPreferences.preferredTypes };
      }

      // Add tag filter
      if (userPreferences.preferredTags && userPreferences.preferredTags.length > 0) {
        const tagIds = userPreferences.preferredTags.map(tag =>
          typeof tag === 'object' ? tag._id : tag
        );
        query.tags = { $in: tagIds };
      }

      // Add location filter
      if (userPreferences.preferredLocations && userPreferences.preferredLocations.length > 0) {
        // Use regex for partial matching in locations
        query.location = { $regex: userPreferences.preferredLocations.join('|'), $options: 'i' };
      }

      // Add rating filter
      if (userPreferences.minRating && userPreferences.minRating > 0) {
        query['rating.average'] = { $gte: userPreferences.minRating };
      }

      // Add author rating filter
      if (userPreferences.minAuthorRating && userPreferences.minAuthorRating > 0) {
        // This will be handled in the aggregation pipeline
      }

      // Exclude inactive users if preferred
      if (userPreferences.excludeInactiveUsers) {
        // This would require joining with users collection to check activity
      }
    }

    return { filter: query };
  }

  /**
   * Calculate relevance scores for advertisements based on preferences
   */
  async calculateRelevanceScores(advertisements, userPreferences, userId) {
    // Get user's interaction history to factor in behavioral patterns
    const interactionHistory = await this.getUserInteractionHistory(userId);

    // Process each advertisement to calculate relevance score
    return advertisements.map(ad => {
      const score = this.calculateAdRelevance(ad, userPreferences, interactionHistory);
      return {
        ...ad.toObject(),
        relevanceScore: score
      };
    });
  }

  /**
   * Calculate individual advertisement relevance score based on various factors
   */
  calculateAdRelevance(advertisement, userPreferences, interactionHistory) {
    if (!userPreferences) {
      // If no preferences, return a default relevance based on advertisement quality
      return this.calculateDefaultRelevance(advertisement);
    }

    let totalScore = 0;
    const weights = userPreferences.preferenceScoreWeights || {
      categoryMatch: 0.3,
      typeMatch: 0.2,
      tagMatch: 0.2,
      locationMatch: 0.15,
      ratingMatch: 0.15
    };

    // Category match score
    let categoryScore = 0;
    if (userPreferences.preferredCategories && userPreferences.preferredCategories.length > 0) {
      const preferredCategoryIds = userPreferences.preferredCategories.map(cat =>
        typeof cat === 'object' ? cat._id.toString() : cat.toString()
      );
      const adCategoryId = typeof advertisement.categoryId === 'object'
        ? advertisement.categoryId._id.toString()
        : advertisement.categoryId ? advertisement.categoryId.toString() : '';
      categoryScore = preferredCategoryIds.includes(adCategoryId) ? 1 : 0;
    }
    totalScore += categoryScore * weights.categoryMatch;

    // Type match score
    let typeScore = 0;
    if (userPreferences.preferredTypes && userPreferences.preferredTypes.length > 0) {
      typeScore = userPreferences.preferredTypes.includes(advertisement.type) ? 1 : 0;
    }
    totalScore += typeScore * weights.typeMatch;

    // Tag match score
    let tagScore = 0;
    if (userPreferences.preferredTags && userPreferences.preferredTags.length > 0 && advertisement.tags) {
      const preferredTagIds = userPreferences.preferredTags.map(tag =>
        typeof tag === 'object' ? tag._id.toString() : tag.toString()
      );

      // advertisement.tags might be an array of objects or array of IDs
      let adTagIds = [];
      if (Array.isArray(advertisement.tags)) {
        adTagIds = advertisement.tags.map(tag =>
          typeof tag === 'object' ? tag._id.toString() : tag.toString()
        );
      } else if (advertisement.tags && typeof advertisement.tags === 'object') {
        // If it's a single tag object
        adTagIds = [advertisement.tags._id.toString()];
      }

      const matchedTags = adTagIds.filter(tagId => preferredTagIds.includes(tagId)).length;
      tagScore = matchedTags > 0 ? Math.min(matchedTags / userPreferences.preferredTags.length, 1) : 0;
    }
    totalScore += tagScore * weights.tagMatch;

    // Location match score
    let locationScore = 0;
    if (userPreferences.preferredLocations && userPreferences.preferredLocations.length > 0) {
      locationScore = userPreferences.preferredLocations.some(loc => 
        advertisement.location && 
        advertisement.location.toLowerCase().includes(loc.toLowerCase())
      ) ? 1 : 0;
    }
    totalScore += locationScore * weights.locationMatch;

    // Rating match score
    let ratingScore = 0;
    if (userPreferences.minRating && advertisement.rating && advertisement.rating.average) {
      if (advertisement.rating.average >= userPreferences.minRating) {
        ratingScore = Math.min(advertisement.rating.average / 5, 1); // Normalize to 0-1 range
      }
    }
    totalScore += ratingScore * weights.ratingMatch;

    // Behavioral scoring based on past interactions
    const behavioralScore = this.calculateBehavioralScore(advertisement, interactionHistory);
    totalScore += behavioralScore * 0.3; // Behavioral score gets additional weight
    
    // Adjust score based on advertisement freshness (newer ads might be more relevant)
    const daysSinceCreated = advertisement.createdAt ?
      (Date.now() - new Date(advertisement.createdAt).getTime()) / (1000 * 60 * 60 * 24) : 0;
    const freshnessFactor = Math.max(0, 1 - (daysSinceCreated / 30)); // Decreases relevance after 30 days
    totalScore *= freshnessFactor;

    // Ensure score is between 0 and 1
    return Math.min(Math.max(totalScore, 0), 1);
  }

  /**
   * Calculate default relevance for users without preferences
   */
  calculateDefaultRelevance(advertisement) {
    // For users without preferences, calculate relevance based on general metrics
    let score = 0.5; // Base score
    
    // Boost for higher-rated ads
    if (advertisement.rating && advertisement.rating.average) {
      score += (advertisement.rating.average / 5) * 0.2;
    }

    // Boost for more viewed ads (popularity)
    if (advertisement.views > 10) {
      score += Math.min(Math.log(advertisement.views / 10) * 0.1, 0.15);
    }

    // Boost for newer ads
    const daysSinceCreated = (Date.now() - new Date(advertisement.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated < 7) {
      score += 0.1;
    }

    // Boost for urgent ads
    if (advertisement.isUrgent) {
      score += 0.05;
    }

    // Cap between 0 and 1
    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * Calculate behavioral score based on user's past interactions
   */
  calculateBehavioralScore(advertisement, interactionHistory) {
    if (!interactionHistory || interactionHistory.length === 0) {
      return 0;
    }

    // Check if user previously interacted with similar ads (same category, type, or tags)
    let behavioralScore = 0;
    let matchingInteractions = 0;

    interactionHistory.forEach(history => {
      const histAd = history.advertisementId;
      if (!histAd) return; // Skip if ad doesn't exist

      // Check category match
      if (histAd.categoryId && advertisement.categoryId && 
          histAd.categoryId.toString() === advertisement.categoryId._id.toString()) {
        matchingInteractions++;
      }

      // Check type match
      if (histAd.type === advertisement.type) {
        matchingInteractions++;
      }

      // Check tag matches
      if (histAd.tags && advertisement.tags) {
        const histTagIds = Array.isArray(histAd.tags) 
          ? histAd.tags.map(tag => tag._id.toString())
          : [histAd.tags._id.toString()];
        const adTagIds = Array.isArray(advertisement.tags) 
          ? advertisement.tags.map(tag => tag._id.toString())
          : [advertisement.tags._id.toString()];
        
        const commonTags = histTagIds.filter(tagId => adTagIds.includes(tagId)).length;
        matchingInteractions += commonTags;
      }
    });

    // Normalize behavioral score based on number of matching interactions
    // More matching interactions indicate higher behavioral relevance
    behavioralScore = Math.min(matchingInteractions / (interactionHistory.length * 2), 1);
    
    return behavioralScore;
  }

  /**
   * Get general advertisements (non-personalized)
   */
  async getGeneralAdvertisements(options = {}) {
    const { page = 1, limit = 10 } = options;

    const advertisements = await Advertisement.find({ isActive: true, isArchived: false })
      .populate('ownerId', 'firstName lastName email')
      .populate('categoryId', 'name description')
      .populate('tags', 'name')
      .populate('profileId', 'firstName lastName')
      .sort({ createdAt: -1 }) // Sort by newest
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Advertisement.countDocuments({ isActive: true, isArchived: false });

    return {
      advertisements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
        hasNext: parseInt(page) * parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      },
      filters: {
        type: 'general',
        page,
        limit
      }
    };
  }

  /**
   * Record user interaction for future recommendations
   */
  async recordUserInteraction(userId, advertisementId, interactionType, additionalData = {}) {
    try {
      const interaction = new InteractionHistory({
        userId,
        advertisementId,
        type: interactionType,
        ...additionalData
      });

      await interaction.save();
      return interaction;
    } catch (error) {
      logger.error('Error recording user interaction:', error.message);
      throw error;
    }
  }

  /**
   * Get user interaction history for recommendations
   */
  async getUserInteractionHistory(userId, options = {}) {
    try {
      const {
        types = ['view', 'apply', 'favorite', 'accept', 'reject'],
        limit = 50,
        daysBack = 90
      } = options;

      const cutoffDate = new Date(Date.now() - (daysBack * 24 * 60 * 60 * 1000));

      const interactions = await InteractionHistory.find({
        userId: userId,
        type: { $in: types },
        createdAt: { $gte: cutoffDate }
      })
        .populate('advertisementId', 'categoryId tags type location')
        .sort({ createdAt: -1 })
        .limit(limit);

      return interactions;
    } catch (error) {
      logger.error('Error getting user interaction history:', error.message);
      throw error;
    }
  }

  /**
   * Clear user-related cache when preferences change
   */
  clearUserCache(userId) {
    // Remove all cached entries related to this user
    const keys = cache.keys();
    for (const key of keys) {
      if (key.includes(`recommendations_${userId}`)) {
        cache.del(key);
      }
    }
  }
}

module.exports = new RecommendationService();