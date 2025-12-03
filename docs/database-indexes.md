# Barter Vibe - Database Indexes for Performance Optimization

This document outlines all the indexes created in the Barter Vibe database to optimize query performance. Each index is designed to support specific query patterns and use cases in the application.

## User Collection Indexes

1. **Email Index** (`{ email: 1 }`)
   - Purpose: Optimize user authentication by email
   - Unique: Yes
   - Use Case: Login, user lookup by email

2. **Active Status Index** (`{ isActive: 1 }`)
   - Purpose: Filter active/inactive users
   - Use Case: User management, filtering results

## Profile Collection Indexes

3. **User Reference Index** (`{ user: 1 }`)
   - Purpose: Optimize profile lookup by user ID
   - Unique: Yes (since each user has one profile)
   - Use Case: Loading user profile

4. **Location & Skills Text Index** (`{ location: 'text', skills: 'text' }`)
   - Purpose: Support location and skills based searches
   - Use Case: Finding profiles by location or skills

5. **Availability Index** (`{ availability: 1 }`)
   - Purpose: Filter profiles by availability
   - Use Case: Finding available users

## Category Collection Indexes

6. **Name Index** (`{ name: 1 }`)
   - Purpose: Optimize category lookups
   - Unique: Yes
   - Use Case: Loading categories by name

7. **Active Status Index** (`{ isActive: 1 }`)
   - Purpose: Filter active/inactive categories
   - Use Case: Displaying active categories only

8. **Parent Category Index** (`{ parentCategory: 1 }`)
   - Purpose: Optimize hierarchical category queries
   - Use Case: Loading category children

## Tag Collection Indexes

9. **Name Index** (`{ name: 1 }`)
   - Purpose: Optimize tag lookups
   - Unique: Yes
   - Use Case: Loading tags by name

10. **Active Status Index** (`{ isActive: 1 }`)
    - Purpose: Filter active/inactive tags
    - Use Case: Using only active tags

11. **System Tag Index** (`{ isSystemTag: 1 }`)
    - Purpose: Filter system vs user-defined tags
    - Use Case: Loading system tags for suggestions

## Advertisement Collection Indexes

12. **Full-Text Search Index** (`{ title: 'text', description: 'text', exchangePreferences: 'text' }`)
    - Purpose: Support comprehensive advertisement search
    - Use Case: Global search functionality

13. **Category Index** (`{ categoryId: 1 }`)
    - Purpose: Filter advertisements by category
    - Use Case: Category-based browsing

14. **Owner Index** (`{ ownerId: 1 }`)
    - Purpose: Filter advertisements by owner
    - Use Case: User's advertisements page

15. **Type Index** (`{ type: 1 }`)
    - Purpose: Filter advertisements by type (service, goods, etc.)
    - Use Case: Type-based filtering

16. **Location Index** (`{ location: 1 }`)
    - Purpose: Filter advertisements by location
    - Use Case: Location-based search

17. **Activity Status Index** (`{ isActive: 1, isArchived: 1 }`)
    - Purpose: Filter active/visible advertisements
    - Use Case: Listing valid advertisements

18. **Creation Date Index** (`{ createdAt: -1 }`)
    - Purpose: Sort advertisements by creation date
    - Use Case: Chronological listing

19. **Urgent Index** (`{ isUrgent: 1 }`)
    - Purpose: Filter urgent advertisements
    - Use Case: Highlighting urgent listings

20. **Expiration Date Index** (`{ expiresAt: 1 }`)
    - Purpose: Find expired advertisements for cleanup
    - Use Case: Automatic archiving

21. **Coordinates Index** (`{ coordinates: '2dsphere' }`)
    - Purpose: Support geographic queries
    - Use Case: Finding ads near a location

22. **Profile Index** (`{ profileId: 1 }`)
    - Purpose: Filter advertisements by profile
    - Use Case: Profile's advertisements

## AdvertisementMedia Collection Indexes

23. **Advertisement Reference Index** (`{ advertisementId: 1 }`)
    - Purpose: Find media for a specific advertisement
    - Use Case: Loading advertisement media

24. **Media Type Index** (`{ type: 1 }`)
    - Purpose: Filter media by type
    - Use Case: Loading specific media types

25. **Primary Media Index** (`{ isPrimary: 1 }`)
    - Purpose: Find primary media quickly
    - Use Case: Loading main advertisement image

26. **Sort Order Index** (`{ sortOrder: 1 }`)
    - Purpose: Sort media by order
    - Use Case: Displaying media in intended order

## Application Collection Indexes

27. **Advertisement Index** (`{ advertisementId: 1 }`)
    - Purpose: Find applications for specific advertisement
    - Use Case: Advertisement application list

28. **Applicant Index** (`{ applicantId: 1 }`)
    - Purpose: Find applications by applicant
    - Use Case: User's applications list

29. **Owner Index** (`{ ownerId: 1 }`)
    - Purpose: Find applications to user's ads
    - Use Case: User's received applications

30. **Status Index** (`{ status: 1 }`)
    - Purpose: Filter applications by status
    - Use Case: Status-based application management

31. **Creation Date Index** (`{ createdAt: -1 }`)
    - Purpose: Sort applications chronologically
    - Use Case: Application timeline

32. **Response Date Index** (`{ respondedAt: 1 }`)
    - Purpose: Sort by response time
    - Use Case: Measuring response times

