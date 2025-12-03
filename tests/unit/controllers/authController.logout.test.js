// tests/unit/controllers/authController.logout.test.js
const { logout } = require('../../../src/controllers/authController');
const User = require('../../../src/models/User');
const { logger } = require('../../../src/logger/logger');
const AppError = require('../../../src/utils/AppError');
const { blacklistToken } = require('../../../src/utils/jwt');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('../../../src/models/User');
jest.mock('../../../src/logger/logger');
jest.mock('../../../src/utils/jwt');
jest.mock('jsonwebtoken');

describe('Auth Controller - Logout Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      session: {
        destroy: jest.fn()
      },
      logout: jest.fn()
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    
    jest.clearAllMocks();
  });

  it('should blacklist token and destroy session when token provided', async () => {
    const mockToken = 'validToken123';
    req.headers.authorization = `Bearer ${mockToken}`;
    req.session.destroy = jest.fn((cb) => cb(null)); // Simulate successful session destruction
    req.logout = jest.fn((cb) => cb(null)); // Simulate successful Passport logout

    jwt.decode = jest.fn().mockReturnValue({ id: 'userId123' });
    blacklistToken.mockResolvedValue({});

    await logout(req, res, next);

    expect(jwt.decode).toHaveBeenCalledWith(mockToken);
    expect(blacklistToken).toHaveBeenCalledWith(mockToken, 'userId123', 'access');
    expect(req.session.destroy).toHaveBeenCalled();
    expect(req.logout).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Logged out successfully'
    });
  });

  it('should handle logout without token', async () => {
    req.headers.authorization = undefined;
    req.session.destroy = jest.fn((cb) => cb(null));
    req.logout = jest.fn((cb) => cb(null));

    await logout(req, res, next);

    expect(blacklistToken).not.toHaveBeenCalled();
    expect(req.session.destroy).toHaveBeenCalled();
    expect(req.logout).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Logged out successfully'
    });
  });

  it('should handle session destruction error gracefully', async () => {
    const mockToken = 'validToken123';
    req.headers.authorization = `Bearer ${mockToken}`;
    req.session.destroy = jest.fn((cb) => cb(new Error('Session destroy error')));
    req.logout = jest.fn((cb) => cb(null));

    jwt.decode = jest.fn().mockReturnValue({ id: 'userId123' });
    blacklistToken.mockResolvedValue({});

    await logout(req, res, next);

    expect(logger.error).toHaveBeenCalledWith('Error destroying session during logout:', expect.any(Error));
    expect(blacklistToken).toHaveBeenCalledWith(mockToken, 'userId123', 'access');
    expect(req.session.destroy).toHaveBeenCalled();
    expect(req.logout).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should handle Passport logout error gracefully', async () => {
    const mockToken = 'validToken123';
    req.headers.authorization = `Bearer ${mockToken}`;
    req.session.destroy = jest.fn((cb) => cb(null));
    req.logout = jest.fn((cb) => cb(new Error('Passport logout error')));

    jwt.decode = jest.fn().mockReturnValue({ id: 'userId123' });
    blacklistToken.mockResolvedValue({});

    await logout(req, res, next);

    expect(logger.error).toHaveBeenCalledWith('Error logging out from Passport:', expect.any(Error));
    expect(blacklistToken).toHaveBeenCalledWith(mockToken, 'userId123', 'access');
    expect(req.session.destroy).toHaveBeenCalled();
    expect(req.logout).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should handle token decode error gracefully', async () => {
    const mockToken = 'invalidToken123';
    req.headers.authorization = `Bearer ${mockToken}`;
    req.session.destroy = jest.fn((cb) => cb(null));
    req.logout = jest.fn((cb) => cb(null));

    jwt.decode = jest.fn().mockImplementation(() => { throw new Error('Invalid token'); });

    await logout(req, res, next);

    expect(logger.warn).toHaveBeenCalledWith('Could not decode token during logout:', 'Invalid token');
    expect(blacklistToken).not.toHaveBeenCalled();
    expect(req.session.destroy).toHaveBeenCalled();
    expect(req.logout).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should handle token with no user ID gracefully', async () => {
    const mockToken = 'validToken123';
    req.headers.authorization = `Bearer ${mockToken}`;
    req.session.destroy = jest.fn((cb) => cb(null));
    req.logout = jest.fn((cb) => cb(null));

    jwt.decode = jest.fn().mockReturnValue({}); // No id property

    await logout(req, res, next);

    expect(blacklistToken).not.toHaveBeenCalled();
    expect(req.session.destroy).toHaveBeenCalled();
    expect(req.logout).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should handle errors during logout process', async () => {
    const error = new Error('Logout error');
    req.session.destroy = jest.fn((cb) => cb(error));
    req.logout = jest.fn((cb) => cb(null));

    await logout(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('should handle logout when session object is missing', async () => {
    req.headers.authorization = undefined;
    req.session = undefined; // Session might be undefined in some cases
    req.logout = jest.fn((cb) => cb(null));

    await logout(req, res, next);

    expect(logger.error).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Logged out successfully'
    });
  });

  it('should handle logout when Passport logout method is missing', async () => {
    req.headers.authorization = undefined;
    req.session.destroy = jest.fn((cb) => cb(null));
    req.logout = undefined; // Passport logout might be undefined

    await logout(req, res, next);

    expect(logger.error).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Logged out successfully'
    });
  });
});