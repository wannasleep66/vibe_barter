// src/controllers/chatController.js
const ChatService = require('../services/ChatService');
const AppError = require('../utils/AppError');
const { logger } = require('../logger/logger');

class ChatController {
  /**
   * Create a new chat
   */
  async createChat(req, res, next) {
    try {
      const { participants, advertisementId, applicationId, title, isGroup } = req.body;

      // Ensure user is in the participants list
      if (!participants.includes(req.user._id.toString())) {
        return next(new AppError('You must be included in the participants list', 400));
      }

      const chat = await ChatService.createChat({
        participants,
        advertisementId,
        applicationId,
        title,
        isGroup
      }, req.user._id);

      res.status(201).json({
        success: true,
        data: chat,
        message: 'Chat created successfully'
      });
    } catch (error) {
      logger.error('Error creating chat:', error.message);
      next(error);
    }
  }

  /**
   * Get all chats for the authenticated user
   */
  async getUserChats(req, res, next) {
    try {
      const {
        page = 1,
        limit = 10,
        includeArchived = 'false',
        sortBy = 'lastMessageAt',
        sortOrder = '-1'
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        includeArchived: includeArchived === 'true',
        sortBy,
        sortOrder: parseInt(sortOrder)
      };

      const result = await ChatService.getUserChats(req.user._id, options);

      res.status(200).json({
        success: true,
        data: result.chats,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error getting user chats:', error.message);
      next(error);
    }
  }

  /**
   * Get a specific chat by ID
   */
  async getChatById(req, res, next) {
    try {
      const { id } = req.params;

      const chat = await ChatService.getChatById(id, req.user._id);

      res.status(200).json({
        success: true,
        data: chat
      });
    } catch (error) {
      logger.error('Error getting chat by ID:', error.message);
      next(error);
    }
  }

  /**
   * Update chat information
   */
  async updateChat(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const chat = await ChatService.updateChat(id, req.user._id, updateData);

      res.status(200).json({
        success: true,
        data: chat,
        message: 'Chat updated successfully'
      });
    } catch (error) {
      logger.error('Error updating chat:', error.message);
      next(error);
    }
  }

  /**
   * Delete/Archive a chat
   */
  async deleteChat(req, res, next) {
    try {
      const { id } = req.params;

      const chat = await ChatService.deleteChat(id, req.user._id);

      res.status(200).json({
        success: true,
        data: chat,
        message: 'Chat archived successfully'
      });
    } catch (error) {
      logger.error('Error deleting chat:', error.message);
      next(error);
    }
  }

  /**
   * Archive a chat
   */
  async archiveChat(req, res, next) {
    try {
      const { id } = req.params;

      const chat = await ChatService.archiveChat(id, req.user._id);

      res.status(200).json({
        success: true,
        data: chat,
        message: 'Chat archived successfully'
      });
    } catch (error) {
      logger.error('Error archiving chat:', error.message);
      next(error);
    }
  }

  /**
   * Unarchive a chat
   */
  async unarchiveChat(req, res, next) {
    try {
      const { id } = req.params;

      const chat = await ChatService.unarchiveChat(id, req.user._id);

      res.status(200).json({
        success: true,
        data: chat,
        message: 'Chat unarchived successfully'
      });
    } catch (error) {
      logger.error('Error unarchiving chat:', error.message);
      next(error);
    }
  }

  /**
   * Add participant to chat
   */
  async addParticipant(req, res, next) {
    try {
      const { chatId } = req.params;
      const { participantId } = req.body;

      const chat = await ChatService.addParticipant(chatId, req.user._id, participantId);

      res.status(200).json({
        success: true,
        data: chat,
        message: 'Participant added to chat successfully'
      });
    } catch (error) {
      logger.error('Error adding participant to chat:', error.message);
      next(error);
    }
  }

  /**
   * Remove participant from chat
   */
  async removeParticipant(req, res, next) {
    try {
      const { chatId } = req.params;
      const { participantId } = req.body;

      const chat = await ChatService.removeParticipant(chatId, req.user._id, participantId);

      res.status(200).json({
        success: true,
        data: chat,
        message: 'Participant removed from chat successfully'
      });
    } catch (error) {
      logger.error('Error removing participant from chat:', error.message);
      next(error);
    }
  }

  /**
   * Restore a deleted chat
   */
  async restoreChat(req, res, next) {
    try {
      const { id } = req.params;

      const chat = await ChatService.restoreChat(id, req.user._id);

      res.status(200).json({
        success: true,
        data: chat,
        message: 'Chat restored successfully'
      });
    } catch (error) {
      logger.error('Error restoring chat:', error.message);
      next(error);
    }
  }
}

module.exports = new ChatController();