// tests/unit/services/UserService.test.js
const UserService = require('../../../src/services/UserService');
const User = require('../../../src/models/User');
const { logger } = require('../../../src/logger/logger');
const AppError = require('../../../src/utils/AppError');

// Mock the User model and logger
jest.mock('../../../src/models/User');
jest.mock('../../../src/logger/logger');

describe('UserService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should successfully create a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPass123!',
        firstName: 'John',
        lastName: 'Doe'
      };

      const mockUser = {
        _id: 'mockId',
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        save: jest.fn().mockResolvedValue(true)
      };

      User.mockImplementation(() => mockUser);
      User.create = jest.fn().mockResolvedValue(mockUser);

      const result = await UserService.createUser(userData);

      expect(User.create).toHaveBeenCalledWith(userData);
      expect(result).toEqual(mockUser);
    });

    it('should handle duplicate email error', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'TestPass123!',
        firstName: 'Jane',
        lastName: 'Doe'
      };

      const duplicateError = new Error('Duplicate key error');
      duplicateError.code = 11000;

      User.mockImplementation(() => ({ save: jest.fn().mockRejectedValue(duplicateError) }));
      User.create = jest.fn().mockRejectedValue(duplicateError);

      await expect(UserService.createUser(userData)).rejects.toThrow(AppError);
      await expect(UserService.createUser(userData)).rejects.toThrow('Email already exists');
    });

    it('should handle general error during creation', async () => {
      const userData = {
        email: 'error@example.com',
        password: 'TestPass123!',
        firstName: 'Error',
        lastName: 'User'
      };

      const generalError = new Error('General error');

      User.mockImplementation(() => ({ save: jest.fn().mockRejectedValue(generalError) }));
      User.create = jest.fn().mockRejectedValue(generalError);

      await expect(UserService.createUser(userData)).rejects.toThrow('Error creating user');
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const email = 'find@example.com';
      const mockUser = {
        _id: 'mockId',
        email: email,
        firstName: 'Find',
        lastName: 'User'
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);

      const result = await UserService.findByEmail(email);

      expect(User.findOne).toHaveBeenCalledWith({ email: email });
      expect(result).toEqual(mockUser);
    });

    it('should handle error during email lookup', async () => {
      const email = 'error@example.com';
      const error = new Error('Database error');

      User.findOne = jest.fn().mockRejectedValue(error);

      await expect(UserService.findByEmail(email)).rejects.toThrow('Error finding user');
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const mockUser = {
        _id: userId,
        email: 'findid@example.com',
        firstName: 'Find',
        lastName: 'User'
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);

      const result = await UserService.findById(userId);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockUser);
    });

    it('should handle error during ID lookup', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const error = new Error('Database error');

      User.findById = jest.fn().mockRejectedValue(error);

      await expect(UserService.findById(userId)).rejects.toThrow('Error finding user');
    });
  });

  describe('updateUser', () => {
    it('should successfully update user', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name'
      };
      
      const mockUpdatedUser = {
        _id: userId,
        email: 'update@example.com',
        firstName: 'Updated',
        lastName: 'Name'
      };

      User.findByIdAndUpdate = jest.fn().mockResolvedValue(mockUpdatedUser);

      const result = await UserService.updateUser(userId, updateData);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        userId,
        updateData,
        { new: true, runValidators: true }
      );
      expect(result).toEqual(mockUpdatedUser);
    });

    it('should throw error if user not found', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name'
      };

      User.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

      await expect(UserService.updateUser(userId, updateData)).rejects.toThrow('User not found');
    });

    it('should handle validation error during update', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name'
      };

      const validationError = new Error('Validation error');
      validationError.name = 'ValidationError';

      User.findByIdAndUpdate = jest.fn().mockRejectedValue(validationError);

      await expect(UserService.updateUser(userId, updateData)).rejects.toThrow('Validation error:');
    });

    it('should handle general error during update', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name'
      };

      const generalError = new Error('General error');

      User.findByIdAndUpdate = jest.fn().mockRejectedValue(generalError);

      await expect(UserService.updateUser(userId, updateData)).rejects.toThrow('Error updating user');
    });
  });

  describe('deleteUser', () => {
    it('should successfully delete user', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const mockDeletedUser = {
        _id: userId,
        email: 'delete@example.com',
        firstName: 'Delete',
        lastName: 'User'
      };

      User.findByIdAndDelete = jest.fn().mockResolvedValue(mockDeletedUser);

      const result = await UserService.deleteUser(userId);

      expect(User.findByIdAndDelete).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockDeletedUser);
    });

    it('should throw error if user not found for deletion', async () => {
      const userId = '507f1f77bcf86cd799439011';

      User.findByIdAndDelete = jest.fn().mockResolvedValue(null);

      await expect(UserService.deleteUser(userId)).rejects.toThrow('User not found');
    });

    it('should handle general error during deletion', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const generalError = new Error('General error');

      User.findByIdAndDelete = jest.fn().mockRejectedValue(generalError);

      await expect(UserService.deleteUser(userId)).rejects.toThrow('Error deleting user');
    });
  });

  describe('getAllUsers', () => {
    it('should get all users with default pagination', async () => {
      const mockUsers = [
        { _id: '1', email: 'user1@example.com', firstName: 'User', lastName: 'One' },
        { _id: '2', email: 'user2@example.com', firstName: 'User', lastName: 'Two' }
      ];

      User.find = jest.fn().mockReturnThis();
      User.populate = jest.fn().mockReturnThis();
      User.skip = jest.fn().mockReturnThis();
      User.limit = jest.fn().mockReturnThis();
      User.sort = jest.fn().mockResolvedValue(mockUsers);
      User.countDocuments = jest.fn().mockResolvedValue(2);

      const result = await UserService.getAllUsers();

      expect(User.find).toHaveBeenCalled();
      expect(User.populate).toHaveBeenCalledWith('profile');
      expect(User.skip).toHaveBeenCalledWith(0);
      expect(User.limit).toHaveBeenCalledWith(10);
      expect(User.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result.users).toEqual(mockUsers);
      expect(result.pagination.total).toBe(2);
    });

    it('should get all users with custom pagination', async () => {
      const mockUsers = [
        { _id: '1', email: 'user1@example.com', firstName: 'User', lastName: 'One' }
      ];

      User.find = jest.fn().mockReturnThis();
      User.populate = jest.fn().mockReturnThis();
      User.skip = jest.fn().mockReturnThis();
      User.limit = jest.fn().mockReturnThis();
      User.sort = jest.fn().mockResolvedValue(mockUsers);
      User.countDocuments = jest.fn().mockResolvedValue(1);

      const result = await UserService.getAllUsers(2, 1); // page 2, limit 1

      expect(User.skip).toHaveBeenCalledWith(1); // (page-1)*limit = (2-1)*1 = 1
      expect(User.limit).toHaveBeenCalledWith(1);
    });

    it('should handle error during getting all users', async () => {
      const error = new Error('Database error');

      User.find = jest.fn().mockReturnThis();
      User.populate = jest.fn().mockReturnThis();
      User.skip = jest.fn().mockReturnThis();
      User.limit = jest.fn().mockReturnThis();
      User.sort = jest.fn().mockRejectedValue(error);

      await expect(UserService.getAllUsers()).rejects.toThrow('Error retrieving users');
    });
  });

  describe('getFilteredUsers', () => {
    it('should get filtered users', async () => {
      const filter = { role: 'user' };
      const mockUsers = [
        { _id: '1', email: 'user1@example.com', firstName: 'User', lastName: 'One', role: 'user' }
      ];

      User.find = jest.fn().mockReturnThis();
      User.populate = jest.fn().mockReturnThis();
      User.skip = jest.fn().mockReturnThis();
      User.limit = jest.fn().mockReturnThis();
      User.sort = jest.fn().mockResolvedValue(mockUsers);
      User.countDocuments = jest.fn().mockResolvedValue(1);

      const result = await UserService.getFilteredUsers(filter);

      expect(User.find).toHaveBeenCalledWith(filter);
      expect(result.users).toEqual(mockUsers);
      expect(result.pagination.total).toBe(1);
    });

    it('should handle error during getting filtered users', async () => {
      const filter = { role: 'user' };
      const error = new Error('Database error');

      User.find = jest.fn().mockReturnThis();
      User.populate = jest.fn().mockReturnThis();
      User.skip = jest.fn().mockReturnThis();
      User.limit = jest.fn().mockReturnThis();
      User.sort = jest.fn().mockRejectedValue(error);

      await expect(UserService.getFilteredUsers(filter)).rejects.toThrow('Error retrieving users');
    });
  });
});