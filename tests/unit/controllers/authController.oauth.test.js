// tests/unit/controllers/authController.oauth.test.js
const { 
  googleAuthCallback, 
  vkAuthCallback, 
  yandexAuthCallback 
} = require('../../../src/controllers/authController');
const User = require('../../../src/models/User');
const { logger } = require('../../../src/logger/logger');
const AppError = require('../../../src/utils/AppError');
const { generateToken } = require('../../../src/utils/jwt');

// Mock dependencies
jest.mock('../../../src/models/User');
jest.mock('../../../src/logger/logger');
jest.mock('../../../src/utils/jwt');

describe('Auth Controller - OAuth Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    
    jest.clearAllMocks();
  });

  describe('googleAuthCallback', () => {
    it('should return token and user data when user is authenticated', async () => {
      const mockUser = {
        _id: 'userId123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        lastLoginAt: null,
        save: jest.fn(),
        oauth: {
          googleId: 'google123'
        }
      };
      
      req.user = mockUser;
      generateToken.mockReturnValue('mockToken');

      await googleAuthCallback(req, res, next);

      expect(generateToken).toHaveBeenCalledWith('userId123', '15m');
      expect(mockUser.lastLoginAt).toBeDefined();
      expect(mockUser.save).toHaveBeenCalledWith({ validateBeforeSave: false });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        token: 'mockToken',
        data: {
          user: mockUser
        }
      });
      // Password should be removed from the user object before sending
      expect(mockUser.password).toBeUndefined();
    });

    it('should call next with error when no user is authenticated', async () => {
      req.user = null;

      await googleAuthCallback(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toBe('Authentication failed');
      expect(callArg.statusCode).toBe(401);
    });

    it('should handle errors during callback process', async () => {
      const error = new Error('Database error');
      req.user = { 
        _id: 'userId123', 
        save: jest.fn().mockRejectedValue(error) 
      };
      generateToken.mockReturnValue('mockToken');

      await googleAuthCallback(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('vkAuthCallback', () => {
    it('should return token and user data for VK authentication', async () => {
      const mockUser = {
        _id: 'userId123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        lastLoginAt: null,
        save: jest.fn(),
        oauth: {
          vkId: 'vk123'
        }
      };
      
      req.user = mockUser;
      generateToken.mockReturnValue('mockToken');

      await vkAuthCallback(req, res, next);

      expect(generateToken).toHaveBeenCalledWith('userId123', '15m');
      expect(mockUser.lastLoginAt).toBeDefined();
      expect(mockUser.save).toHaveBeenCalledWith({ validateBeforeSave: false });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        token: 'mockToken',
        data: {
          user: mockUser
        }
      });
    });

    it('should call next with error when no user for VK authentication', async () => {
      req.user = null;

      await vkAuthCallback(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toBe('Authentication failed');
      expect(callArg.statusCode).toBe(401);
    });
  });

  describe('yandexAuthCallback', () => {
    it('should return token and user data for Yandex authentication', async () => {
      const mockUser = {
        _id: 'userId123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        lastLoginAt: null,
        save: jest.fn(),
        oauth: {
          yandexId: 'yandex123'
        }
      };
      
      req.user = mockUser;
      generateToken.mockReturnValue('mockToken');

      await yandexAuthCallback(req, res, next);

      expect(generateToken).toHaveBeenCalledWith('userId123', '15m');
      expect(mockUser.lastLoginAt).toBeDefined();
      expect(mockUser.save).toHaveBeenCalledWith({ validateBeforeSave: false });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        token: 'mockToken',
        data: {
          user: mockUser
        }
      });
    });

    it('should call next with error when no user for Yandex authentication', async () => {
      req.user = null;

      await yandexAuthCallback(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toBe('Authentication failed');
      expect(callArg.statusCode).toBe(401);
    });
  });
});