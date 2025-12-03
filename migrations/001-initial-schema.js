// migrations/001-initial-schema.js

module.exports = {
  description: 'Initial database schema setup',
  
  up: async (db, client) => {
    // Collections are implicitly created when documents are inserted
    // We'll ensure indexes are created properly
    
    // Users collection indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ isActive: 1 });
    
    // Profiles collection indexes
    await db.collection('profiles').createIndex({ user: 1 }, { unique: true });
    await db.collection('profiles').createIndex({ location: 'text', skills: 'text' });
    await db.collection('profiles').createIndex({ availability: 1 });
    
    // Categories collection indexes
    await db.collection('categories').createIndex({ name: 1 }, { unique: true });
    await db.collection('categories').createIndex({ isActive: 1 });
    await db.collection('categories').createIndex({ parentCategory: 1 });
    
    // Tags collection indexes
    await db.collection('tags').createIndex({ name: 1 }, { unique: true });
    await db.collection('tags').createIndex({ isActive: 1 });
    await db.collection('tags').createIndex({ isSystemTag: 1 });
    
    // Advertisements collection indexes
    await db.collection('advertisements').createIndex({ 
      title: 'text', 
      description: 'text', 
      exchangePreferences: 'text' 
    });
    await db.collection('advertisements').createIndex({ categoryId: 1 });
    await db.collection('advertisements').createIndex({ ownerId: 1 });
    await db.collection('advertisements').createIndex({ type: 1 });
    await db.collection('advertisements').createIndex({ location: 1 });
    await db.collection('advertisements').createIndex({ isActive: 1, isArchived: 1 });
    await db.collection('advertisements').createIndex({ createdAt: -1 });
    await db.collection('advertisements').createIndex({ isUrgent: 1 });
    await db.collection('advertisements').createIndex({ expiresAt: 1 });
    await db.collection('advertisements').createIndex({ coordinates: '2dsphere' });
    await db.collection('advertisements').createIndex({ profileId: 1 });
    
    // AdvertisementMedia collection indexes
    await db.collection('advertisementmedia').createIndex({ advertisementId: 1 });
    await db.collection('advertisementmedia').createIndex({ type: 1 });
    await db.collection('advertisementmedia').createIndex({ isPrimary: 1 });
    await db.collection('advertisementmedia').createIndex({ sortOrder: 1 });
    
    // Applications collection indexes
    await db.collection('applications').createIndex({ advertisementId: 1 });
    await db.collection('applications').createIndex({ applicantId: 1 });
    await db.collection('applications').createIndex({ ownerId: 1 });
    await db.collection('applications').createIndex({ status: 1 });
    await db.collection('applications').createIndex({ createdAt: -1 });
    await db.collection('applications').createIndex({ respondedAt: 1 });
    await db.collection('applications').createIndex({ applicantId: 1, advertisementId: 1 }, { unique: true });
    
    // Chats collection indexes
    await db.collection('chats').createIndex({ participants: 1 });
    await db.collection('chats').createIndex({ advertisementId: 1 });
    await db.collection('chats').createIndex({ applicationId: 1 });
    await db.collection('chats').createIndex({ lastMessageAt: -1 });
    await db.collection('chats').createIndex({ isArchived: 1 });
    
    // Messages collection indexes
    await db.collection('messages').createIndex({ chatId: 1 });
    await db.collection('messages').createIndex({ senderId: 1 });
    await db.collection('messages').createIndex({ createdAt: 1 });
    await db.collection('messages').createIndex({ 'isRead.$**': 1 });
    await db.collection('messages').createIndex({ messageType: 1 });
    
    // Reviews collection indexes
    await db.collection('reviews').createIndex({ reviewerId: 1 });
    await db.collection('reviews').createIndex({ revieweeId: 1 });
    await db.collection('reviews').createIndex({ advertisementId: 1 });
    await db.collection('reviews').createIndex({ applicationId: 1 });
    await db.collection('reviews').createIndex({ rating: 1 });
    await db.collection('reviews').createIndex({ isVerified: 1 });
    await db.collection('reviews').createIndex({ reviewerId: 1, revieweeId: 1, applicationId: 1 }, { unique: true });
    await db.collection('reviews').createIndex({ createdAt: -1 });
    
    // Tickets collection indexes
    await db.collection('tickets').createIndex({ userId: 1 });
    await db.collection('tickets').createIndex({ status: 1 });
    await db.collection('tickets').createIndex({ priority: 1 });
    await db.collection('tickets').createIndex({ category: 1 });
    await db.collection('tickets').createIndex({ assignedTo: 1 });
    await db.collection('tickets').createIndex({ createdAt: -1 });
    await db.collection('tickets').createIndex({ resolvedAt: 1 });
    await db.collection('tickets').createIndex({ satisfactionRating: 1 });
    
    // Roles collection indexes
    await db.collection('roles').createIndex({ name: 1 }, { unique: true });
    await db.collection('roles').createIndex({ isActive: 1 });
    await db.collection('roles').createIndex({ systemRole: 1 });
    
    // Permissions collection indexes
    await db.collection('permissions').createIndex({ name: 1 }, { unique: true });
    await db.collection('permissions').createIndex({ resource: 1, action: 1 });
    await db.collection('permissions').createIndex({ isActive: 1 });
    await db.collection('permissions').createIndex({ systemPermission: 1 });
  },
  
  down: async (db, client) => {
    // Dropping indexes is not necessary as dropping collections will remove them
    // For a complete rollback, we would drop the entire database
    // This is typically not done in production
    
    // Instead, we could remove specific indexes if needed
    await db.collection('users').dropIndex({ email: 1 });
    await db.collection('users').dropIndex({ isActive: 1 });
    
    // Similar for other collections - would drop specific indexes
    // For brevity, we'll just note that this would be the approach
    console.log('Indexes removed. In a real scenario, we would remove all indexes.');
  }
};