// tests/unit/controllers/userController.test.js
const userController = require('../../../src/controllers/userController');
const userService = require('../../../src/services/UserService');
const { logger } = require('../../../src/logger/logger');
const AppError = require('../../../src/utils/AppError');

// Mock the userService and logger
jest.mock('../../../src/services/UserService');
jest.mock('../../../src/logger/logger');

describe('UserController Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: { id: 'adminId', role: 'admin' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should successfully create a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user'
      };

      req.body = userData;
      const mockUser = { ...userData, _id: 'mockId' };

      userService.createUser = jest.fn().mockResolvedValue(mockUser);

      await userController.createUser(req, res, next);

      expect(userService.createUser).toHaveBeenCalledWith({
        ...userData,
        password: userData.password,
        role: userData.role
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser,
        message: 'User created successfully'
      });
    });

    it('should create user with default role if not admin', async () => {
      req.user = { id: 'regularId', role: 'user' };
      const userData = {
        email: 'test@example.com',
        password: 'TestPass123!',
        firstName: 'John',
        lastName: 'Doe'
      };
      
      req.body = userData;
      const mockUser = { ...userData, _id: 'mockId', role: 'user' };

      userService.createUser = jest.fn().mockResolvedValue(mockUser);

      await userController.createUser(req, res, next);

      expect(userService.createUser).toHaveBeenCalledWith({
        ...userData,
        password: userData.password,
        role: 'user' // Default role should be assigned
      });
    });

    it('should handle errors during user creation', async () => {
      const userData = {
        email: 'error@example.com',
        password: 'TestPass123!',
        firstName: 'Error',
        lastName: 'User'
      };
      
      req.body = userData;
      const error = new Error('Creation error');

      userService.createUser = jest.fn().mockRejectedValue(error);

      await userController.createUser(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getAllUsers', () => {
    it('should get all users with default pagination', async () => {
      const mockUsers = [
        { _id: '1', email: 'user1@example.com', firstName: 'User', lastName: 'One' }
      ];
      const mockResult = {
        users: mockUsers,
        pagination: { page: 1, limit: 10, total: 1, pages: 1 }
      };

      req.query = {};
      userService.getFilteredUsers = jest.fn().mockResolvedValue(mockResult);

      await userController.getAllUsers(req, res, next);

      expect(userService.getFilteredUsers).toHaveBeenCalledWith({}, 1, 10);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUsers,
        pagination: mockResult.pagination,
        filters: { search: undefined, role: undefined, isActive: undefined }
      });
    });

    it('should get filtered users', async () => {
      const mockUsers = [
        { _id: '1', email: 'user1@example.com', firstName: 'User', lastName: 'One', role: 'user' }
      ];
      const mockResult = {
        users: mockUsers,
        pagination: { page: 1, limit: 10, total: 1, pages: 1 }
      };
      const filter = { role: 'user' };

      req.query = { role: 'user' };
      userService.getFilteredUsers = jest.fn().mockResolvedValue(mockResult);

      await userController.getAllUsers(req, res, next);

      expect(userService.getFilteredUsers).toHaveBeenCalledWith(filter, 1, 10);
    });

    it('should handle errors during getting all users', async () => {
      const error = new Error('Get all error');

      req.query = {};
      userService.getFilteredUsers = jest.fn().mockRejectedValue(error);

      await userController.getAllUsers(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getUserById', () => {
    it('should get user by ID', async () => {
      const mockUser = { _id: 'userId', email: 'user@example.com', firstName: 'Test', lastName: 'User' };

      req.params.id = 'userId';
      userService.findById = jest.fn().mockResolvedValue(mockUser);

      await userController.getUserById(req, res, next);

      expect(userService.findById).toHaveBeenCalledWith('userId');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser
      });
    });

    it('should return 404 if user not found', async () => {
      req.params.id = 'userId';
      userService.findById = jest.fn().mockResolvedValue(null);

      await userController.getUserById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
    });

    it('should handle errors during user lookup', async () => {
      const error = new Error('Find error');

      req.params.id = 'userId';
      userService.findById = jest.fn().mockRejectedValue(error);

      await userController.getUserById(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        email: 'updated@example.com'
      };
      const mockUpdatedUser = { _id: 'userId', ...updateData };

      req.params.id = 'userId';
      req.body = updateData;
      userService.updateUser = jest.fn().mockResolvedValue(mockUpdatedUser);

      await userController.updateUser(req, res, next);

      expect(userService.updateUser).toHaveBeenCalledWith('userId', updateData);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedUser,
        message: 'User updated successfully'
      });
    });

    it('should handle admin updating role and email verification', async () => {
      const updateData = {
        firstName: 'Updated',
        role: 'admin',
        isEmailVerified: true
      };
      const expectedUpdateData = {
        firstName: 'Updated',
        role: 'admin',
        isEmailVerified: true
      };
      const mockUpdatedUser = { _id: 'userId', ...expectedUpdateData };

      req.params.id = 'userId';
      req.body = updateData;
      req.user = { id: 'adminId', role: 'admin' }; // Admin user
      userService.updateUser = jest.fn().mockResolvedValue(mockUpdatedUser);

      await userController.updateUser(req, res, next);

      expect(userService.updateUser).toHaveBeenCalledWith('userId', expectedUpdateData);
    });

    it('should not allow non-admin to update role', async () => {
      const updateData = {
        firstName: 'Updated',
        role: 'admin', // This should be ignored
        email: 'updated@example.com'
      };
      const expectedUpdateData = {
        firstName: 'Updated',
        email: 'updated@example.com'
      };
      const mockUpdatedUser = { _id: 'userId', ...expectedUpdateData };

      req.params.id = 'userId';
      req.body = updateData;
      req.user = { id: 'regularId', role: 'user' }; // Regular user
      userService.updateUser = jest.fn().mockResolvedValue(mockUpdatedUser);

      await userController.updateUser(req, res, next);

      expect(userService.updateUser).toHaveBeenCalledWith('userId', expectedUpdateData);
    });

    it('should handle errors during user update', async () => {
      const error = new Error('Update error');

      req.params.id = 'userId';
      req.body = { firstName: 'Updated' };
      userService.updateUser = jest.fn().mockRejectedValue(error);

      await userController.updateUser(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const mockDeletedUser = { _id: 'userId', email: 'deleted@example.com', firstName: 'Deleted', lastName: 'User' };

      req.params.id = 'userId';
      userService.deleteUser = jest.fn().mockResolvedValue(mockDeletedUser);

      await userController.deleteUser(req, res, next);

      expect(userService.deleteUser).toHaveBeenCalledWith('userId');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockDeletedUser,
        message: 'User deleted successfully'
      });
    });

    it('should handle errors during user deletion', async () => {
      const error = new Error('Delete error');

      req.params.id = 'userId';
      userService.deleteUser = jest.fn().mockRejectedValue(error);

      await userController.deleteUser(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});