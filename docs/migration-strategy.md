# Barter Vibe - Database Migration Strategy

This document outlines the database migration strategy for the Barter Vibe application, covering initial setup, future schema changes, and deployment procedures.

## Overview

The Barter Vibe application uses MongoDB as its primary database. While MongoDB is schema-flexible, we'll implement a migration strategy to ensure consistent schema evolution, proper data transformation, and minimal downtime during updates.

## Migration Tools and Framework

We'll use the following tools for database migrations:

1. **Mongoose ODM**: For schema definition and built-in validation
2. **MongoDB Compass**: For schema visualization and data inspection
3. **Custom migration scripts**: For complex data transformations
4. **Environment-specific configurations**: For different environments

## Initial Database Setup Migration

### 001-initial-schema.js
- Create all collections with initial schemas
- Set up basic indexes for performance
- Insert initial system data (roles, permissions, default categories)

### 002-seed-data.js
- Create system roles (admin, moderator, user)
- Create basic permissions
- Create default categories
- Create system tags

## Migration File Structure

```
migrations/
├── 001-initial-schema.js
├── 002-seed-data.js
├── 003-add-rating-to-ads.js
├── 004-add-profile-verification.js
├── 005-update-user-indexes.js
└── ...
```

Each migration file follows this structure:

```javascript
// migrations/001-initial-schema.js

module.exports = {
  // Human-readable description of the migration
  description: 'Initial database schema setup',
  
  // Up migration function
  up: async (db, client) => {
    // Implementation for applying the migration
    // e.g., create collections, indexes, initial data
  },
  
  // Down migration function (for rollback)
  down: async (db, client) => {
    // Implementation for rolling back the migration
    // e.g., drop collections, remove indexes, delete data
  }
};
```

## Migration Execution Script

Create a migration runner to execute migrations in order:

```javascript
// scripts/migrate.js
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function runMigrations(direction = 'up') {
  // Connect to database
  await mongoose.connect(process.env.DB_URL);
  const db = mongoose.connection.db;
  
  // Get all migration files
  const migrationFiles = fs.readdirSync('./migrations')
    .filter(file => file.endsWith('.js'))
    .sort();
  
  for (const file of migrationFiles) {
    console.log(`Running migration: ${file}`);
    const migration = require(path.join(__dirname, '../migrations', file));
    
    if (direction === 'up') {
      await migration.up(db, mongoose.connection.getClient());
    } else {
      await migration.down(db, mongoose.connection.getClient());
    }
    
    console.log(`Completed migration: ${file}`);
  }
  
  console.log('All migrations completed!');
  process.exit(0);
}

// Execute based on command line argument
const direction = process.argv[2] || 'up';
runMigrations(direction);
```

## Sample Migration Implementation

Here's an example migration file that adds rating capabilities to advertisements:

```javascript
// migrations/003-add-rating-to-ads.js

module.exports = {
  description: 'Add rating system to advertisements',
  
  up: async (db, client) => {
    const collection = db.collection('advertisements');
    
    // Add default rating values to existing ads
    await collection.updateMany(
      { rating: { $exists: false } },
      { 
        $set: { 
          rating: { 
            average: 0,
            count: 0
          }
        }
      }
    );
    
    // Create index for ratings
    await collection.createIndex({ 'rating.average': 1 });
  },
  
  down: async (db, client) => {
    const collection = db.collection('advertisements');
    
    // Remove rating field
    await collection.updateMany(
      {},
      { $unset: { rating: '' } }
    );
    
    // Remove index
    await collection.dropIndex({ 'rating.average': 1 });
  }
};
```

## Migration Strategy Principles

### 1. Backward Compatibility
- Always maintain backward compatibility during migrations
- New fields should have appropriate default values
- Avoid breaking changes to existing data structure

### 2. Safe Migrations
- Test all migrations on staging environment first
- Ensure all migrations are idempotent where possible
- Include rollback functionality for each migration

### 3. Version Control
- Store migration files in version control
- Use sequential numbering for migration files
- Include descriptive names for each migration

### 4. Data Validation
- Validate data integrity after each migration
- Include checks for data consistency
- Implement data validation rules in schemas

## Environment-Specific Migration Strategy

### Development
- Migrations run automatically on each startup
- Use local MongoDB instance
- Full data cleanup and re-seeding allowed

### Staging
- Migrations run during deployment pipeline
- Use staging MongoDB instance
- Controlled migration execution
- Verification steps after migration

### Production
- Migrations run with careful planning and monitoring
- Use production MongoDB instance
- Backup taken before migrations
- Rollback plan ready
- Migration run during low-traffic periods
- Monitoring of application after migration

## Migration Execution Process

### Pre-Migration Checklist
1. Backup database
2. Review migration code
3. Test on staging environment
4. Schedule migration during low-traffic period
5. Notify team of planned migration
6. Prepare rollback plan

### Migration Execution
1. Stop application services
2. Execute migration
3. Verify migration success
4. Restart application services
5. Monitor application health

### Post-Migration Verification
1. Verify schema changes
2. Check application functionality
3. Validate data integrity
4. Monitor performance metrics
5. Update documentation if needed

## Rollback Strategy

### When to Rollback
- Migration fails
- Data corruption occurs
- Application errors after migration
- Performance degradation

### Rollback Process
1. Stop application services
2. Execute down migration
3. Verify rollback success
4. Restart application services
5. Monitor application health

## Database Evolution Guidelines

### Adding Fields
- Add optional fields with default values
- Use $set to populate existing documents
- Update indexes if needed

### Removing Fields
- First mark as deprecated in documentation
- Remove from application code
- Use $unset to remove from database
- Update indexes if needed

### Renaming Fields
- Add new field with correct name
- Copy data from old field to new field
- Update application code to use new field
- Remove old field after verification

### Changing Data Types
- Create new field with different type
- Transform data from old to new field
- Update application code to use new field
- Remove old field after verification

## Performance Considerations

### Large Dataset Migrations
- Use batch processing for large datasets
- Consider using aggregation pipelines for complex transforms
- Monitor memory and CPU usage
- Plan for extended runtime

### Index Updates
- Create indexes in background when possible
- Consider the impact on write performance
- Balance read and write performance needs
- Test index changes on staging first

## Monitoring and Logging

### Migration Logs
- Log each migration start and completion
- Log any errors or warnings
- Record execution time for each migration
- Monitor for failed migrations

### Health Checks
- Verify database connection after migration
- Check application functionality
- Monitor error rates
- Verify data integrity

## Continuous Integration Integration

### Automatic Migrations
- Run migrations in test environment during CI
- Verify migration scripts are valid
- Integrate with deployment pipeline

### Migration Testing
- Include migration tests in CI pipeline
- Verify rollback functionality
- Check for migration conflicts

## Migration Commands

Add migration scripts to package.json:

```json
{
  "scripts": {
    "migrate": "node scripts/migrate.js up",
    "migrate:down": "node scripts/migrate.js down",
    "migrate:status": "node scripts/migration-status.js"
  }
}
```

This migration strategy ensures safe, reliable, and consistent schema evolution for the Barter Vibe application across all environments.