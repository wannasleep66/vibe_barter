// tests/unit/middleware/auth.jwt.test.js
const { protect } = require('../../../src/middleware/auth');
const User = require('../../../src/models/User');
const { logger } = require('../../../src/logger/logger');
const AppError = require('../../../src/utils/AppError');
const { verifyTokenWithBlacklist, checkPasswordChangedAfterToken } = require('../../../src/utils/jwt');

// Mock dependencies
jest.mock('../../../src/models/User');
jest.mock('../../../src/logger/logger');
jest.mock('../../../src/utils/jwt');

describe('Auth Middleware - JWT Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {}
    };
    res = {};
    next = jest.fn();
    
    jest.clearAllMocks();
  });

  describe('protect middleware', () => {
    it('should call next with error if no token provided', async () => {
      req.headers.authorization = undefined;

      await protect(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toBe('You are not logged in! Please log in to get access.');
      expect(callArg.statusCode).toBe(401);
    });

    it('should call next with error if token is not Bearer', async () => {
      req.headers.authorization = 'InvalidScheme token123';

      await protect(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toBe('You are not logged in! Please log in to get access.');
      expect(callArg.statusCode).toBe(401);
    });

    it('should call next with error if token is blacklisted', async () => {
      const mockToken = 'testToken123';
      req.headers.authorization = `Bearer ${mockToken}`;
      
      verifyTokenWithBlacklist.mockRejectedValue(
        new AppError('Token has been invalidated. Please log in again.', 401)
      );

      await protect(req, res, next);

      expect(verifyTokenWithBlacklist).toHaveBeenCalledWith(mockToken);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toBe('Token has been invalidated. Please log in again.');
      expect(callArg.statusCode).toBe(401);
    });

    it('should call next with error if user not found', async () => {
      const mockToken = 'testToken123';
      req.headers.authorization = `Bearer ${mockToken}`;
      
      verifyTokenWithBlacklist.mockResolvedValue({ id: 'userId123' });
      User.findById = jest.fn().mockResolvedValue(null);

      await protect(req, res, next);

      expect(verifyTokenWithBlacklist).toHaveBeenCalledWith(mockToken);
      expect(User.findById).toHaveBeenCalledWith('userId123');
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toBe('The user belonging to this token no longer exists.');
      expect(callArg.statusCode).toBe(401);
    });

    it('should call next with error if password changed after token issue', async () => {
      const mockToken = 'testToken123';
      req.headers.authorization = `Bearer ${mockToken}`;
      
      verifyTokenWithBlacklist.mockResolvedValue({ id: 'userId123', iat: 1234567890 });
      
      const mockUser = { _id: 'userId123' };
      User.findById = jest.fn().mockResolvedValue(mockUser);
      checkPasswordChangedAfterToken.mockReturnValue(true);

      await protect(req, res, next);

      expect(checkPasswordChangedAfterToken).toHaveBeenCalledWith(mockUser, 1234567890);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toBe('User recently changed password! Please log in again.');
      expect(callArg.statusCode).toBe(401);
    });

    it('should set req.user and call next if all checks pass', async () => {
      const mockToken = 'testToken123';
      req.headers.authorization = `Bearer ${mockToken}`;
      
      verifyTokenWithBlacklist.mockResolvedValue({ id: 'userId123', iat: 1234567890 });
      
      const mockUser = { _id: 'userId123', email: 'test@example.com' };
      User.findById = jest.fn().mockResolvedValue(mockUser);
      checkPasswordChangedAfterToken.mockReturnValue(false);

      await protect(req, res, next);

      expect(verifyTokenWithBlacklist).toHaveBeenCalledWith(mockToken);
      expect(User.findById).toHaveBeenCalledWith('userId123');
      expect(checkPasswordChangedAfterToken).toHaveBeenCalledWith(mockUser, 1234567890);
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalledWith();
    });

    it('should call next with generic error for JWT verification failures', async () => {
      const mockToken = 'testToken123';
      req.headers.authorization = `Bearer ${mockToken}`;
      
      verifyTokenWithBlacklist.mockRejectedValue(new Error('JWT verification failed'));

      await protect(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toBe('Invalid token. Please log in again.');
      expect(callArg.statusCode).toBe(401);
    });
  });
});