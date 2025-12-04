// src/services/ReviewService.js
const Review = require('../models/Review');
const User = require('../models/User');
const Application = require('../models/Application');
const Advertisement = require('../models/Advertisement');
const AppError = require('../utils/AppError');
const { logger } = require('../logger/logger');

class ReviewService {
  /**
   * Create a new review
   * @param {Object} reviewData - Review data
   * @param {ObjectId} reviewerId - ID of the user creating the review
   * @returns {Promise<Review>} Created review object
   */
  async createReview(reviewData, reviewerId) {
    try {
      // Validate that the reviewer is the one who initiated the review
      if (reviewData.reviewerId.toString() !== reviewerId.toString()) {
        throw new AppError('You can only create a review with your own ID as reviewer', 403);
      }

      // Check if user is trying to review themselves
      if (reviewData.reviewerId.toString() === reviewData.revieweeId.toString()) {
        throw new AppError('You cannot review yourself', 400);
      }

      // Check if a review already exists for this reviewer-reviewee-application combination
      const existingReview = await Review.findOne({
        reviewerId: reviewData.reviewerId,
        revieweeId: reviewData.revieweeId,
        applicationId: reviewData.applicationId
      });

      if (existingReview) {
        throw new AppError('You have already reviewed this user for this application', 400);
      }

      // Validate that the application exists and is completed
      if (reviewData.applicationId) {
        const application = await Application.findById(reviewData.applicationId);
        if (!application) {
          throw new AppError('Application not found', 404);
        }

        // Check if user is authorized to review (either applicant or owner)
        if (
          application.applicantId.toString() !== reviewerId.toString() &&
          application.ownerId.toString() !== reviewerId.toString()
        ) {
          throw new AppError('You are not authorized to review for this application', 403);
        }

        // Optionally, check if the application status allows for review
        // This could be: 'completed', 'accepted' or other status depending on business rules
      }

      // Validate that the reviewee exists
      const reviewee = await User.findById(reviewData.revieweeId);
      if (!reviewee) {
        throw new AppError('Reviewee not found', 404);
      }

      // Create the review
      const review = new Review(reviewData);
      await review.save();

      // Update user's rating after new review is added
      await this.updateUserRating(review.revieweeId);

      // If the review is for an advertisement, update the advertisement's rating
      if (review.advertisementId) {
        await this.updateAdvertisementRating(review.advertisementId);
      }

      // If the review is for an application, update the application's rating
      if (review.applicationId) {
        await this.updateApplicationReviewStatus(review.applicationId);
      }

      // Populate and return the review
      const populatedReview = await Review.findById(review._id)
        .populate('reviewerId', 'firstName lastName email')
        .populate('revieweeId', 'firstName lastName email')
        .populate('advertisementId', 'title')
        .populate('applicationId', 'status')
        .populate('tags', 'name');

      return populatedReview;
    } catch (error) {
      logger.error('Error creating review:', error.message);
      throw error;
    }
  }

