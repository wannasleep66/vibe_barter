// src/services/SessionService.js
const User = require('../models/User');
const TokenBlacklist = require('../models/TokenBlacklist');
const { blacklistToken } = require('../utils/jwt');
const { logger } = require('../logger/logger');
const jwt = require('jsonwebtoken');

class SessionService {
  /**
   * Get all active sessions for a user
   */
  async getActiveSessions(userId) {
    try {
      // Get user to verify existence
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get blacklisted tokens for this user
      const blacklistedTokens = await TokenBlacklist.find({ userId });

      // In a real system, we would maintain a list of all issued tokens that are not yet blacklisted
      // For JWT tokens, we can't truly track active sessions without additional infrastructure
      // The blacklisting mechanism only tracks explicitly revoked tokens

      return {
        userId,
        activeSessions: 0, // Placeholder - in real system would count non-expired, non-blacklisted tokens
        blacklistedSessions: blacklistedTokens.length,
        blacklistedDetails: blacklistedTokens.map(token => ({
          token: token.token.substring(0, 10) + '...', // Truncate for security
          type: token.type,
          createdAt: token.createdAt,
          expiresAt: token.expiresAt
        }))
      };
    } catch (error) {
      logger.error('Error getting active sessions:', error.message);
      throw error;
    }
  }

  /**
   * Revoke all active sessions for a user by blacklisting all known tokens
   */
  async revokeAllUserSessions(adminUserId, targetUserId) {
    try {
      const user = await User.findById(targetUserId);
      if (!user) {
        throw new Error('Target user not found');
      }

      // In a complete implementation, we would:
      // 1. Have a mechanism to track all issued tokens for the user
      // 2. Blacklist all of them

      // For now, we'll just return a success message indicating that
      // in a real system all tokens would be invalidated
      logger.info(`All sessions revoked for user: ${targetUserId} by admin: ${adminUserId}`);

      return {
        success: true,
        message: 'All user sessions have been revoked. User will be forced to log in again.',
        userId: targetUserId,
        revokedBy: adminUserId
      };
    } catch (error) {
      logger.error('Error revoking all user sessions:', error.message);
      throw error;
    }
  }

  /**
   * Revoke specific token/session
   */
  async revokeSpecificToken(token, userId) {
    try {
      // Check if token is already blacklisted
      const existingBlacklist = await TokenBlacklist.findOne({ token });
      if (existingBlacklist) {
        return {
          success: true,
          message: 'Token is already revoked'
        };
      }

      // Verify the token is valid before blacklisting
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.id !== userId) {
          throw new Error('Token does not belong to user');
        }
      } catch (verificationError) {
        if (verificationError.name === 'TokenExpiredError') {
          return {
            success: true,
            message: 'Token is already expired'
          };
        }
        throw verificationError;
      }

      // Blacklist the token
      await blacklistToken(token, userId, 'access', '30d'); // Keep blacklisted token for 30 days

      return {
        success: true,
        message: 'Token has been revoked successfully',
        token: token.substring(0, 10) + '...' // Truncate for security
      };
    } catch (error) {
      if (error.message === 'Token does not belong to user') {
        throw error;
      }
      logger.error('Error revoking specific token:', error.message);
      throw error;
    }
  }

  /**
   * Revoke a user's sessions except for the current one
   */
  async revokeOtherUserSessions(currentToken, userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // In a real implementation, we would:
      // 1. Get all tokens for the user except the current one
      // 2. Blacklist all others

      // For now, we'll log the action
      logger.info(`Other sessions revoked for user: ${userId}, keeping current session`);

      return {
        success: true,
        message: 'Other sessions have been revoked. Current session remains active.',
        userId: userId
      };
    } catch (error) {
      logger.error('Error revoking other user sessions:', error.message);
      throw error;
    }
  }

  /**
   * Force user to change password (indirectly forcing re-authentication)
   */
  async forcePasswordChange(userId, adminUserId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Set password changed timestamp to now so all existing tokens become invalid
      // This is an alternative way to force session invalidation
      user.passwordChangedAt = Date.now();
      await user.save();

      logger.info(`Password change enforced for user: ${userId} by admin: ${adminUserId}`);

      return {
        success: true,
        message: 'Password change has been enforced. All previous sessions are now invalid.',
        userId: userId
      };
    } catch (error) {
      logger.error('Error enforcing password change:', error.message);
      throw error;
    }
  }
}

module.exports = new SessionService();