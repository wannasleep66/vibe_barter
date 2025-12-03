# Barter Vibe - Database Schema Design

## Overview

This document outlines the database schema for the Barter Vibe application, a platform for users to exchange services and goods. The schema is designed to support user management, profile creation, advertisements, applications, reviews, moderation, chat functionality, and administrative features.

## Core Entities and Their Relationships

### 1. User (Authentication & Authorization)
The User entity handles authentication, authorization, and basic account information.

### 2. Profile
The Profile entity contains detailed information about users, including skills, languages, contact information, and portfolio.

### 3. Category
The Category entity organizes advertisements into different types (e.g., services, goods, skills).

### 4. Tag
The Tag entity allows for fine-grained classification and search of advertisements.

### 5. Advertisement
The Advertisement entity represents listings for goods or services users want to offer in exchange.

### 6. AdvertisementMedia
The AdvertisementMedia entity stores images, videos, or other files associated with advertisements.

### 7. Application
The Application entity represents requests from users to exchange with advertisement creators.

### 8. Chat
The Chat entity manages conversations between users about specific exchanges.

### 9. Message
The Message entity stores individual messages within chats.

### 10. Review
The Review entity stores feedback between users after exchanges.

### 11. Ticket
The Ticket entity manages support requests from users.

### 12. Role
The Role entity defines user permissions within the system.

### 13. Permission
The Permission entity defines specific permissions that can be assigned to roles.

## Entity Relationships

- **User** (1) → (0..1) **Profile**: A user may have one profile (optional)
- **User** (1) → (0..*) **Advertisement**: A user can create multiple advertisements
- **User** (1) → (0..*) **Application**: A user can make multiple applications
- **User** (1) → (0..*) **Review**: A user can receive multiple reviews
- **User** (1) → (0..*) **Ticket**: A user can create multiple tickets
- **User** (1) → (0..*) **Message**: A user can send multiple messages
- **Profile** (1) → (0..*) **Advertisement**: A profile can be associated with multiple advertisements
- **Category** (1) → (0..*) **Advertisement**: A category can have multiple advertisements
- **Advertisement** (1) → (0..*) **AdvertisementMedia**: An advertisement can have multiple media files
- **Advertisement** (1) → (0..*) **Application**: An advertisement can receive multiple applications
- **Advertisement** (1) → (0..*) **Review**: An advertisement can be associated with multiple reviews (through exchanges)
- **Tag** (0..*) ↔ (0..*) **Advertisement**: Many-to-many relationship between tags and advertisements
- **User** (0..*) ↔ (0..*) **Chat**: Many-to-many relationship between users and chats
- **Chat** (1) → (0..*) **Message**: A chat contains multiple messages
- **Application** (1) → (0..1) **Chat**: An application can create one chat for discussion
- **User** (1) → (0..*) **Role**: A user can have multiple roles
- **Role** (1) → (0..*) **Permission**: A role can have multiple permissions

## ER Diagram

```
┌─────────────────┐         ┌────────────────┐         ┌─────────────────┐
│      User       │         │    Profile     │         │    Category     │
│─────────────────│         │────────────────│         │─────────────────│
│ _id (PK)        │         │ _id (PK)       │         │ _id (PK)        │
│ email (unique)  │ 1   0..1│ user_id (FK)   │ 1   0..1│ name (unique)   │
│ password        │◄────────┼────────────────┼────────►│ description     │
│ firstName       │         │ bio            │         │ isActive        │
│ lastName        │         │ avatar         │         │ createdAt       │
│ role            │         │ location       │         │ updatedAt       │
│ isEmailVerified │         │ skills[]       │         └─────────────────┘
│ isActive        │         │ languages[]    │                   │
│ lastLoginAt     │         │ contacts[]     │                   │ 1
│ createdAt       │         │ portfolio[]    │                   │ 0..*
│ updatedAt       │         │ createdAt      │                   ▼
└─────────────────┘         │ updatedAt      │         ┌─────────────────┐
         │                  └────────────────┘         │  Advertisement  │
         │ 1..*                                       │─────────────────│
         ▼                                            │ _id (PK)        │
┌─────────────────┐                                   │ title           │
│   Advertisement │                                   │ description     │
│─────────────────│                                   │ ownerId (FK)    │
│ _id (PK)        │                                   │ profileId (FK)  │
│ title           │                                   │ categoryId (FK) │
│ description     │                                   │ isActive        │
│ ownerId (FK)    │                                   │ isArchived      │
│ profileId (FK)  │                                   │ createdAt       │
│ categoryId (FK) │                                   │ updatedAt       │
│ isActive        │                                   │ archivedAt      │
│ isArchived      │                                   │ searchVector    │
│ createdAt       │                                   └─────────────────┘
│ updatedAt       │                                            │ 0..*
└─────────────────┘                                            │
         │ 1                                                     │ 0..*
         │ 0..*                                                  ▼
         ▼                                               ┌─────────────────┐
┌─────────────────┐                                      │      Tag        │
│   Application   │                                      │─────────────────│
│─────────────────│                                      │ _id (PK)        │
│ _id (PK)        │                                      │ name (unique)   │
│ advertisementId │                                      │ createdAt       │
│ applicantId (FK)│                                      │ updatedAt       │
│ status          │                                      └─────────────────┘
│ createdAt       │                                            │
│ updatedAt       │                                            │ 0..*
└─────────────────┘                                            │
         │ 1                                                     ▼
         │ 0..1                                          ┌─────────────────┐
         ▼                                               │ AdvertisementTag│
┌─────────────────┐                                      │─────────────────│
│      Chat       │                                      │ advertisementId │
│─────────────────│                                      │ tagId           │
│ _id (PK)        │                                      └─────────────────┘
│ applicationId   │
│ createdAt       │
│ updatedAt       │
└─────────────────┘
         │ 1
         │ 0..*
         ▼
┌─────────────────┐
│     Message     │
│─────────────────│
│ _id (PK)        │
│ chatId (FK)     │
│ senderId (FK)   │
│ content         │
│ isRead          │
│ createdAt       │
│ updatedAt       │
└─────────────────┘
```

## Secondary Entities

### AdvertisementMedia
- Stores images, videos, or other files associated with advertisements

### Review
- Stores feedback between users after exchanges

### Ticket
- Manages support requests from users

### Role
- Defines user permissions within the system

### Permission
- Defines specific permissions that can be assigned to roles

This schema design ensures proper normalization while maintaining good performance for common query patterns. The relationships are designed to support all required features of the Barter Vibe platform including user management, profile creation, advertisement posting, application processing, messaging, reviews, and moderation.