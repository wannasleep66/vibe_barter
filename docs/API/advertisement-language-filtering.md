# Advertisement Language Filtering

## Overview
The Barter Vibe API supports filtering advertisements based on the languages spoken by the advertisement authors. This feature allows users to find advertisements from authors who speak specific languages, improving communication and transaction possibilities.

## Available Parameter

### `languages` Query Parameter
- **Type**: Array of strings or single string
- **Description**: Filter advertisements by languages spoken by the author
- **Format**: Can be a single language string or array of language strings
- **Case-insensitive**: Language matching is case-insensitive
- **Multiple Languages**: If multiple languages are provided, the filter matches if any of the languages match

## Example Requests

### Filter by Single Language
````
GET /api/advertisements?languages=English
` ``

### Filter by Multiple Languages
````
GET /api/advertisements?languages=English&languages=Spanish
` ``

### Combination with Other Filters
````
GET /api/advertisements?type=service&categoryId=60a5b1d2e3f44a1b2c3d4e5f&languages=French&location=Paris
` ``

### With Pagination
````
GET /api/advertisements?languages=German&page=1&limit=10
` ``

## Implementation Details

### Backend Implementation
The language filtering works by:
1. Joining the Advertisement collection with the Profile collection based on `profileId`
2. Matching profiles that have language entries in their `languages` array
3. Using case-insensitive regex matching for language names
4. Supporting both single language strings and arrays of languages

### Database Query
Internally, the filter creates a MongoDB aggregation pipeline with:
```
{
  $lookup: {
    from: 'profiles',
    localField: 'profileId',
    foreignField: '_id',
    as: 'profileInfo'
  }
},
{
  $match: {
    'profileInfo.languages.language': {
      $in: [new RegExp(language, 'i')] // Case insensitive match
    }
  }
}
```

## Response Format

The response follows the standard advertisement listing format:

```json
{
  success: true,
  data: [...],
  pagination: {...},
  filters: {
    languages: ["English", "French"],
    // ... other filters
  }
}
```

## Performance Considerations

- The filtering joins with the Profile collection, which may impact performance on large datasets
- A text index on the Profile model would improve performance for language-based queries
- Consider caching results for popular language filter combinations

## Validation

The API validates that:
- Language parameters are strings
- Language parameters don't exceed 50 characters each
- The languages parameter can accept both single values and arrays

## Error Handling

- Invalid language format will return a 400 Bad Request error
- Language filter applied with non-existent languages will return an empty result set (not an error)

## Integration

The language filter can be used in combination with all other advertisement filters including:
- Categories
- Types
- Locations
- Tags
- User ratings
- Views
- Application counts
- Date ranges
- Geographic location
- Portfolio status