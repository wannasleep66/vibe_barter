# Advertisement Tag Filtering

## Overview
The Barter Vibe API supports advanced filtering of advertisements by tags, including support for filtering by multiple tags and combining tags with logical operators. The API also provides endpoints for tag autocompletion to improve the user experience.

## Available Parameters

### `tagId` Query Parameter
- **Type**: String (single tag ID) or Array of strings (multiple tag IDs)
- **Description**: Filter by one or more specific tags
- **Format**: MongoDB ObjectId format for tag IDs
- **Example**: `/api/advertisements?tagId=507f1f77bcf86cd799439011`
- **Multiple Tags Example**: `/api/advertisements?tagId=507f1f77bcf86cd799439011&tagId=507f1f77bcf86cd799439012`

### `tagOperator` Query Parameter
- **Type**: String
- **Values**: 'and', 'or'
- **Description**: How to combine multiple tags
- **Default**: 'or'
- **OR (default)**: Returns advertisements that have ANY of the specified tags
- **AND**: Returns advertisements that have ALL of the specified tags
- **Example**: `/api/advertisements?tagId=507f1f77bcf86cd799439011&tagId=507f1f77bcf86cd799439012&tagOperator=and`

## Tag Autocomplete Endpoints

### GET `/api/advertisement-tags/popular`
Gets popular tags for filtering suggestions.

#### Query Parameters:
- `limit` (number, optional, default: 10): Number of tags to return (max: 50)
- `search` (string, optional): Search term to filter tags by name

#### Example Request:
````
GET /api/advertisement-tags/popular?limit=20&search=tech
` ``

#### Response:
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "technology",
      "description": "Tech-related tags",
      "usageCount": 150,
      "color": "#ff6b6b",
      "icon": "fa-laptop",
      "isActive": true,
      "createdAt": "2023-05-15T10:30:00.000Z",
      "updatedAt": "2023-10-20T15:45:00.000Z"
    }
  ],
  "count": 1
}
```

### GET `/api/advertisement-tags/search`
Searches tags by name for autocomplete functionality.

#### Query Parameters:
- `query` (string, required, min: 1 character): Search term for tag names
- `limit` (number, optional, default: 10): Number of tags to return (max: 50)

#### Example Request:
````
GET /api/advertisement-tags/search?query=web&limit=5
` ``

#### Response:
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "web development",
      "description": "Web development related tags",
      "usageCount": 85,
      "color": "#4ecdc4",
      "icon": "fa-code",
      "isActive": true,
      "createdAt": "2023-06-10T09:15:00.000Z",
      "updatedAt": "2023-10-18T11:20:00.000Z"
    }
  ],
  "count": 1,
  "query": "web"
}
```

## Example Requests

### Filter by Single Tag
````
GET /api/advertisements?tagId=507f1f77bcf86cd799439011
` ``

### Filter by Multiple Tags (OR)
````
GET /api/advertisements?tagId=507f1f77bcf86cd799439011&tagId=507f1f77bcf86cd799439012
` ``
Returns advertisements with tag1 OR tag2

### Filter by Multiple Tags (AND)
````
GET /api/advertisements?tagId=507f1f77bcf86cd799439011&tagId=507f1f77bcf86cd799439012&tagOperator=and
` ``
Returns advertisements with BOTH tag1 AND tag2

### Combined with Other Filters
````
GET /api/advertisements?tagId=507f1f77bcf86cd799439011&category=electronics&type=goods&location=New+York
` ``

## Implementation Details

### Backend Implementation
- Uses MongoDB's `$in` operator for OR operations (default)
- Uses MongoDB's `$all` operator for AND operations
- Proper validation ensures tag IDs are valid ObjectIds
- Combined with other filters using standard filtering mechanisms

### Performance Considerations
- Proper indexing on the `tags` field for fast lookups
- Sorted by popularity (usageCount) for tag suggestions endpoints
- Efficient MongoDB queries with proper use of array operators
- Pagination supported on tag suggestion endpoints

### Complexity Analysis
- **Time Complexity**: O(log n) for tag lookups with proper indexing
- **Space Complexity**: O(k) where k is the number of tags in a filter

## Integration with Other Filters

The tag filters work seamlessly with all other advertisement filters:
- Category filters (categoryId, includeSubcategories)
- Type (`type=goods`, `type=service`, etc.)
- Location (`location=New York`)
- Rating (`minRating=3`, `maxRating=5`)
- Views (`minViews=10`, `maxViews=100`)
- Application count (`minApplications=2`, `maxApplications=20`)
- Dates (`expiresBefore`, `expiresAfter`, `minCreatedAt`, `maxCreatedAt`)
- Geographic filters (`longitude`, `latitude`, `maxDistance`)
- Portfolio filters (`hasPortfolio=true`, `hasPortfolio=false`)
- Language filters (`languages=English`, etc.)

## Error Handling

- Invalid tag IDs will return a 400 Bad Request error
- Non-existent tags will return an empty result set when filtering (not an error)
- Missing or empty query parameter in search endpoint returns 400 Bad Request
- When tagOperator is invalid, returns 400 Bad Request with validation error

## Validation

The API validates that:
- Tag IDs conform to MongoDB ObjectId format
- Tag IDs are valid hexadecimal strings of 24 characters
- Query parameter for search is at least 1 character long
- Limit parameters are integers between 1 and 50
- tagOperator is either 'and' or 'or'