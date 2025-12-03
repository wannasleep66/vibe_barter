// tests/unit/controllers/authController.test.js
const { register, login, protect, restrictTo } = require('../../../src/controllers/authController');
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

describe('Auth Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      headers: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const mockUser = {
        _id: 'mockUserId',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        save: jest.fn()
      };
      
      req.body = {
        email: 'test@example.com',
        password: 'testPassword123',
        firstName: 'John',
        lastName: 'Doe'
      };
      
      User.mockImplementation(() => mockUser);
      jwt.sign = jest.fn().mockReturnValue('mockToken');
      
      await register(req, res, next);
      
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

    it('should handle registration errors', async () => {
      const error = new Error('Registration failed');
      req.body = {
        email: 'test@example.com',
        password: 'testPassword123',
        firstName: 'John',
        lastName: 'Doe'
      };
      
      User.mockImplementation(() => {
        throw error;
      });
      
      await register(req, res, next);
      
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('login', () => {
    it('should login a user with correct credentials', async () => {
      const mockUser = {
        _id: 'mockUserId',
        email: 'test@example.com',
        password: 'hashedPassword',
        comparePassword: jest.fn().mockResolvedValue(true)
      };
      
      req.body = {
        email: 'test@example.com',
        password: 'correctPassword'
      };
      
      User.findOne = jest.fn().mockResolvedValue(mockUser);
      jwt.sign = jest.fn().mockReturnValue('mockToken');
      
      await login(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          token: 'mockToken'
        })
      );
    });

    it('should fail to login with incorrect credentials', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'wrongPassword'
      };
      
      User.findOne = jest.fn().mockResolvedValue({
        comparePassword: jest.fn().mockResolvedValue(false)
      });
      
      await login(req, res, next);
      
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });
  });
});