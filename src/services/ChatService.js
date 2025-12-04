// src/services/ChatService.js
const Chat = require('../models/Chat');
const User = require('../models/User');
const Message = require('../models/Message');
const AppError = require('../utils/AppError');
const { logger } = require('../logger/logger');

class ChatService {
  /**
   * Create a new chat
   * @param {Object} chatData - Chat creation data
   * @param {Array} chatData.participants - Array of user IDs participating in the chat
   * @param {ObjectId} [chatData.advertisementId] - Advertisement ID if chat is related to an ad
   * @param {ObjectId} [chatData.applicationId] - Application ID if chat is related to an application
   * @param {String} [chatData.title] - Chat title (optional)
   * @param {Boolean} [chatData.isGroup] - Whether this is a group chat
   * @param {ObjectId} userId - ID of the user creating the chat
   * @returns {Promise<Chat>} Created chat object
   */
  async createChat(chatData, userId) {
    try {
      // Validate that the creating user is in the participants list
      if (!chatData.participants.includes(userId.toString())) {
        throw new AppError('Creating user must be included in the participants list', 400);
      }

      // Validate that there are at least 2 participants (for direct messages)
      if (chatData.participants.length < 2) {
        throw new AppError('Chat must have at least 2 participants', 400);
      }

      // Check if a direct chat already exists between the same participants
      if (!chatData.isGroup && chatData.participants.length === 2) {
        const existingChat = await this.findDirectChat(chatData.participants);
        if (existingChat) {
          return existingChat;
        }
      }

      // Create new chat
      const chat = new Chat({
        participants: chatData.participants,
        advertisementId: chatData.advertisementId,
        applicationId: chatData.applicationId,
        title: chatData.title,
        isGroup: chatData.isGroup || false
      });

      await chat.save();

      // Populate and return the chat
      const populatedChat = await Chat.findById(chat._id)
        .populate('participants', 'firstName lastName email')
        .populate('advertisementId', 'title description')
        .populate('applicationId', 'message status');

      return populatedChat;
    } catch (error) {
      logger.error('Error creating chat:', error.message);
      throw error;
    }
  }

  /**
   * Find a direct chat between two users
   * @param {Array} participantIds - Array of two participant IDs
   * @returns {Promise<Chat | null>} Found chat or null
   */
  async findDirectChat(participantIds) {
    if (participantIds.length !== 2) {
      throw new AppError('Direct chat must have exactly 2 participants', 400);
    }

    // Find chat that has exactly these 2 participants (order doesn't matter)
    const chat = await Chat.findOne({
      isGroup: false,
      participants: { $size: 2 },
      $and: [
        { participants: { $in: [participantIds[0]] } },
        { participants: { $in: [participantIds[1]] } }
      ]
    });

    return chat;
  }

  /**
   * Get all chats for a specific user
   * @param {ObjectId} userId - ID of the user
   * @param {Object} options - Query options
   * @param {Number} [options.page=1] - Page number
   * @param {Number} [options.limit=10] - Items per page
   * @param {Boolean} [options.includeArchived=false] - Whether to include archived chats
   * @param {Boolean} [options.includeDeleted=false] - Whether to include deleted chats
   * @returns {Promise<Object>} Object with chats and pagination info
   */
  async getUserChats(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        includeArchived = false,
        includeDeleted = false,
        sortBy = 'lastMessageAt',
        sortOrder = -1
      } = options;

      // Build query to find chats that the user is part of
      let query = { participants: userId };

      // Exclude deleted chats by default
      if (!includeDeleted) {
        query.isDeleted = { $ne: true }; // Don't include chats that are deleted
      }

      if (!includeArchived) {
        query.isArchived = false;
      }

      // Calculate skip for pagination
      const skip = (page - 1) * limit;

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder;

      // Get chats with pagination and populate
      const chats = await Chat.find(query)
        .populate('participants', 'firstName lastName email avatar')
        .populate('advertisementId', 'title')
        .populate('applicationId', 'status')
        .sort(sort)
        .skip(skip)
        .limit(limit);

      // Get total count for pagination
      const total = await Chat.countDocuments(query);

