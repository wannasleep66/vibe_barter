// tests/unit/controllers/authController.login.test.js
const { login } = require('../../../src/controllers/authController');
const User = require('../../../src/models/User');
const { logger } = require('../../../src/logger/logger');
const AppError = require('../../../src/utils/AppError');

// Mock dependencies
jest.mock('../../../src/models/User');
jest.mock('../../../src/logger/logger');
jest.mock('jsonwebtoken');
jest.mock('../../../src/utils/AppError');

describe('Auth Controller - Login Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      ip: '127.0.0.1'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    
    jest.clearAllMocks();
    
    // Reset the actual module to clear any cached functions
    jest.resetModules();
  });

  it('should successfully login user with correct credentials', async () => {
    const userData = {
      _id: 'userId',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
      isEmailVerified: true,
      isActive: true,
      comparePassword: jest.fn().mockResolvedValue(true),
      save: jest.fn()
    };

    req.body = {
      email: 'test@example.com',
      password: 'ValidPass123!'
    };

    User.findOne = jest.fn().mockResolvedValue(userData);

    await login(req, res, next);

    expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(userData.comparePassword).toHaveBeenCalledWith('ValidPass123!');
    expect(userData.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should fail login with missing email', async () => {
    req.body = {
      password: 'ValidPass123!'
    };

    await login(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const callArg = next.mock.calls[0][0];
    expect(callArg.message).toBe('Please provide email and password!');
    expect(callArg.statusCode).toBe(400);
  });

  it('should fail login with missing password', async () => {
    req.body = {
      email: 'test@example.com'
    };

    await login(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const callArg = next.mock.calls[0][0];
    expect(callArg.message).toBe('Please provide email and password!');
    expect(callArg.statusCode).toBe(400);
  });

  it('should fail login with non-existent user', async () => {
    req.body = {
      email: 'nonexistent@example.com',
      password: 'ValidPass123!'
    };

    User.findOne = jest.fn().mockResolvedValue(null);

    await login(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const callArg = next.mock.calls[0][0];
    expect(callArg.message).toBe('Incorrect email or password');
    expect(callArg.statusCode).toBe(401);

    // Check if logger was called for failed login attempt
    expect(logger.warn).toHaveBeenCalledWith('Failed login attempt for email: nonexistent@example.com from IP: 127.0.0.1');
  });

  it('should fail login with wrong password', async () => {
    const userData = {
      _id: 'userId',
      email: 'test@example.com',
      comparePassword: jest.fn().mockResolvedValue(false)
    };

    req.body = {
      email: 'test@example.com',
      password: 'WrongPass123!'
    };

    User.findOne = jest.fn().mockResolvedValue(userData);

    await login(req, res, next);

    expect(userData.comparePassword).toHaveBeenCalledWith('WrongPass123!');
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const callArg = next.mock.calls[0][0];
    expect(callArg.message).toBe('Incorrect email or password');
    expect(callArg.statusCode).toBe(401);

    // Check if logger was called for failed login attempt
    expect(logger.warn).toHaveBeenCalledWith('Failed login attempt for email: test@example.com from IP: 127.0.0.1');
  });

  it('should fail login for deactivated account', async () => {
    const userData = {
      _id: 'userId',
      email: 'test@example.com',
      isActive: false, // Deactivated account
      comparePassword: jest.fn().mockResolvedValue(true)
    };

    req.body = {
      email: 'test@example.com',
      password: 'ValidPass123!'
    };

    User.findOne = jest.fn().mockResolvedValue(userData);

    await login(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const callArg = next.mock.calls[0][0];
    expect(callArg.message).toBe('This account has been deactivated');
    expect(callArg.statusCode).toBe(401);
  });

  it('should fail login for unverified email', async () => {
    const userData = {
      _id: 'userId',
      email: 'test@example.com',
      isEmailVerified: false, // Unverified email
      isActive: true,
      comparePassword: jest.fn().mockResolvedValue(true)
    };

    req.body = {
      email: 'test@example.com',
      password: 'ValidPass123!'
    };

    User.findOne = jest.fn().mockResolvedValue(userData);

    await login(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const callArg = next.mock.calls[0][0];
    expect(callArg.message).toBe('Please verify your email address before logging in');
    expect(callArg.statusCode).toBe(401);
  });

  it('should update last login time on successful login', async () => {
    const userData = {
      _id: 'userId',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      lastLoginAt: null,
      isEmailVerified: true,
      isActive: true,
      comparePassword: jest.fn().mockResolvedValue(true),
      save: jest.fn()
    };

    req.body = {
      email: 'test@example.com',
      password: 'ValidPass123!'
    };

    User.findOne = jest.fn().mockResolvedValue(userData);

    await login(req, res, next);

    // Check that lastLoginAt was set to current time
    expect(userData.lastLoginAt).toBeDefined();
    // Check that save was called to persist the change
    expect(userData.save).toHaveBeenCalledWith({ validateBeforeSave: false });

    // Check if logger was called for successful login
    expect(logger.info).toHaveBeenCalledWith('Successful login for user: userId from IP: 127.0.0.1');
  });

  it('should handle errors thrown during login', async () => {
    req.body = {
      email: 'test@example.com',
      password: 'ValidPass123!'
    };

    const error = new Error('Database error');
    User.findOne = jest.fn().mockRejectedValue(error);

    await login(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});