33. **Unique Applicant-Advertisement Index** (`{ applicantId: 1, advertisementId: 1 }`)
    - Purpose: Prevent duplicate applications
    - Unique: Yes
    - Use Case: Ensuring one application per ad per user

## Chat Collection Indexes

34. **Participants Index** (`{ participants: 1 }`)
    - Purpose: Find chats for specific users
    - Use Case: User's chat list

35. **Advertisement Index** (`{ advertisementId: 1 }`)
    - Purpose: Find chats related to advertisement
    - Use Case: Advertisement-specific chats

36. **Application Index** (`{ applicationId: 1 }`)
    - Purpose: Find chats related to application
    - Use Case: Application-specific chats

37. **Last Message Date Index** (`{ lastMessageAt: -1 }`)
    - Purpose: Sort chats by recent activity
    - Use Case: Chronological chat listing

38. **Archive Status Index** (`{ isArchived: 1 }`)
    - Purpose: Filter archived/unarchived chats
    - Use Case: Showing active chats

## Message Collection Indexes

39. **Chat Index** (`{ chatId: 1 }`)
    - Purpose: Find messages in specific chat
    - Use Case: Loading chat messages

40. **Sender Index** (`{ senderId: 1 }`)
    - Purpose: Find messages by sender
    - Use Case: User's sent messages

41. **Creation Date Index** (`{ createdAt: 1 }`)
    - Purpose: Sort messages chronologically
    - Use Case: Chronological message display

42. **Read Status Index** (`{ 'isRead.$**': 1 }`)
    - Purpose: Query read/unread messages
    - Use Case: Unread message indicators

43. **Message Type Index** (`{ messageType: 1 }`)
    - Purpose: Filter messages by type
    - Use Case: Loading specific message types

## Review Collection Indexes

44. **Reviewer Index** (`{ reviewerId: 1 }`)
    - Purpose: Find reviews by reviewer
    - Use Case: User's given reviews

45. **Reviewee Index** (`{ revieweeId: 1 }`)
    - Purpose: Find reviews for user
    - Use Case: User's received reviews

46. **Advertisement Index** (`{ advertisementId: 1 }`)
    - Purpose: Find reviews for advertisement
    - Use Case: Advertisement reviews

47. **Application Index** (`{ applicationId: 1 }`)
    - Purpose: Find reviews for application
    - Use Case: Application reviews

48. **Rating Index** (`{ rating: 1 }`)
    - Purpose: Filter by rating value
    - Use Case: Rating-based filtering

49. **Verification Status Index** (`{ isVerified: 1 }`)
    - Purpose: Filter verified reviews
    - Use Case: Showing only verified reviews

50. **Unique Review Index** (`{ reviewerId: 1, revieweeId: 1, applicationId: 1 }`)
    - Purpose: Prevent duplicate reviews
    - Unique: Yes
    - Use Case: Ensuring one review per user per application

51. **Creation Date Index** (`{ createdAt: -1 }`)
    - Purpose: Sort reviews chronologically
    - Use Case: Review timeline

## Ticket Collection Indexes

52. **User Index** (`{ userId: 1 }`)
    - Purpose: Find tickets for user
    - Use Case: User's tickets

53. **Status Index** (`{ status: 1 }`)
    - Purpose: Filter tickets by status
    - Use Case: Ticket management by status

54. **Priority Index** (`{ priority: 1 }`)
    - Purpose: Filter tickets by priority
    - Use Case: Priority-based ticket handling

55. **Category Index** (`{ category: 1 }`)
    - Purpose: Filter tickets by category
    - Use Case: Category-based ticket organization

56. **Assigned Agent Index** (`{ assignedTo: 1 }`)
    - Purpose: Find tickets assigned to agent
    - Use Case: Agent's assigned tickets

57. **Creation Date Index** (`{ createdAt: -1 }`)
    - Purpose: Sort tickets chronologically
    - Use Case: Ticket timeline

58. **Resolution Date Index** (`{ resolvedAt: 1 }`)
    - Purpose: Find resolved tickets
    - Use Case: Resolution statistics

59. **Satisfaction Rating Index** (`{ satisfactionRating: 1 }`)
    - Purpose: Filter by satisfaction rating
    - Use Case: Quality metrics

## Role Collection Indexes

60. **Name Index** (`{ name: 1 }`)
    - Purpose: Optimize role lookups
    - Unique: Yes
    - Use Case: Role-based access control

61. **Active Status Index** (`{ isActive: 1 }`)
    - Purpose: Filter active/inactive roles
    - Use Case: Using only active roles

62. **System Role Index** (`{ systemRole: 1 }`)
    - Purpose: Filter system vs custom roles
    - Use Case: Managing system roles

## Permission Collection Indexes

63. **Name Index** (`{ name: 1 }`)
    - Purpose: Optimize permission lookups
    - Unique: Yes
    - Use Case: Permission-based access control

64. **Resource-Action Index** (`{ resource: 1, action: 1 }`)
    - Purpose: Find permissions for specific resource-action
    - Use Case: Permission validation

65. **Active Status Index** (`{ isActive: 1 }`)
    - Purpose: Filter active/inactive permissions
    - Use Case: Using only active permissions

66. **System Permission Index** (`{ systemPermission: 1 }`)
    - Purpose: Filter system vs custom permissions
    - Use Case: Managing system permissions

These indexes are designed to optimize common query patterns in the Barter Vibe application while maintaining good performance for read and write operations. Each index serves a specific purpose in supporting the application's features and user experience.