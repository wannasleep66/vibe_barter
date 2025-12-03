# Barter Vibe - Database Data Integrity Constraints

This document outlines all the data integrity constraints implemented in the Barter Vibe database to ensure data consistency, accuracy, and validity.

## Primary Key Constraints

Every collection has a primary key `_id` automatically provided by MongoDB. This ensures each document has a unique identifier.

## Required Field Constraints

### User Collection
- `email`: Required for user authentication
- `password`: Required for user authentication
- `firstName`: Required for user profile completeness
- `lastName`: Required for user profile completeness

### Profile Collection
- `user`: Required to link profile to user

### Category Collection
- `name`: Required for category identification

### Advertisement Collection
- `title`: Required for advertisement description
- `description`: Required for advertisement details
- `ownerId`: Required to identify advertisement creator
- `categoryId`: Required to categorize advertisement
- `type`: Required to specify advertisement type

### AdvertisementMedia Collection
- `advertisementId`: Required to link media to advertisement
- `url`: Required to provide media location
- `type`: Required to identify media type
- `filename`: Required for media identification

### Application Collection
- `advertisementId`: Required to link application to advertisement
- `applicantId`: Required to identify applicant
- `ownerId`: Required to identify advertisement owner

### Review Collection
- `reviewerId`: Required to identify reviewer
- `revieweeId`: Required to identify reviewee
- `rating`: Required to provide rating value (1-5)

### Ticket Collection
- `userId`: Required to identify ticket creator
- `subject`: Required for ticket identification
- `description`: Required for ticket details
- `category`: Required to categorize ticket

## Unique Constraints

### User Collection
- `email`: Unique to prevent duplicate accounts

### Profile Collection
- `user`: Unique to ensure one profile per user

### Category Collection
- `name`: Unique to prevent duplicate categories

### Tag Collection
- `name`: Unique to prevent duplicate tags

### Role Collection
- `name`: Unique to prevent duplicate roles

### Permission Collection
- `name`: Unique to prevent duplicate permissions

### Application Collection
- Composite of `applicantId` and `advertisementId`: Unique to prevent multiple applications to same ad

### Review Collection
- Composite of `reviewerId`, `revieweeId`, and `applicationId`: Unique to prevent duplicate reviews

## Foreign Key Constraints (Reference Integrity)

### User Collection
- `profile` (ref: 'Profile'): References Profile collection

### Profile Collection
- `user` (ref: 'User'): References User collection

### Advertisement Collection
- `ownerId` (ref: 'User'): References User collection
- `profileId` (ref: 'Profile'): References Profile collection
- `categoryId` (ref: 'Category'): References Category collection
- `tags` (ref: 'Tag'): References Tag collection

### AdvertisementMedia Collection
- `advertisementId` (ref: 'Advertisement'): References Advertisement collection

### Application Collection
- `advertisementId` (ref: 'Advertisement'): References Advertisement collection
- `applicantId` (ref: 'User'): References User collection
- `ownerId` (ref: 'User'): References User collection
- `chatId` (ref: 'Chat'): References Chat collection

### Chat Collection
- `participants` (ref: 'User'): References User collection
- `advertisementId` (ref: 'Advertisement'): References Advertisement collection
- `applicationId` (ref: 'Application'): References Application collection

### Message Collection
- `chatId` (ref: 'Chat'): References Chat collection
- `senderId` (ref: 'User'): References User collection
- `repliedTo` (ref: 'Message'): References Message collection

### Review Collection
- `reviewerId` (ref: 'User'): References User collection
- `revieweeId` (ref: 'User'): References User collection
- `advertisementId` (ref: 'Advertisement'): References Advertisement collection
- `applicationId` (ref: 'Application'): References Application collection

### Ticket Collection
- `userId` (ref: 'User'): References User collection
- `assignedTo` (ref: 'User'): References User collection
- `resolvedBy` (ref: 'User'): References User collection

### Category Collection
- `parentCategory` (ref: 'Category'): References Category collection (self-referencing)

### Role Collection
- `permissions` (ref: 'Permission'): References Permission collection

