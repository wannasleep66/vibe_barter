// tests/unit/controllers/authController.registration.test.js
const { register } = require('../../../src/controllers/authController');
const User = require('../../../src/models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { logger } = require('../../../src/logger/logger');
const AppError = require('../../../src/utils/AppError');

// Mock dependencies
jest.mock('../../../src/models/User');
jest.mock('../../../src/logger/logger');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('Auth Controller - Registration Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {
        email: 'test@example.com',
        password: 'TestPass123!',
        firstName: 'John',
        lastName: 'Doe'
      }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    
    // Reset mocks
    jest.clearAllMocks();
  });

  it('should successfully register a new user', async () => {
    const mockUser = {
      _id: 'mockUserId',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      save: jest.fn()
    };
    
    User.findOne = jest.fn().mockResolvedValue(null); // No existing user
    User.create = jest.fn().mockResolvedValue(mockUser);
    jwt.sign = jest.fn().mockReturnValue('mockToken');
    
    await register(req, res, next);
    
    expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(User.create).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'TestPass123!',
      firstName: 'John',
      lastName: 'Doe'
    });
    expect(jwt.sign).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        token: 'mockToken',
        data: expect.objectContaining({
          user: expect.objectContaining({
            _id: 'mockUserId',
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe'
          })
        })
      })
    );
  });

  it('should fail if user with email already exists', async () => {
    const existingUser = {
      _id: 'existingUserId',
      email: 'test@example.com'
    };
    
    User.findOne = jest.fn().mockResolvedValue(existingUser);
    
    await register(req, res, next);
    
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const callArg = next.mock.calls[0][0];
    expect(callArg.message).toBe('User with this email already exists');
    expect(callArg.statusCode).toBe(409);
  });

  it('should handle duplicate key error', async () => {
    const duplicateError = new Error('Duplicate key error');
    duplicateError.code = 11000;
    
    User.findOne = jest.fn().mockResolvedValue(null);
    User.create = jest.fn().mockRejectedValue(duplicateError);
    
    await register(req, res, next);
    
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const callArg = next.mock.calls[0][0];
    expect(callArg.message).toBe('Email already exists');
    expect(callArg.statusCode).toBe(409);
  });

  it('should handle validation errors', async () => {
    const validationError = new Error('Validation error');
    validationError.name = 'ValidationError';
    validationError.errors = {
      email: { message: 'Email is required' },
      password: { message: 'Password is required' }
    };
    
    User.findOne = jest.fn().mockResolvedValue(null);
    User.create = jest.fn().mockRejectedValue(validationError);
    
    await register(req, res, next);
    
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const callArg = next.mock.calls[0][0];
    expect(callArg.message).toContain('Validation error:');
    expect(callArg.statusCode).toBe(400);
  });

  it('should handle generic errors', async () => {
    const genericError = new Error('Generic error');
    
    User.findOne = jest.fn().mockResolvedValue(null);
    User.create = jest.fn().mockRejectedValue(genericError);
    
    await register(req, res, next);
    
    expect(next).toHaveBeenCalledWith(genericError);
  });

  it('should work with different user data', async () => {
    const differentUserData = {
      email: 'another@example.com',
      password: 'AnotherPass456@',
      firstName: 'Jane',
      lastName: 'Smith'
    };
    
    req.body = differentUserData;
    
    const mockUser = {
      _id: 'mockUserId2',
      email: 'another@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      save: jest.fn()
    };
    
    User.findOne = jest.fn().mockResolvedValue(null);
    User.create = jest.fn().mockResolvedValue(mockUser);
    jwt.sign = jest.fn().mockReturnValue('mockToken2');
    
    await register(req, res, next);
    
    expect(User.create).toHaveBeenCalledWith(differentUserData);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});