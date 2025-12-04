# Advertisement Category Filtering

## Overview
The Barter Vibe API supports advanced filtering of advertisements by category, including support for hierarchical categories, multiple category selection, and subcategory inclusion.

## Available Parameters

### `categoryId` Query Parameter
- **Type**: String (single category ID) or Array of strings (multiple category IDs)
- **Description**: Filter by one or more specific categories
- **Format**: MongoDB ObjectId format for category IDs
- **Example**: `/api/advertisements?categoryId=507f1f77bcf86cd799439011`
- **Multiple Categories Example**: `/api/advertisements?categoryId=507f1f77bcf86cd799439011&categoryId=507f1f77bcf86cd799439012`

### `includeSubcategories` Query Parameter
- **Type**: Boolean
- **Description**: Whether to include subcategories of the specified category in the results
- **Default**: `false`
- **Usage**: When set to `true` along with `categoryId`, the filter will return advertisements from both the specified category and all its descendant subcategories
- **Example**: `/api/advertisements?categoryId=507f1f77bcf86cd799439011&includeSubcategories=true`

## Hierarchical Category Support

Our category system supports hierarchical structures where categories can have parent-child relationships:

```
Electronics (Parent)
├── Computers (Child)
│   ├── Laptops (Grandchild)
│   └── Desktops (Grandchild)
└── Phones (Child)
    ├── Smartphones (Grandchild)
    └── Feature phones (Grandchild)
```

When `includeSubcategories=true`, selecting "Electronics" would return advertisements from:
- Electronics (the specified category)
- Computers (direct children)
- Laptops and Desktops (grandchildren)
- Phones (direct children)
- And so on...

## Example Requests

### Filter by Single Category
````
GET /api/advertisements?categoryId=507f1f77bcf86cd799439011
` ``

### Filter by Multiple Categories
````
GET /api/advertisements?categoryId=507f1f77bcf86cd799439011&categoryId=507f1f77bcf86cd799439012
` ``

### Filter by Category Including Subcategories
````
GET /api/advertisements?categoryId=507f1f77bcf86cd799439011&includeSubcategories=true
` ``

### Combined with Other Filters
````
GET /api/advertisements?categoryId=507f1f77bcf86cd799439011&includeSubcategories=true&type=goods&location=New+York&page=1&limit=10
` ``

## Implementation Details

### Backend Implementation
The category filtering with subcategories works by:
1. When `includeSubcategories` is true, the system recursively fetches all child categories of the specified category
2. A list of all relevant category IDs (the specified category + all its subcategories) is built
3. The database query uses `{ categoryId: { $in: [arrayOfCategoryIds] } }` to match advertisements in any of these categories
4. The same logic is applied for both search and non-search queries

### Performance Considerations
- The category hierarchy lookup is cached within each request to avoid repeated database queries
- An index exists on the `categoryId` field for fast lookups
- For large category hierarchies, consider using pagination to limit results

### Complexity Analysis
- **Time Complexity**: O(n) where n is the number of levels in the category hierarchy (usually small)
- **Database Queries**: 1 query for the main advertisement list + O(h) queries for category hierarchy lookup where h is the depth of the hierarchy

## Integration with Other Filters

The category filters work seamlessly with all other advertisement filters:
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

- Invalid category IDs will return a 400 Bad Request error
- Non-existent categories will return an empty result set (not an error)
- When using `includeSubcategories` with a non-existent category ID, the system will return no results

## Validation

The API validates that:
- Category IDs conform to MongoDB ObjectId format
- Category IDs are valid hexadecimal strings of 24 characters
- The `includeSubcategories` parameter is a boolean value