# Advertisement Filtering API Documentation

This document describes the available parameters for filtering advertisements in the Barter Vibe API.

## Base Endpoint
```
GET /api/advertisements
` ``

## Available Filter Parameters

### Basic Filters
- `search` (string, optional): Search term to match in title, description, exchange preferences, location, and tags
- `type` (string, optional): Type of advertisement ('service', 'goods', 'skill', 'experience')
- `categoryId` (string, optional): ObjectId of the category to filter by
- `tagId` (string, optional): ObjectId of the tag to filter by
- `location` (string, optional): Location to match (case-insensitive)
- `isUrgent` (boolean, optional): Filter by urgent status (true/false)
- `isActive` (string, optional): Filter by active status ('true', 'false', 'any') - default: 'true'
- `isArchived` (string, optional): Filter by archived status ('true', 'false', 'any')

### User and Profile Filters
- `ownerId` (string, optional): ObjectId of the owner to filter by
- `profileId` (string, optional): ObjectId of the profile to filter by

### Rating Filters
- `minRating` (number, optional): Minimum average rating (0-5)
- `maxRating` (number, optional): Maximum average rating (0-5)

### Statistics Filters
- `minViews` (number, optional): Minimum number of views
- `maxViews` (number, optional): Maximum number of views
- `minApplications` (number, optional): Minimum number of applications
- `maxApplications` (number, optional): Maximum number of applications

### Date Filters
- `expiresBefore` (ISO date string, optional): Expiration date before this date
- `expiresAfter` (ISO date string, optional): Expiration date after this date
- `minCreatedAt` (ISO date string, optional): Created after this date
- `maxCreatedAt` (ISO date string, optional): Created before this date

### Geographic Filters (requires both longitude and latitude)
- `longitude` (number, optional): Longitude coordinate for location-based search
- `latitude` (number, optional): Latitude coordinate for location-based search
- `maxDistance` (number, optional): Maximum distance in meters for location-based search (default: 10000)

### Portfolio Filters
- `hasPortfolio` (string, optional): Filter by whether the author has a portfolio ('true', 'false', 'any')

### Pagination and Sorting
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Limit per page (default: 10, max: 100)
- `sortBy` (string, optional): Field to sort by ('createdAt', 'updatedAt', 'title', 'views', 'expiresAt', 'rating.average', 'applicationCount') - default: 'createdAt'
- `sortOrder` (string, optional): Sort order ('asc', 'desc') - default: 'desc'

## Examples

### Basic Filtering
````
GET /api/advertisements?category=507f1f77bcf86cd799439011&type=goods&location=New+York
` ``

### Advanced Filtering with Ratings and Views
````
GET /api/advertisements?minRating=4&maxViews=100&minApplications=5
` ``

### Date-based Filtering
````
GET /api/advertisements?expiresAfter=2023-12-01T00:00:00.000Z&expiresBefore=2023-12-31T23:59:59.999Z
` ``

### Geographic Filtering
````
GET /api/advertisements?longitude=-74.0060&latitude=40.7128&maxDistance=5000
` ``

### Combined Filters
````
GET /api/advertisements?search=laptop&minRating=3&maxViews=500&category=electronics&page=1&limit=10
` ``

### Portfolio Filter Examples
```
GET /api/advertisements?hasPortfolio=true
GET /api/advertisements?hasPortfolio=false
GET /api/advertisements?hasPortfolio=any&location=New+York
` ``

## Notes
- Filters can be combined together
- Search functionality works across title, description, exchange preferences, location, and associated tags
- Geographic filtering requires at least longitude and latitude parameters
- All date parameters should be in ISO 8601 format
- Numeric values will be converted automatically