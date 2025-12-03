// tests/unit/services/SessionService.test.js
const SessionService = require('../../../src/services/SessionService');
const User = require('../../../src/models/User');
const TokenBlacklist = require('../../../src/models/TokenBlacklist');
const { blacklistToken } = require('../../../src/utils/jwt');
const { logger } = require('../../../src/logger/logger');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('../../../src/models/User');
jest.mock('../../../src/models/TokenBlacklist');
jest.mock('../../../src/utils/jwt');
jest.mock('../../../src/logger/logger');
jest.mock('jsonwebtoken');

describe('SessionService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getActiveSessions', () => {
    it('should return session info for valid user', async () => {
      const userId = 'userId123';
      
      const mockUser = { _id: userId, email: 'user@example.com' };
      const mockBlacklistedTokens = [
        { token: 'token123', type: 'access', createdAt: new Date(), expiresAt: new Date() }
      ];
      
      User.findById = jest.fn().mockResolvedValue(mockUser);
      TokenBlacklist.find = jest.fn().mockResolvedValue(mockBlacklistedTokens);

      const result = await SessionService.getActiveSessions(userId);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(TokenBlacklist.find).toHaveBeenCalledWith({ userId });
      expect(result.userId).toBe(userId);
      expect(result.activeSessions).toBe(0);
      expect(result.blacklistedSessions).toBe(1);
    });

    it('should throw error for non-existent user', async () => {
      const userId = 'nonExistentUserId';
      
      User.findById = jest.fn().mockResolvedValue(null);

      await expect(SessionService.getActiveSessions(userId))
        .rejects
        .toThrow('User not found');
    });

    it('should handle database errors', async () => {
      const userId = 'userId123';
      const error = new Error('Database error');
      
      User.findById = jest.fn().mockRejectedValue(error);

      await expect(SessionService.getActiveSessions(userId))
        .rejects
        .toThrow('Database error');
    });
  });

  describe('revokeAllUserSessions', () => {
    it('should return success when revoking all sessions for valid user', async () => {
      const adminUserId = 'admin123';
      const targetUserId = 'target123';
      
      const mockUser = { _id: targetUserId, email: 'user@example.com' };
      User.findById = jest.fn().mockResolvedValue(mockUser);

      const result = await SessionService.revokeAllUserSessions(adminUserId, targetUserId);

      expect(User.findById).toHaveBeenCalledWith(targetUserId);
      expect(result.success).toBe(true);
      expect(result.userId).toBe(targetUserId);
      expect(result.revokedBy).toBe(adminUserId);
    });

    it('should throw error for non-existent target user', async () => {
      const adminUserId = 'admin123';
      const targetUserId = 'nonExistentUserId';
      
      User.findById = jest.fn().mockResolvedValue(null);

      await expect(SessionService.revokeAllUserSessions(adminUserId, targetUserId))
        .rejects
        .toThrow('Target user not found');
    });
  });

  describe('revokeSpecificToken', () => {
    it('should return success if token is already blacklisted', async () => {
      const token = 'alreadyBlacklistedToken';
      const userId = 'userId123';
      
      const mockBlacklistedToken = { token, userId };
      TokenBlacklist.findOne = jest.fn().mockResolvedValue(mockBlacklistedToken);

      const result = await SessionService.revokeSpecificToken(token, userId);

      expect(TokenBlacklist.findOne).toHaveBeenCalledWith({ token });
      expect(result.success).toBe(true);
      expect(result.message).toBe('Token is already revoked');
    });

    it('should successfully blacklist a valid token', async () => {
      const token = 'validToken123';
      const userId = 'userId123';
      
      TokenBlacklist.findOne = jest.fn().mockResolvedValue(null); // Token not blacklisted yet
      jwt.verify = jest.fn().mockReturnValue({ id: userId }); // Token belongs to user
      blacklistToken.mockResolvedValue({});

      const result = await SessionService.revokeSpecificToken(token, userId);

      expect(TokenBlacklist.findOne).toHaveBeenCalledWith({ token });
      expect(jwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
      expect(blacklistToken).toHaveBeenCalledWith(token, userId, 'access', '30d');
      expect(result.success).toBe(true);
    });

    it('should throw error if token does not belong to user', async () => {
      const token = 'foreignToken123';
      const userId = 'userId123';
      const foreignUserId = 'foreignUserId123';
      
      TokenBlacklist.findOne = jest.fn().mockResolvedValue(null); // Token not blacklisted yet
      jwt.verify = jest.fn().mockReturnValue({ id: foreignUserId }); // Token belongs to other user

      await expect(SessionService.revokeSpecificToken(token, userId))
        .rejects
        .toThrow('Token does not belong to user');
    });

    it('should handle expired token appropriately', async () => {
      const token = 'expiredToken123';
      const userId = 'userId123';
      
      TokenBlacklist.findOne = jest.fn().mockResolvedValue(null);
      jwt.verify = jest.fn().mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      const result = await SessionService.revokeSpecificToken(token, userId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Token is already expired');
    });
  });

  describe('revokeOtherUserSessions', () => {
    it('should return success for valid user', async () => {
      const currentToken = 'currentToken123';
      const userId = 'userId123';
      
      const mockUser = { _id: userId, email: 'user@example.com' };
      User.findById = jest.fn().mockResolvedValue(mockUser);

      const result = await SessionService.revokeOtherUserSessions(currentToken, userId);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(result.success).toBe(true);
      expect(result.userId).toBe(userId);
    });

    it('should throw error for non-existent user', async () => {
      const currentToken = 'currentToken123';
      const userId = 'nonExistentUserId';
      
      User.findById = jest.fn().mockResolvedValue(null);

      await expect(SessionService.revokeOtherUserSessions(currentToken, userId))
        .rejects
        .toThrow('User not found');
    });
  });

  describe('forcePasswordChange', () => {
    it('should update passwordChangedAt field for valid user', async () => {
      const userId = 'userId123';
      const adminUserId = 'admin123';
      
      const mockUser = { 
        _id: userId, 
        email: 'user@example.com', 
        save: jest.fn().mockResolvedValue(true)
      };
      User.findById = jest.fn().mockResolvedValue(mockUser);

      const result = await SessionService.forcePasswordChange(userId, adminUserId);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(mockUser.passwordChangedAt).toBeDefined();
      expect(mockUser.save).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should throw error for non-existent user', async () => {
      const userId = 'nonExistentUserId';
      const adminUserId = 'admin123';
      
      User.findById = jest.fn().mockResolvedValue(null);

      await expect(SessionService.forcePasswordChange(userId, adminUserId))
        .rejects
        .toThrow('User not found');
    });
  });
});