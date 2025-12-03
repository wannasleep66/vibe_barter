// tests/unit/controllers/sessionController.test.js
const sessionController = require('../../../src/controllers/sessionController');
const sessionService = require('../../../src/services/SessionService');

// Mock the session service
jest.mock('../../../src/services/SessionService');

describe('SessionController Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: { id: 'userId123', role: 'user' },
      params: {},
      body: {},
      headers: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    
    jest.clearAllMocks();
  });

  describe('getActiveSessions', () => {
    it('should call service with user id for regular user', async () => {
      const mockSessions = { userId: 'userId123', activeSessions: 0, blacklistedSessions: 0 };
      sessionService.getActiveSessions = jest.fn().mockResolvedValue(mockSessions);

      await sessionController.getActiveSessions(req, res, next);

      expect(sessionService.getActiveSessions).toHaveBeenCalledWith('userId123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockSessions
      });
    });

    it('should call service with param user id for admin', async () => {
      req.user.role = 'admin';
      req.params.userId = 'otherUserId123';
      
      const mockSessions = { userId: 'otherUserId123', activeSessions: 0, blacklistedSessions: 0 };
      sessionService.getActiveSessions = jest.fn().mockResolvedValue(mockSessions);

      await sessionController.getActiveSessions(req, res, next);

      expect(sessionService.getActiveSessions).toHaveBeenCalledWith('otherUserId123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockSessions
      });
    });

    it('should handle errors appropriately', async () => {
      const error = new Error('Service error');
      sessionService.getActiveSessions = jest.fn().mockRejectedValue(error);

      await sessionController.getActiveSessions(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('revokeAllUserSessions', () => {
    it('should return 403 for non-admin users', async () => {
      req.user.role = 'user'; // Not admin
      
      await sessionController.revokeAllUserSessions(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Only administrators can revoke all user sessions'
      });
    });

    it('should call service for admin users', async () => {
      req.user.role = 'admin';
      req.params.userId = 'targetUserId123';
      
      const mockResult = { success: true, message: 'Sessions revoked' };
      sessionService.revokeAllUserSessions = jest.fn().mockResolvedValue(mockResult);

      await sessionController.revokeAllUserSessions(req, res, next);

      expect(sessionService.revokeAllUserSessions).toHaveBeenCalledWith('userId123', 'targetUserId123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        ...mockResult
      });
    });

    it('should handle errors appropriately', async () => {
      req.user.role = 'admin';
      req.params.userId = 'targetUserId123';
      
      const error = new Error('Service error');
      sessionService.revokeAllUserSessions = jest.fn().mockRejectedValue(error);

      await sessionController.revokeAllUserSessions(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('revokeSpecificToken', () => {
    it('should return 400 if no token is provided', async () => {
      req.body.token = undefined;
      req.params.tokenId = undefined;

      await sessionController.revokeSpecificToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token or tokenId is required'
      });
    });

    it('should call service with token from body', async () => {
      req.body.token = 'tokenFromBody';
      
      const mockResult = { success: true, message: 'Token revoked' };
      sessionService.revokeSpecificToken = jest.fn().mockResolvedValue(mockResult);

      await sessionController.revokeSpecificToken(req, res, next);

      expect(sessionService.revokeSpecificToken).toHaveBeenCalledWith('tokenFromBody', 'userId123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        ...mockResult
      });
    });

    it('should call service with token from param', async () => {
      req.body.token = undefined;
      req.params.tokenId = 'tokenFromParam';
      
      const mockResult = { success: true, message: 'Token revoked' };
      sessionService.revokeSpecificToken = jest.fn().mockResolvedValue(mockResult);

      await sessionController.revokeSpecificToken(req, res, next);

      expect(sessionService.revokeSpecificToken).toHaveBeenCalledWith('tokenFromParam', 'userId123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        ...mockResult
      });
    });

    it('should handle errors appropriately', async () => {
      req.body.token = 'testToken';
      
      const error = new Error('Service error');
      sessionService.revokeSpecificToken = jest.fn().mockRejectedValue(error);

      await sessionController.revokeSpecificToken(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('revokeOtherSessions', () => {
    it('should return 400 if no token in headers', async () => {
      req.headers.authorization = undefined;

      await sessionController.revokeOtherSessions(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Current token not found in request'
      });
    });

    it('should call service with current token', async () => {
      req.headers.authorization = 'Bearer currentBearerToken123';
      
      const mockResult = { success: true, message: 'Other sessions revoked' };
      sessionService.revokeOtherUserSessions = jest.fn().mockResolvedValue(mockResult);

      await sessionController.revokeOtherSessions(req, res, next);

      expect(sessionService.revokeOtherUserSessions).toHaveBeenCalledWith('currentBearerToken123', 'userId123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        ...mockResult
      });
    });

    it('should handle errors appropriately', async () => {
      req.headers.authorization = 'Bearer currentBearerToken123';
      
      const error = new Error('Service error');
      sessionService.revokeOtherUserSessions = jest.fn().mockRejectedValue(error);

      await sessionController.revokeOtherSessions(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('forcePasswordChange', () => {
    it('should return 403 for non-admin users', async () => {
      req.user.role = 'user'; // Not admin
      req.params.userId = 'targetUserId123';
      
      await sessionController.forcePasswordChange(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Only administrators can force password changes'
      });
    });

    it('should call service for admin users', async () => {
      req.user.role = 'admin';
      req.params.userId = 'targetUserId123';
      
      const mockResult = { success: true, message: 'Password change enforced' };
      sessionService.forcePasswordChange = jest.fn().mockResolvedValue(mockResult);

      await sessionController.forcePasswordChange(req, res, next);

      expect(sessionService.forcePasswordChange).toHaveBeenCalledWith('targetUserId123', 'userId123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        ...mockResult
      });
    });

    it('should handle errors appropriately', async () => {
      req.user.role = 'admin';
      req.params.userId = 'targetUserId123';
      
      const error = new Error('Service error');
      sessionService.forcePasswordChange = jest.fn().mockRejectedValue(error);

      await sessionController.forcePasswordChange(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});