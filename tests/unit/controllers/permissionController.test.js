// tests/unit/controllers/permissionController.test.js
const permissionController = require('../../../src/controllers/permissionController');
const Permission = require('../../../src/models/Permission');
const Role = require('../../../src/models/Role');
const AppError = require('../../../src/utils/AppError');

// Mock dependencies
jest.mock('../../../src/models/Permission');
jest.mock('../../../src/models/Role');
jest.mock('../../../src/logger/logger');

describe('Permission Controller Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn()
    };
    next = jest.fn();
    
    jest.clearAllMocks();
  });

  describe('getAllPermissions', () => {
    it('should return all permissions with pagination', async () => {
      req.query = { page: 1, limit: 10 };
      const mockPermissions = [
        { _id: 'perm1', name: 'user.create', resource: 'user', action: 'create' },
        { _id: 'perm2', name: 'user.read', resource: 'user', action: 'read' }
      ];
      const mockCount = 2;

      Permission.find = jest.fn().mockReturnThis();
      Permission.sort = jest.fn().mockReturnThis();
      Permission.skip = jest.fn().mockReturnThis();
      Permission.limit = jest.fn().mockResolvedValue(mockPermissions);
      Permission.countDocuments = jest.fn().mockResolvedValue(mockCount);

      await permissionController.getAllPermissions(req, res, next);

      expect(Permission.find).toHaveBeenCalled();
      expect(Permission.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(Permission.skip).toHaveBeenCalledWith(0);
      expect(Permission.limit).toHaveBeenCalledWith(10);
      expect(Permission.countDocuments).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockPermissions
        })
      );
    });

    it('should apply filters correctly', async () => {
      req.query = { search: 'user', resource: 'user', action: 'read', isActive: 'true' };
      const mockPermissions = [
        { _id: 'perm1', name: 'user.read', resource: 'user', action: 'read' }
      ];
      const mockCount = 1;

      Permission.find = jest.fn().mockReturnThis();
      Permission.sort = jest.fn().mockReturnThis();
      Permission.skip = jest.fn().mockReturnThis();
      Permission.limit = jest.fn().mockResolvedValue(mockPermissions);
      Permission.countDocuments = jest.fn().mockResolvedValue(mockCount);

      await permissionController.getAllPermissions(req, res, next);

      expect(Permission.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.any(Array),
          resource: 'user',
          action: 'read',
          isActive: true
        })
      );
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      Permission.find = jest.fn().mockReturnThis();
      Permission.sort = jest.fn().mockReturnThis();
      Permission.skip = jest.fn().mockReturnThis();
      Permission.limit = jest.fn().mockRejectedValue(error);

      await permissionController.getAllPermissions(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getPermissionById', () => {
    it('should return permission by ID', async () => {
      req.params.id = 'validId123';
      const mockPermission = { _id: 'validId123', name: 'user.read', resource: 'user', action: 'read' };
      Permission.findById = jest.fn().mockResolvedValue(mockPermission);

      await permissionController.getPermissionById(req, res, next);

      expect(Permission.findById).toHaveBeenCalledWith('validId123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockPermission
      });
    });

    it('should return 404 if permission not found', async () => {
      req.params.id = 'validId123';
      Permission.findById = jest.fn().mockResolvedValue(null);

      await permissionController.getPermissionById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Permission not found'
      });
    });

    it('should handle invalid ObjectId error', async () => {
      req.params.id = 'invalidId';
      const castError = new Error('Cast error');
      castError.name = 'CastError';
      Permission.findById = jest.fn().mockRejectedValue(castError);

      await permissionController.getPermissionById(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toContain('Invalid permission ID format');
      expect(callArg.statusCode).toBe(400);
    });

    it('should handle other errors', async () => {
      const error = new Error('Database error');
      req.params.id = 'validId123';
      Permission.findById = jest.fn().mockRejectedValue(error);

      await permissionController.getPermissionById(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('createPermission', () => {
    it('should create a new permission successfully', async () => {
      req.body = {
        name: 'test.create',
        description: 'Test create permission',
        resource: 'test',
        action: 'create'
      };
      const mockPermission = { 
        _id: 'newId123', 
        name: 'test.create', 
        description: 'Test create permission',
        resource: 'test',
        action: 'create',
        save: jest.fn().mockResolvedValue(true)
      };
      Permission.findOne = jest.fn().mockResolvedValue(null); // No duplicate
      Permission.create = jest.fn().mockResolvedValue(mockPermission);

      await permissionController.createPermission(req, res, next);

      expect(Permission.findOne).toHaveBeenCalledWith({ name: 'test.create' });
      expect(Permission.create).toHaveBeenCalledWith({
        name: 'test.create',
        description: 'Test create permission',
        resource: 'test',
        action: 'create'
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockPermission,
        message: 'Permission created successfully'
      });
    });

    it('should fail if permission name already exists', async () => {
      req.body = {
        name: 'duplicate.create',
        description: 'Duplicate permission',
        resource: 'duplicate',
        action: 'create'
      };
      const existingPermission = { _id: 'existingId123', name: 'duplicate.create' };
      Permission.findOne = jest.fn().mockResolvedValue(existingPermission);

      await permissionController.createPermission(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toContain('already exists');
      expect(callArg.statusCode).toBe(409);
    });

    it('should handle duplicate key error', async () => {
      req.body = {
        name: 'unique.create',
        description: 'Unique permission',
        resource: 'unique',
        action: 'create'
      };
      const duplicateError = new Error('Duplicate key error');
      duplicateError.code = 11000;
      Permission.findOne = jest.fn().mockResolvedValue(null); // No duplicate found
      Permission.create = jest.fn().mockRejectedValue(duplicateError);

      await permissionController.createPermission(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toContain('already exists');
      expect(callArg.statusCode).toBe(409);
    });

    it('should handle other errors', async () => {
      const error = new Error('Database error');
      req.body = {
        name: 'error.create',
        description: 'Error permission',
        resource: 'error',
        action: 'create'
      };
      Permission.findOne = jest.fn().mockResolvedValue(null);
      Permission.create = jest.fn().mockRejectedValue(error);

      await permissionController.createPermission(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('updatePermission', () => {
    it('should update permission successfully', async () => {
      req.params.id = 'validId123';
      req.body = {
        name: 'updated.name',
        description: 'Updated description'
      };
      const mockPermission = {
        _id: 'validId123',
        name: 'old.name',
        description: 'Old description',
        resource: 'test',
        action: 'read',
        save: jest.fn().mockResolvedValue(true)
      };
      Permission.findById = jest.fn().mockResolvedValue(mockPermission);
      Permission.findOne = jest.fn().mockResolvedValue(null); // No duplicate name

      await permissionController.updatePermission(req, res, next);

      expect(Permission.findById).toHaveBeenCalledWith('validId123');
      expect(mockPermission.name).toBe('updated.name');
      expect(mockPermission.description).toBe('Updated description');
      expect(mockPermission.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockPermission,
        message: 'Permission updated successfully'
      });
    });

    it('should fail if permission not found', async () => {
      req.params.id = 'validId123';
      req.body = { name: 'updated.name' };
      Permission.findById = jest.fn().mockResolvedValue(null);

      await permissionController.updatePermission(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toBe('Permission not found');
      expect(callArg.statusCode).toBe(404);
    });

    it('should fail if permission name already exists', async () => {
      req.params.id = 'validId123';
      req.body = { name: 'existing.name' };
      const mockPermission = {
        _id: 'validId123',
        name: 'old.name',
        description: 'Old description',
        save: jest.fn()
      };
      const existingSameName = { _id: 'otherId123', name: 'existing.name' };
      Permission.findById = jest.fn().mockResolvedValue(mockPermission);
      Permission.findOne = jest.fn().mockResolvedValue(existingSameName); // Found existing with same name

      await permissionController.updatePermission(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toContain('already exists');
      expect(callArg.statusCode).toBe(409);
    });

    it('should handle duplicate key error', async () => {
      const duplicateError = new Error('Duplicate key error');
      duplicateError.code = 11000;
      req.params.id = 'validId123';
      req.body = { name: 'error.name' };
      const mockPermission = {
        _id: 'validId123',
        name: 'old.name',
        save: jest.fn().mockRejectedValue(duplicateError)
      };
      Permission.findById = jest.fn().mockResolvedValue(mockPermission);
      Permission.findOne = jest.fn().mockResolvedValue(null); // No conflict with name

      await permissionController.updatePermission(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toContain('already exists');
      expect(callArg.statusCode).toBe(409);
    });

    it('should handle other errors', async () => {
      const error = new Error('Database error');
      req.params.id = 'validId123';
      req.body = { name: 'error.name' };
      const mockPermission = {
        _id: 'validId123',
        name: 'old.name',
        save: jest.fn().mockRejectedValue(error)
      };
      Permission.findById = jest.fn().mockResolvedValue(mockPermission);
      Permission.findOne = jest.fn().mockResolvedValue(null);

      await permissionController.updatePermission(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('deletePermission', () => {
    it('should delete permission successfully if not assigned to roles', async () => {
      req.params.id = 'validId123';
      const mockPermission = { _id: 'validId123', name: 'test.delete' };
      const mockRoles = []; // Empty array means no roles have this permission
      
      Permission.findById = jest.fn().mockResolvedValue(mockPermission);
      Role.find = jest.fn().mockResolvedValue(mockRoles);
      Permission.findByIdAndDelete = jest.fn().mockResolvedValue(mockPermission);

      await permissionController.deletePermission(req, res, next);

      expect(Permission.findById).toHaveBeenCalledWith('validId123');
      expect(Role.find).toHaveBeenCalledWith({ permissions: mockPermission._id });
      expect(Permission.findByIdAndDelete).toHaveBeenCalledWith('validId123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Permission deleted successfully'
      });
    });

    it('should fail to delete permission if assigned to roles', async () => {
      req.params.id = 'validId123';
      const mockPermission = { _id: 'validId123', name: 'test.delete' };
      const mockRoles = [
        { _id: 'roleId123', name: 'admin', permissions: [mockPermission._id] }
      ]; // Roles have this permission
      
      Permission.findById = jest.fn().mockResolvedValue(mockPermission);
      Role.find = jest.fn().mockResolvedValue(mockRoles);

      await permissionController.deletePermission(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toContain('cannot be deleted');
      expect(callArg.statusCode).toBe(400);
    });

    it('should return 404 if permission not found', async () => {
      req.params.id = 'validId123';
      Permission.findById = jest.fn().mockResolvedValue(null);

      await permissionController.deletePermission(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toBe('Permission not found');
      expect(callArg.statusCode).toBe(404);
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      req.params.id = 'validId123';
      Permission.findById = jest.fn().mockRejectedValue(error);

      await permissionController.deletePermission(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getPermissionsByResource', () => {
    it('should return permissions for a specific resource', async () => {
      req.params.resource = 'user';
      const mockPermissions = [
        { _id: 'perm1', name: 'user.create', resource: 'user', action: 'create' },
        { _id: 'perm2', name: 'user.read', resource: 'user', action: 'read' }
      ];

      Permission.find = jest.fn().mockResolvedValue(mockPermissions);

      await permissionController.getPermissionsByResource(req, res, next);

      expect(Permission.find).toHaveBeenCalledWith({ 
        resource: { $regex: 'user', $options: 'i' },
        isActive: true 
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockPermissions,
        count: 2
      });
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      req.params.resource = 'user';
      Permission.find = jest.fn().mockRejectedValue(error);

      await permissionController.getPermissionsByResource(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getAvailableResources', () => {
    it('should return all available resources', async () => {
      const mockResources = ['user', 'article', 'ad'];
      const mockCount = 3;

      Permission.distinct = jest.fn().mockResolvedValue(mockResources);

      await permissionController.getAvailableResources(req, res, next);

      expect(Permission.distinct).toHaveBeenCalledWith('resource', { isActive: true });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResources,
        count: mockResources.length
      });
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      Permission.distinct = jest.fn().mockRejectedValue(error);

      await permissionController.getAvailableResources(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getAvailableActions', () => {
    it('should return all available actions', async () => {
      const mockActions = ['create', 'read', 'update', 'delete'];
      const mockCount = 4;

      Permission.distinct = jest.fn().mockResolvedValue(mockActions);

      await permissionController.getAvailableActions(req, res, next);

      expect(Permission.distinct).toHaveBeenCalledWith('action', { isActive: true });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockActions,
        count: mockActions.length
      });
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      Permission.distinct = jest.fn().mockRejectedValue(error);

      await permissionController.getAvailableActions(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});