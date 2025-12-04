# Advertisement Rating Algorithm Documentation

## Overview
The advertisement rating system calculates an average rating for each advertisement based on reviews that are specifically associated with that advertisement.

## Calculations

### Standard Advertisement Rating
- **Formula**: Average of all ratings from reviews directly linked to the advertisement
- **Calculation**: `sum(all_review_ratings_for_ad) / count_of_reviews_for_ad`
- **Range**: 1.0 to 5.0 (rounded to 2 decimal places)
- **Initial Value**: 0.0 when no reviews exist

### Rating Distribution
The system tracks the distribution of ratings to provide insights into the types of feedback received:
- Number of 1-star reviews
- Number of 2-star reviews
- Number of 3-star reviews
- Number of 4-star reviews
- Number of 5-star reviews

## Data Flow

### When a Review is Created
1. Review is saved to the database
2. If the review is linked to an advertisement (`advertisementId`):
   - Advertisement rating is recalculated and updated
3. User rating is recalculated and updated

### When a Review is Updated
1. If the review was linked to an advertisement:
   - Previous advertisement rating is recalculated
2. If the review is now linked to a different advertisement:
   - Both old and new advertisement ratings are recalculated
3. User rating is recalculated

### When a Review is Deleted
1. If the review was linked to an advertisement:
   - Advertisement rating is recalculated
2. User rating is recalculated

## API Endpoints

### Get Advertisement Rating Information
- `GET /api/advertisements/:id/rating`
- Response includes:
  - Average rating
  - Total number of reviews
  - Rating distribution (count of each star rating)

### Automatic Updates
The rating is automatically updated when:
- A new review is added to the advertisement
- An existing review is modified
- A review for the advertisement is deleted
- This ensures real-time accuracy of ratings

## Business Rules

### Review Assignment
- Reviews can be tied to both an advertisement and an application
- The system prioritizes advertisement-specific ratings over general user ratings
- Each review contributes to both the advertisement rating and the user's overall rating

### Privacy and Access
- Rating calculations are performed server-side
- Rating data is automatically included when advertisement details are fetched
- Only authorized users can submit reviews

## Performance Considerations

### Indexes Used
- Reviews are indexed by `advertisementId` for efficient lookups
- Rating values are indexed for faster aggregations

### Caching
- Rating calculations are performed on-demand but can be cached
- Ratings are updated in real-time when reviews change

This algorithm ensures fair and accurate rating representation while maintaining performance and data consistency.