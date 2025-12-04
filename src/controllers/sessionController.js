// src/controllers/sessionController.js
const sessionService = require('../services/SessionService');
const { logger } = require('../logger/logger');

const sessionController = {
  // Get user's active sessions
  async getActiveSessions(req, res, next) {
    try {
      // Check if user is authorized to view sessions
      // Admins can view any user's sessions, regular users can only view their own
      const userId = req.user.role === 'admin' ? req.params.userId : req.user.id;
      const sessions = await sessionService.getActiveSessions(userId);

      res.status(200).json({
        success: true,
        data: sessions
      });
    } catch (error) {
      next(error);
    }
  },

  // Revoke all sessions for a specific user (admin only)
  async revokeAllUserSessions(req, res, next) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can revoke all user sessions'
        });
      }

      const { userId } = req.params;
      const result = await sessionService.revokeAllUserSessions(req.user.id, userId);

      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  },

  // Revoke specific token (user can revoke their own, admin can revoke any)
  async revokeSpecificToken(req, res, next) {
    try {
      const { token } = req.body;
      const { tokenId } = req.params; // Alternative way to pass token info
      
      // If tokenId is provided in params, we'll use it, otherwise look for token in body
      if (!token && !tokenId) {
        return res.status(400).json({
          success: false,
          message: 'Token or tokenId is required'
        });
      }

      // In a real implementation with token IDs, we'd retrieve the actual token
      // For now, we'll check if a raw token was provided
      const tokenToRevoke = token || tokenId;
      
      // Verify that user owns this token or is admin
      // For this implementation, we'll rely on the fact that only valid tokens 
      // can reach this point through protected routes
      const result = await sessionService.revokeSpecificToken(tokenToRevoke, req.user.id);

      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  },

  // Revoke all other sessions for current user (keeps current session)
  async revokeOtherSessions(req, res, next) {
    try {
      // Get current token from request header
      const currentToken = req.headers.authorization?.split(' ')[1];
      
      if (!currentToken) {
        return res.status(400).json({
          success: false,
          message: 'Current token not found in request'
        });
      }

      const result = await sessionService.revokeOtherUserSessions(currentToken, req.user.id);

      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  },

  // Force password change for a user (admin only)
  async forcePasswordChange(req, res, next) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can force password changes'
        });
      }

      const { userId } = req.params;
      const result = await sessionService.forcePasswordChange(userId, req.user.id);

      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = sessionController;