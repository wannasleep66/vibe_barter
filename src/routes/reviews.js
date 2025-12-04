// src/routes/reviews.js
const express = require('express');
const reviewController = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');
const { 
  requirePermissions,
  isOwnResourceOrAdmin 
} = require('../middleware/rbac');
const {
  validateCreateReview,
  validateUpdateReview,
  validateReviewId,
  validateAdvertisementId,
  validateUserId,
  validateReviewsQuery
} = require('../middleware/validation/reviewValidation');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// POST /api/reviews - Create a new review
router.post('/',
  requirePermissions('review.create'),
  validateCreateReview,
  reviewController.createReview
);

// GET /api/reviews/user/:id - Get all reviews for a specific user (user is reviewee)
router.get('/user/:id',
  requirePermissions('review.read'),
  validateUserId,
  validateReviewsQuery,
  reviewController.getUserReviews
);

// GET /api/reviews/written/:id - Get all reviews written by a specific user (user is reviewer)
router.get('/written/:id',
  requirePermissions('review.read'),
  validateUserId,
  validateReviewsQuery,
  reviewController.getUserWrittenReviews
);

// GET /api/reviews/:id - Get a specific review by ID
router.get('/:id',
  requirePermissions('review.read'),
  validateReviewId,
  reviewController.getReviewById
);

// GET /api/reviews/advertisement/:advertisementId - Get reviews for a specific advertisement
router.get('/advertisement/:advertisementId',
  requirePermissions('review.read'),
  validateAdvertisementId,
  validateReviewsQuery,
  reviewController.getAdvertisementReviews
);

// PATCH /api/reviews/:id - Update a review
router.patch('/:id',
  requirePermissions('review.update'),
  validateReviewId,
  validateUpdateReview,
  reviewController.updateReview
);

// DELETE /api/reviews/:id - Delete a review
router.delete('/:id',
  requirePermissions('review.delete'),
  validateReviewId,
  reviewController.deleteReview
);

// POST /api/reviews/can-review - Check if user can review another user
router.post('/can-review',
  requirePermissions('review.read'),
  reviewController.canReview
);

module.exports = router;