      return {
        chats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Error getting user chats:', error.message);
      throw error;
    }
  }

  /**
   * Get a specific chat by ID
   * @param {ObjectId} chatId - ID of the chat
   * @param {ObjectId} userId - ID of the requesting user
   * @returns {Promise<Chat>} Chat object
   */
  async getChatById(chatId, userId) {
    try {
      // Check if user is participant of the chat
      const chat = await Chat.findOne({
        _id: chatId,
        participants: userId
      }).populate('participants', 'firstName lastName email avatar');

      if (!chat) {
        throw new AppError('Chat not found or you are not a participant', 404);
      }

      // For archived chats, we might want to return additional information
      // or handle differently based on business requirements
      if (chat.isArchived) {
        // The chat will still be returned but marked as archived
      }

      return chat;
    } catch (error) {
      logger.error('Error getting chat by ID:', error.message);
      throw error;
    }
  }

  /**
   * Update chat information
   * @param {ObjectId} chatId - ID of the chat to update
   * @param {ObjectId} userId - ID of the requesting user (should be admin or participant)
   * @param {Object} updateData - Data to update
   * @returns {Promise<Chat>} Updated chat object
   */
  async updateChat(chatId, userId, updateData) {
    try {
      // Check if chat exists and user is a participant
      const chat = await Chat.findOne({
        _id: chatId,
        participants: userId
      });

      if (!chat) {
        throw new AppError('Chat not found or you are not a participant', 404);
      }

      // Only allow specific fields to be updated
      const allowedUpdates = ['title', 'isGroup'];
      const updates = {};

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedUpdates.includes(key)) {
          updates[key] = value;
        }
      }

      // Update the chat
      Object.assign(chat, updates);
      await chat.save();

      // Populate and return the updated chat
      const populatedChat = await Chat.findById(chat._id)
        .populate('participants', 'firstName lastName email')
        .populate('advertisementId', 'title')
        .populate('applicationId', 'status');

      return populatedChat;
    } catch (error) {
      logger.error('Error updating chat:', error.message);
      throw error;
    }
  }

  /**
   * Delete a chat (soft delete by setting flags)
   * @param {ObjectId} chatId - ID of the chat to delete
   * @param {ObjectId} userId - ID of the requesting user
   * @returns {Promise<Chat>} Updated chat object
   */
  async deleteChat(chatId, userId) {
    try {
      // Check if chat exists and user is a participant
      const chat = await Chat.findOne({
        _id: chatId,
        participants: userId
      });

      if (!chat) {
        throw new AppError('Chat not found or you are not a participant', 404);
      }

      // For complete deletion, we mark as deleted rather than just archived
      // This is different from archiving which is just hiding the chat
      chat.isDeleted = true;
      chat.deletedBy = userId;
      chat.deletedAt = new Date();
      chat.isArchived = true; // Also archive when deleted

      await chat.save();

      return chat;
    } catch (error) {
      logger.error('Error deleting chat:', error.message);
      throw error;
    }
  }

  /**
   * Archive a chat
   * @param {ObjectId} chatId - ID of the chat to archive
   * @param {ObjectId} userId - ID of the requesting user
   * @returns {Promise<Chat>} Updated chat object
   */
  async archiveChat(chatId, userId) {
    try {
      // Check if chat exists and user is a participant
      const chat = await Chat.findOne({
        _id: chatId,
        participants: userId
      });

      if (!chat) {
        throw new AppError('Chat not found or you are not a participant', 404);
      }

      chat.isArchived = true;
      await chat.save();

      return chat;
    } catch (error) {
      logger.error('Error archiving chat:', error.message);
      throw error;
    }
  }

  /**
   * Unarchive a chat
   * @param {ObjectId} chatId - ID of the chat to unarchive
   * @param {ObjectId} userId - ID of the requesting user
   * @returns {Promise<Chat>} Updated chat object
   */
  async unarchiveChat(chatId, userId) {
    try {
      // Check if chat exists and user is a participant
      const chat = await Chat.findOne({
        _id: chatId,
        participants: userId
      });

      if (!chat) {
        throw new AppError('Chat not found or you are not a participant', 404);
      }

      chat.isArchived = false;
      await chat.save();

      return chat;
    } catch (error) {
      logger.error('Error unarchiving chat:', error.message);
      throw error;
    }
  }

  /**
   * Add participant to chat
   * @param {ObjectId} chatId - ID of the chat
   * @param {ObjectId} addingUserId - ID of the user adding the participant
   * @param {ObjectId} newParticipantId - ID of the user to add
   * @returns {Promise<Chat>} Updated chat object
   */
  async addParticipant(chatId, addingUserId, newParticipantId) {
    try {
      // Verify that adding user is a participant of the chat
      const chat = await Chat.findOne({
        _id: chatId,
        participants: addingUserId
      });

      if (!chat) {
        throw new AppError('Chat not found or you are not a participant', 404);
      }

      // Only allow adding participants to group chats
      if (!chat.isGroup) {
        throw new AppError('Cannot add participants to direct chat', 400);
      }

      // Check if user is already a participant
      if (chat.participants.includes(newParticipantId)) {
        throw new AppError('User is already a participant in this chat', 400);
      }

      // Add participant to the chat
      chat.participants.push(newParticipantId);
      await chat.save();

      return chat;
    } catch (error) {
      logger.error('Error adding participant to chat:', error.message);
      throw error;
    }
  }

  /**
   * Remove participant from chat
   * @param {ObjectId} chatId - ID of the chat
   * @param {ObjectId} removingUserId - ID of the user removing the participant
   * @param {ObjectId} participantToRemoveId - ID of the participant to remove
   * @returns {Promise<Chat>} Updated chat object
   */
  async removeParticipant(chatId, removingUserId, participantToRemoveId) {
    try {
      // Verify that removing user is a participant of the chat
      const chat = await Chat.findOne({
        _id: chatId,
        participants: removingUserId
      });

      if (!chat) {
        throw new AppError('Chat not found or you are not a participant', 404);
      }

      // Only allow removing participants from group chats
      if (!chat.isGroup) {
        throw new AppError('Cannot remove participants from direct chat', 400);
      }

      // Check if user to be removed is actually a participant
      if (!chat.participants.includes(participantToRemoveId)) {
        throw new AppError('User is not a participant in this chat', 400);
      }

      // Don't allow removing the chat creator unless they are removing themselves
      // In this implementation, we'll allow any participant to remove another participant in a group chat

      // Remove participant from chat
      chat.participants = chat.participants.filter(
        p => p.toString() !== participantToRemoveId.toString()
      );
      await chat.save();

      return chat;
    } catch (error) {
      logger.error('Error removing participant from chat:', error.message);
      throw error;
    }
  }

  /**
   * Permanently delete a chat (admin only feature)
   * @param {ObjectId} chatId - ID of the chat to permanently delete
   * @param {ObjectId} userId - ID of the admin user performing the action
   * @returns {Promise<Boolean>} Success status
   */
  async permanentlyDeleteChat(chatId, userId) {
    try {
      // This would typically be restricted to admin users
      // In a real implementation, you'd check if the user has admin privileges

      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new AppError('Chat not found', 404);
      }

      // Permanently delete the chat and all associated messages
      await Chat.findByIdAndDelete(chatId);

      // Also delete all messages in this chat
      await Message.deleteMany({ chatId });

      return true;
    } catch (error) {
      logger.error('Error permanently deleting chat:', error.message);
      throw error;
    }
  }

  /**
   * Restore a deleted chat
   * @param {ObjectId} chatId - ID of the chat to restore
   * @param {ObjectId} userId - ID of the user performing the action
   * @returns {Promise<Chat>} Restored chat object
   */
  async restoreChat(chatId, userId) {
    try {
      // Find the chat (including if it's marked as deleted)
      const chat = await Chat.findOne({
        _id: chatId,
        participants: userId // Only participants can restore their chat
      });

      if (!chat) {
        throw new AppError('Chat not found or you are not a participant', 404);
      }

      if (!chat.isDeleted) {
        throw new AppError('Chat is not deleted', 400);
      }

      // Restore the chat by resetting deletion flags
      chat.isDeleted = false;
      chat.deletedBy = null;
      chat.deletedAt = null;
      chat.isArchived = false; // Also unarchive when restoring

      await chat.save();

      return chat;
    } catch (error) {
      logger.error('Error restoring chat:', error.message);
      throw error;
    }
  }
}

module.exports = new ChatService();