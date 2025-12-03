// tests/unit/controllers/authController.jwt.test.js
const { logout, refreshToken } = require('../../../src/controllers/authController');
const User = require('../../../src/models/User');
const { logger } = require('../../../src/logger/logger');
const AppError = require('../../../src/utils/AppError');
const { blacklistToken } = require('../../../src/utils/jwt');

// Mock dependencies
jest.mock('../../../src/models/User');
jest.mock('../../../src/logger/logger');
jest.mock('../../../src/utils/jwt');
jest.mock('jsonwebtoken');

describe('Auth Controller - JWT Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      body: {},
      query: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    
    jest.clearAllMocks();
  });

  describe('logout', () => {
    it('should blacklist the token when provided in headers', async () => {
      const mockToken = 'testToken123';
      req.headers.authorization = `Bearer ${mockToken}`;
      
      // Mock jwt.decode to return a user ID
      jest.mock('jsonwebtoken', () => ({
        ...jest.requireActual('jsonwebtoken'),
        decode: jest.fn().mockReturnValue({ id: 'userId123' })
      }));
      
      blacklistToken.mockResolvedValue({});

      await logout(req, res, next);

      expect(blacklistToken).toHaveBeenCalledWith(mockToken, 'userId123', 'access');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logged out successfully'
      });
    });

    it('should handle logout without token gracefully', async () => {
      req.headers.authorization = undefined;

      await logout(req, res, next);

      expect(blacklistToken).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logged out successfully'
      });
    });

    it('should handle error during token decoding', async () => {
      req.headers.authorization = `Bearer ${'invalidToken'}`;
      
      jest.mock('jsonwebtoken', () => ({
        ...jest.requireActual('jsonwebtoken'),
        decode: jest.fn().mockImplementation(() => { throw new Error('Invalid token'); })
      }));

      await logout(req, res, next);

      expect(logger.warn).toHaveBeenCalledWith('Could not decode token during logout:', 'Invalid token');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should call next with error if logout fails', async () => {
      const error = new Error('Logout error');
      req.headers.authorization = `Bearer ${'testToken'}`;
      
      jest.mock('jsonwebtoken', () => ({
        ...jest.requireActual('jsonwebtoken'),
        decode: jest.fn().mockReturnValue({ id: 'userId123' })
      }));
      
      blacklistToken.mockRejectedValue(error);

      await logout(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('refreshToken', () => {
    it('should generate new access token with valid refresh token', async () => {
      const mockRefreshToken = 'refreshToken123';
      req.body.refreshToken = mockRefreshToken;
      
      // Mock jwt.verify to return user ID
      jest.mock('jsonwebtoken', () => ({
        verify: jest.fn().mockReturnValue({ id: 'userId123' })
      }));
      
      const mockUser = {
        _id: 'userId123'
      };
      User.findById = jest.fn().mockResolvedValue(mockUser);

      await refreshToken(req, res, next);

      expect(User.findById).toHaveBeenCalledWith('userId123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          token: expect.any(String)
        })
      );
    });

    it('should return error for missing refresh token', async () => {
      req.body.refreshToken = undefined;

      await refreshToken(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toBe('Refresh token is required');
      expect(callArg.statusCode).toBe(400);
    });

    it('should return error for invalid refresh token', async () => {
      const mockRefreshToken = 'invalidRefreshToken';
      req.body.refreshToken = mockRefreshToken;
      
      jest.mock('jsonwebtoken', () => ({
        verify: jest.fn().mockImplementation(() => { throw new Error('Invalid token'); })
      }));

      await refreshToken(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toBe('Invalid refresh token');
      expect(callArg.statusCode).toBe(403);
    });

    it('should return error if user does not exist', async () => {
      const mockRefreshToken = 'refreshToken123';
      req.body.refreshToken = mockRefreshToken;
      
      jest.mock('jsonwebtoken', () => ({
        verify: jest.fn().mockReturnValue({ id: 'userId123' })
      }));
      
      User.findById = jest.fn().mockResolvedValue(null);

      await refreshToken(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toBe('The user belonging to this token no longer exists.');
      expect(callArg.statusCode).toBe(401);
    });

    it('should handle errors during refresh token process', async () => {
      const error = new Error('Database error');
      const mockRefreshToken = 'refreshToken123';
      req.body.refreshToken = mockRefreshToken;
      
      jest.mock('jsonwebtoken', () => ({
        verify: jest.fn().mockReturnValue({ id: 'userId123' })
      }));
      
      User.findById = jest.fn().mockRejectedValue(error);

      await refreshToken(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});