## Value Constraints (Check Constraints)

### User Collection
- `email`: Must match email format regex
- `password`: Must be at least 6 characters
- `firstName`, `lastName`: Must be less than 50 characters
- `role`: Must be one of ['user', 'moderator', 'admin']

### Profile Collection
- `bio`: Must be less than 500 characters
- `location`: Must be less than 100 characters
- `skills`: Each skill must be less than 50 characters
- `languages.level`: Must be one of ['beginner', 'intermediate', 'advanced', 'fluent', 'native']
- `rating.average`: Must be between 0 and 5
- `availability`: Must be one of ['always', 'weekdays', 'weekends', 'rarely']

### Category Collection
- `name`: Must be less than 50 characters
- `description`: Must be less than 200 characters
- `sortOrder`: Must be a number

### Tag Collection
- `name`: Must be less than 30 characters and lowercase
- `description`: Must be less than 200 characters

### Advertisement Collection
- `title`: Must be less than 100 characters
- `description`: Must be less than 2000 characters
- `exchangePreferences`: Must be less than 500 characters
- `location`: Must be less than 100 characters
- `type`: Must be one of ['service', 'goods', 'skill', 'experience']
- `rating.average`: Must be between 0 and 5
- `coordinates`: Must follow [longitude, latitude] format

### AdvertisementMedia Collection
- `type`: Must be one of ['image', 'video', 'document', 'other']
- `width`, `height`: Must be numbers
- `sortOrder`: Must be a number
- `altText`: Must be less than 200 characters

### Application Collection
- `message`, `responseMessage`: Must be less than 1000 characters
- `status`: Must be one of ['pending', 'accepted', 'rejected', 'cancelled', 'completed']
- `exchangeLocation`: Must be less than 100 characters
- `ratingGiven`: Must be between 0 and 5

### Message Collection
- `content`: Must be less than 1000 characters
- `messageType`: Must be one of ['text', 'image', 'video', 'file', 'system']
- `status`: Must be one of ['sent', 'delivered', 'read']

### Review Collection
- `title`: Must be less than 100 characters
- `comment`: Must be less than 1000 characters
- `rating`: Must be between 1 and 5
- `ratingGiven`: Must be between 0 and 5

### Ticket Collection
- `subject`: Must be less than 100 characters
- `description`: Must be less than 2000 characters
- `category`: Must be one of ['technical', 'billing', 'account', 'content', 'other']
- `priority`: Must be one of ['low', 'medium', 'high', 'critical']
- `status`: Must be one of ['open', 'in-progress', 'resolved', 'closed', 'pending-user']
- `resolution`: Must be less than 2000 characters
- `satisfactionRating`: Must be between 1 and 5

### Role Collection
- `name`: Must be less than 30 characters
- `description`: Must be less than 200 characters

### Permission Collection
- `name`: Must be less than 50 characters
- `description`: Must be less than 200 characters
- `resource`, `action`: Must be less than 30 and 20 characters respectively

## Field Validation Constraints

### Email Format Validation
- Applied to `User.email` field using regex pattern

### Password Strength Validation
- Minimum length constraint on `User.password` (6 characters)

### Numeric Range Validation
- Rating values constrained between 0-5 or 1-5 depending on context
- Size constraints on various text fields

### Enum Constraints
- Predefined sets of allowed values for categorical fields (statuses, types, etc.)

## Business Rule Constraints

### Advertisement Constraints
- An advertisement cannot be both active and archived simultaneously
- An advertisement must have at least one media item to be considered complete
- Advertisement expiration dates must be in the future

### Application Constraints
- An application cannot be modified after it's accepted or rejected
- Only the advertisement owner can accept/reject applications
- A user cannot apply to their own advertisement

### Review Constraints
- A user cannot review themselves
- Reviews can only be given after an application is completed
- Each user can only review another user once per application

### Profile Constraints
- A user can only have one profile
- Profile ratings are calculated based on reviews received

These integrity constraints ensure data consistency and validity throughout the Barter Vibe application, preventing invalid states and maintaining the quality of data in the system.