  /**
   * Get all reviews for a specific user (reviews where user is the reviewee)
   * @param {ObjectId} revieweeId - ID of the user whose reviews to get
   * @param {Object} options - Query options
   * @param {Number} [options.page=1] - Page number
   * @param {Number} [options.limit=10] - Items per page
   * @param {Number} [options.minRating] - Minimum rating filter
   * @param {Number} [options.maxRating] - Maximum rating filter
   * @param {String} [options.sortBy='createdAt'] - Sort field
   * @param {String} [options.sortOrder='desc'] - Sort order
   * @returns {Promise<Object>} Object with reviews and pagination info
   */
  async getUserReviews(revieweeId, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        minRating,
        maxRating,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      // Build query
      const query = { revieweeId };
      
      // Add rating filters if provided
      if (minRating !== undefined || maxRating !== undefined) {
        query.rating = {};
        if (minRating !== undefined) query.rating.$gte = minRating;
        if (maxRating !== undefined) query.rating.$lte = maxRating;
      }

      // Calculate skip for pagination
      const skip = (page - 1) * limit;

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Get reviews with pagination and populate
      const reviews = await Review.find(query)
        .populate('reviewerId', 'firstName lastName email')
        .populate('advertisementId', 'title')
        .populate('applicationId', 'status')
        .populate('tags', 'name')
        .sort(sort)
        .skip(skip)
        .limit(limit);

      // Get total count for pagination
      const total = await Review.countDocuments(query);

      // Get average rating
      let averageRating = 0;
      if (total > 0) {
        const ratingStats = await Review.aggregate([
          { $match: query },
          { $group: { _id: null, avgRating: { $avg: '$rating' } } }
        ]);
        averageRating = ratingStats.length > 0 ? ratingStats[0].avgRating : 0;
      }

      return {
        reviews,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        },
        averageRating: parseFloat(averageRating.toFixed(2))
      };
    } catch (error) {
      logger.error('Error getting user reviews:', error.message);
      throw error;
    }
  }

  /**
   * Get all reviews by a specific user (reviews where user is the reviewer)
   * @param {ObjectId} reviewerId - ID of the user whose reviews to get
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Object with reviews and pagination info
   */
  async getUserWrittenReviews(reviewerId, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        minRating,
        maxRating,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      // Build query
      const query = { reviewerId };
      
      // Add rating filters if provided
      if (minRating !== undefined || maxRating !== undefined) {
        query.rating = {};
        if (minRating !== undefined) query.rating.$gte = minRating;
        if (maxRating !== undefined) query.rating.$lte = maxRating;
      }

      // Calculate skip for pagination
      const skip = (page - 1) * limit;

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Get reviews with pagination and populate
      const reviews = await Review.find(query)
        .populate('revieweeId', 'firstName lastName email')
        .populate('advertisementId', 'title')
        .populate('applicationId', 'status')
        .populate('tags', 'name')
        .sort(sort)
        .skip(skip)
        .limit(limit);

      // Get total count for pagination
      const total = await Review.countDocuments(query);

      return {
        reviews,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Error getting user written reviews:', error.message);
      throw error;
    }
  }

  /**
   * Get a specific review by ID
   * @param {ObjectId} reviewId - ID of the review
   * @param {ObjectId} userId - ID of the requesting user
   * @returns {Promise<Review>} Review object
   */
  async getReviewById(reviewId, userId) {
    try {
      // Get review with populate
      const review = await Review.findById(reviewId)
        .populate('reviewerId', 'firstName lastName email')
        .populate('revieweeId', 'firstName lastName email')
        .populate('advertisementId', 'title')
        .populate('applicationId', 'status')
        .populate('tags', 'name');

      if (!review) {
        throw new AppError('Review not found', 404);
      }

      return review;
    } catch (error) {
      logger.error('Error getting review by ID:', error.message);
      throw error;
    }
  }

  /**
   * Update a review
   * @param {ObjectId} reviewId - ID of the review to update
   * @param {ObjectId} userId - ID of the requesting user (should be the reviewer)
   * @param {Object} updateData - Data to update
   * @returns {Promise<Review>} Updated review object
   */
  async updateReview(reviewId, userId, updateData) {
    try {
      // Find the review and check if the user is the reviewer
      const review = await Review.findOne({
        _id: reviewId,
        reviewerId: userId
      });

      if (!review) {
        throw new AppError('Review not found or you are not the reviewer', 404);
      }

      // Only allow specific fields to be updated
      const allowedUpdates = ['rating', 'title', 'comment', 'isPositive', 'tags'];
      const updates = {};

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedUpdates.includes(key)) {
          updates[key] = value;
        }
      }

      // Store the old advertisementId if it existed
      const oldAdvertisementId = review.advertisementId;

      // Update the review
      Object.assign(review, updates);
      await review.save();

      // Update user's rating after review is updated
      await this.updateUserRating(review.revieweeId);

      // Update advertisement ratings if the review is associated with an advertisement
      // This handles both updates to the same advertisement and changes to different advertisements
      if (oldAdvertisementId) {
        await this.updateAdvertisementRating(oldAdvertisementId);
      }
      if (review.advertisementId && review.advertisementId.toString() !== oldAdvertisementId?.toString()) {
        await this.updateAdvertisementRating(review.advertisementId);
      }

      // Populate and return the updated review
      const populatedReview = await Review.findById(review._id)
        .populate('reviewerId', 'firstName lastName email')
        .populate('revieweeId', 'firstName lastName email')
        .populate('advertisementId', 'title')
        .populate('applicationId', 'status')
        .populate('tags', 'name');

      return populatedReview;
    } catch (error) {
      logger.error('Error updating review:', error.message);
      throw error;
    }
  }

  /**
   * Delete a review
   * @param {ObjectId} reviewId - ID of the review to delete
   * @param {ObjectId} userId - ID of the requesting user (should be the reviewer)
   * @returns {Promise<boolean>} Success status
   */
  async deleteReview(reviewId, userId) {
    try {
      // Find the review and check if the user is the reviewer
      const review = await Review.findOne({
        _id: reviewId,
        reviewerId: userId
      });

      if (!review) {
        throw new AppError('Review not found or you are not the reviewer', 404);
      }

      // Store the revieweeId and advertisementId before deletion
      const revieweeId = review.revieweeId;
      const advertisementId = review.advertisementId;

      // Delete the review
      await Review.findByIdAndDelete(reviewId);

      // Update user's rating after review is deleted
      await this.updateUserRating(revieweeId);

      // Update advertisement rating if the review was associated with an advertisement
      if (advertisementId) {
        await this.updateAdvertisementRating(advertisementId);
      }

      return true;
    } catch (error) {
      logger.error('Error deleting review:', error.message);
      throw error;
    }
  }

  /**
   * Get reviews for a specific advertisement
   * @param {ObjectId} advertisementId - ID of the advertisement
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Object with reviews and pagination info
   */
  async getAdvertisementReviews(advertisementId, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        minRating,
        maxRating,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      // Build query
      const query = { advertisementId };
      
      // Add rating filters if provided
      if (minRating !== undefined || maxRating !== undefined) {
        query.rating = {};
        if (minRating !== undefined) query.rating.$gte = minRating;
        if (maxRating !== undefined) query.rating.$lte = maxRating;
      }

      // Calculate skip for pagination
      const skip = (page - 1) * limit;

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Get reviews with pagination and populate
      const reviews = await Review.find(query)
        .populate('reviewerId', 'firstName lastName email')
        .populate('revieweeId', 'firstName lastName email')
        .populate('applicationId', 'status')
        .populate('tags', 'name')
        .sort(sort)
        .skip(skip)
        .limit(limit);

      // Get total count for pagination
      const total = await Review.countDocuments(query);

      // Get average rating for this advertisement
      let averageRating = 0;
      if (total > 0) {
        const ratingStats = await Review.aggregate([
          { $match: query },
          { $group: { _id: null, avgRating: { $avg: '$rating' } } }
        ]);
        averageRating = ratingStats.length > 0 ? ratingStats[0].avgRating : 0;
      }

      return {
        reviews,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        },
        averageRating: parseFloat(averageRating.toFixed(2))
      };
    } catch (error) {
      logger.error('Error getting advertisement reviews:', error.message);
      throw error;
    }
  }

  /**
   * Update user's average rating based on all their reviews
   * @param {ObjectId} userId - ID of the user to update
   * @returns {Promise<User>} Updated user object
   */
  async updateUserRating(userId) {
    try {
      // Calculate the average rating for the user
      const ratingStats = await Review.aggregate([
        { $match: { revieweeId: userId } },
        { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
      ]);

      const avgRating = ratingStats.length > 0 ? ratingStats[0].avgRating : 0;
      const count = ratingStats.length > 0 ? ratingStats[0].count : 0;

      // Update the user's rating
      const user = await User.findById(userId);
      if (user) {
        // Update profile rating if profile exists
        if (user.profile) {
          const Profile = require('../models/Profile');
          await Profile.findByIdAndUpdate(user.profile, {
            'rating.average': avgRating,
            'rating.count': count
          });
        }
        
        // Also update advertisement ratings if needed (if advertisement owner)
        const advertisements = await Advertisement.find({ ownerId: userId });
        for (const ad of advertisements) {
          await this.updateAdvertisementRating(ad._id);
        }
      }

      return user;
    } catch (error) {
      logger.error('Error updating user rating:', error.message);
      throw error;
    }
  }

  /**
   * Update advertisement's average rating based on reviews specifically for this advertisement
   * @param {ObjectId} advertisementId - ID of the advertisement to update
   * @returns {Promise<Advertisement>} Updated advertisement object
   */
  async updateAdvertisementRating(advertisementId) {
    try {
      const advertisement = await Advertisement.findById(advertisementId);
      if (!advertisement) {
        throw new AppError('Advertisement not found', 404);
      }

      // Calculate the average rating from reviews specifically for this advertisement
      const ratingStats = await Review.aggregate([
        { $match: { advertisementId: advertisement._id } },
        { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
      ]);

      const avgRating = ratingStats.length > 0 ? ratingStats[0].avgRating : 0;
      const count = ratingStats.length > 0 ? ratingStats[0].count : 0;

      // Update the advertisement's rating
      advertisement.rating = {
        average: parseFloat(avgRating.toFixed(2)), // Round to 2 decimal places
        count: count
      };

      await advertisement.save();

      return advertisement;
    } catch (error) {
      logger.error('Error updating advertisement rating:', error.message);
      throw error;
    }
  }

  /**
   * Update advertisement's rating based on reviews related to the owner (alternative method)
   * This can be used when we want to show the owner's overall reputation for the ad
   * @param {ObjectId} advertisementId - ID of the advertisement to update
   * @param {Boolean} useOwnerRating - Whether to use the owner's overall rating instead of ad-specific rating
   * @returns {Promise<Advertisement>} Updated advertisement object
   */
  async updateAdvertisementOwnerRating(advertisementId, useOwnerRating = true) {
    try {
      const advertisement = await Advertisement.findById(advertisementId);
      if (!advertisement) {
        throw new AppError('Advertisement not found', 404);
      }

      // Calculate the average rating for the owner of this advertisement
      const ratingStats = await Review.aggregate([
        { $match: { revieweeId: advertisement.ownerId } },
        { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
      ]);

      const avgRating = ratingStats.length > 0 ? ratingStats[0].avgRating : 0;
      const count = ratingStats.length > 0 ? ratingStats[0].count : 0;

      // Update the advertisement's rating to match owner's rating
      advertisement.rating = {
        average: parseFloat(avgRating.toFixed(2)), // Round to 2 decimal places
        count: count
      };

      await advertisement.save();

      return advertisement;
    } catch (error) {
      logger.error('Error updating advertisement owner rating:', error.message);
      throw error;
    }
  }

  /**
   * Get the rating information for an advertisement
   * @param {ObjectId} advertisementId - ID of the advertisement
   * @returns {Promise<Object>} Rating information including average, count, and distribution
   */
  async getAdvertisementRatingInfo(advertisementId) {
    try {
      // Get all reviews for this advertisement
      const reviews = await Review.find({ advertisementId });

      if (reviews.length === 0) {
        return {
          average: 0,
          count: 0,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };
      }

      // Calculate average
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const average = totalRating / reviews.length;

      // Calculate distribution
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      reviews.forEach(review => {
        distribution[review.rating] = (distribution[review.rating] || 0) + 1;
      });

      return {
        average: parseFloat(average.toFixed(2)),
        count: reviews.length,
        distribution
      };
    } catch (error) {
      logger.error('Error getting advertisement rating info:', error.message);
      throw error;
    }
  }

  /**
   * Update application review status if review is verified
   * @param {ObjectId} applicationId - ID of the application
   */
  async updateApplicationReviewStatus(applicationId) {
    try {
      // Update application to mark that a review has been left
      const application = await Application.findById(applicationId);
      if (application) {
        // Set ratingGiven field to indicate a review has been left
        application.ratingGiven = 5; // Placeholder - in real implementation this might be set differently
        await application.save();
      }
    } catch (error) {
      logger.error('Error updating application review status:', error.message);
      throw error;
    }
  }

  /**
   * Check if user can review another user for a specific application
   * @param {ObjectId} reviewerId - ID of the reviewer
   * @param {ObjectId} revieweeId - ID of the reviewee
   * @param {ObjectId} applicationId - ID of the application
   * @returns {Promise<boolean>} Whether the review is allowed
   */
  async canReview(reviewerId, revieweeId, applicationId) {
    try {
      // Check if the user is trying to review themselves
      if (reviewerId.toString() === revieweeId.toString()) {
        return false;
      }

      // Check if the application exists and if the reviewer is part of it
      const application = await Application.findById(applicationId);
      if (!application) {
        return false;
      }

      // Check if the reviewer is either the applicant or the owner
      const isApplicant = application.applicantId.toString() === reviewerId.toString();
      const isOwner = application.ownerId.toString() === reviewerId.toString();

      if (!isApplicant && !isOwner) {
        return false;
      }

      // Check if the reviewee is the other party in the application
      const isValidReviewee = (isApplicant && application.ownerId.toString() === revieweeId.toString()) ||
                              (isOwner && application.applicantId.toString() === revieweeId.toString());
      
      if (!isValidReviewee) {
        return false;
      }

      // Check if a review already exists for this combination
      const existingReview = await Review.findOne({
        reviewerId,
        revieweeId,
        applicationId
      });

      return !existingReview; // Return true if no review exists yet
    } catch (error) {
      logger.error('Error checking if user can review:', error.message);
      throw error;
    }
  }
}

module.exports = new ReviewService();