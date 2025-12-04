# Advertisement Rating Filtering

## Overview
The Barter Vibe API supports advanced filtering of advertisements by both advertisement rating and author rating. These filters allow users to find high-quality content and trustworthy providers.

## Available Rating Filter Parameters

### Advertisement Rating Filters
- `minRating` (number, optional): Minimum average rating for the advertisement (0-5)
- `maxRating` (number, optional): Maximum average rating for the advertisement (0-5)
- **Example**: `/api/advertisements?minRating=3&maxRating=5`

### Author Rating Filters
- `minAuthorRating` (number, optional): Minimum average rating of the author's profile (0-5)
- `maxAuthorRating` (number, optional): Maximum average rating of the author's profile (0-5)
- **Example**: `/api/advertisements?minAuthorRating=4`

## Example Requests

### Filter by Advertisement Rating Range
````
GET /api/advertisements?minRating=3&maxRating=5
` ``

### Filter by Minimum Author Rating
````
GET /api/advertisements?minAuthorRating=4.5
` ``

### Combined Rating Filters
````
GET /api/advertisements?minRating=3&minAuthorRating=4.2
` ``

### Rating Filters with Other Filters
````
GET /api/advertisements?minAuthorRating=4&type=service&category=electronics&location=New+York
` ``

## Implementation Details

### Backend Implementation
- Uses MongoDB aggregation pipeline when author rating filters are applied
- Joins Advertisement collection with Profile collection via ownerId→user relationship
- Applies `$lookup` to connect advertisement owners to their profiles
- Uses `$match` to filter by profile rating averages

### Performance Considerations
- Efficient aggregation pipeline with proper indexing strategy
- Cached aggregation results when possible
- Proper pagination maintained even with aggregation
- Separate count pipeline for accurate pagination totals

### Complexity Analysis
- **Time Complexity**: O(log n) for advertisement queries + O(m) for profile join where m is the number of matching advertisements
- **Space Complexity**: O(k) where k is the number of results returned

## Integration with Other Filters

The rating filters work seamlessly with all other advertisement filters:
- Category filters (`categoryId=507f1f77bcf86cd799439011`)
- Type filters (`type=goods`, `type=service`, etc.)
- Location filters (`location=New York`)
- Tag filters (`tagId=507f1f77bcf86cd799439011`)
- Urgency filters (`isUrgent=true`)
- Status filters (`isActive=true`, `isArchived=false`)
- View count filters (`minViews=10`, `maxViews=100`)
- Application count filters (`minApplications=2`, `maxApplications=20`)
- Geographic filters (`longitude`, `latitude`, `maxDistance`)
- Portfolio filters (`hasPortfolio=true`, `hasPortfolio=false`)

## Validation

The API validates that:
- Rating values are between 0 and 5
- Rating values are valid numbers
- When combining min/max filters, min ≤ max

## Database Schema

Both Advertisement and Profile models include rating information:

```javascript
// Advertisement model
rating: {
  average: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  count: {
    type: Number,
    default: 0
  }
}

// Profile model  
rating: {
  average: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  count: {
    type: Number,
    default: 0
  }
}
```