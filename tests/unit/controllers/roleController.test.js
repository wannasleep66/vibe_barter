// tests/unit/controllers/roleController.test.js
const roleController = require('../../../src/controllers/roleController');
const Role = require('../../../src/models/Role');
const Permission = require('../../../src/models/Permission');
const User = require('../../../src/models/User');
const rbacService = require('../../../src/services/RbacService');
const { logger } = require('../../../src/logger/logger');

// Mock dependencies
jest.mock('../../../src/models/Role');
jest.mock('../../../src/models/Permission');
jest.mock('../../../src/models/User');
jest.mock('../../../src/services/RbacService');
jest.mock('../../../src/logger/logger');

describe('RoleController Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: null, params: {}, body: {}, query: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    
    jest.clearAllMocks();
    
    logger.info = jest.fn();
    logger.error = jest.fn();
  });

  describe('getAllRoles', () => {
    it('should return all roles successfully', async () => {
      const mockRoles = [
        { _id: 'role1', name: 'admin', description: 'Administrator role' },
        { _id: 'role2', name: 'user', description: 'Regular user role' }
      ];
      
      Role.find = jest.fn().mockReturnThis();
      Role.populate = jest.fn().mockResolvedValue(mockRoles);

      await roleController.getAllRoles(req, res, next);

      expect(Role.find).toHaveBeenCalled();
      expect(Role.populate).toHaveBeenCalledWith('permissions', 'name description resource action');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRoles,
        count: 2
      });
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database error');
      Role.find = jest.fn().mockReturnThis();
      Role.populate = jest.fn().mockRejectedValue(error);

      await roleController.getAllRoles(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getRoleById', () => {
    it('should return role by ID successfully', async () => {
      req.params.id = 'roleId123';
      const mockRole = { _id: 'roleId123', name: 'admin', permissions: [] };
      
      Role.findById = jest.fn().mockReturnThis();
      Role.populate = jest.fn().mockResolvedValue(mockRole);

      await roleController.getRoleById(req, res, next);

      expect(Role.findById).toHaveBeenCalledWith('roleId123');
      expect(Role.populate).toHaveBeenCalledWith('permissions', 'name description resource action');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRole
      });
    });

    it('should return 404 if role not found', async () => {
      req.params.id = 'nonExistentId';
      Role.findById = jest.fn().mockReturnThis();
      Role.populate = jest.fn().mockResolvedValue(null);

      await roleController.getRoleById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Role not found'
      });
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Find role error');
      req.params.id = 'roleId123';
      Role.findById = jest.fn().mockReturnThis();
      Role.populate = jest.fn().mockRejectedValue(error);

      await roleController.getRoleById(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('createRole', () => {
    it('should create a new role successfully', async () => {
      req.body = {
        name: 'testRole',
        description: 'Test role description',
        permissions: ['perm1', 'perm2']
      };

      Role.findOne = jest.fn().mockResolvedValue(null); // Role doesn't exist
      Permission.find = jest.fn().mockResolvedValue([
        { _id: 'perm1', name: 'test.create' },
        { _id: 'perm2', name: 'test.read' }
      ]);
      Role.create = jest.fn().mockResolvedValue({
        _id: 'newRoleId',
        name: 'testRole',
        description: 'Test role description',
        permissions: ['perm1', 'perm2']
      });

      await roleController.createRole(req, res, next);

      expect(Role.findOne).toHaveBeenCalledWith({ name: 'testRole' });
      expect(Permission.find).toHaveBeenCalledWith({ _id: { $in: ['perm1', 'perm2'] } });
      expect(Role.create).toHaveBeenCalledWith({
        name: 'testRole',
        description: 'Test role description',
        permissions: ['perm1', 'perm2']
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ _id: 'newRoleId' }),
        message: 'Role created successfully'
      });
    });

    it('should return 400 if role name already exists', async () => {
      req.body = {
        name: 'admin', // Existing role name
        description: 'Test role description'
      };

      const existingRole = { _id: 'existingId', name: 'admin' };
      Role.findOne = jest.fn().mockResolvedValue(existingRole);

      await roleController.createRole(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Role with this name already exists'
      });
    });

    it('should return 400 if some permissions do not exist', async () => {
      req.body = {
        name: 'testRole',
        description: 'Test role description',
        permissions: ['perm1', 'nonExistentPerm']
      };

      Role.findOne = jest.fn().mockResolvedValue(null); // Role doesn't exist
      Permission.find = jest.fn().mockResolvedValue([{ _id: 'perm1', name: 'test.create' }]); // Only one exists

      await roleController.createRole(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Some permissions do not exist'
      });
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Create role error');
      req.body = {
        name: 'testRole',
        description: 'Test role description'
      };

      Role.findOne = jest.fn().mockRejectedValue(error);

      await roleController.createRole(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('updateRole', () => {
    it('should update role successfully', async () => {
      req.params.id = 'roleId123';
      req.body = {
        name: 'updatedRole',
        description: 'Updated description',
        permissions: ['perm1']
      };

      const mockRole = {
        _id: 'roleId123',
        name: 'oldRole',
        description: 'Old description',
        permissions: [],
        save: jest.fn().mockResolvedValue({ _id: 'roleId123' })
      };

      Role.findById = jest.fn().mockResolvedValue(mockRole);
      Role.findOne = jest.fn().mockResolvedValue(null); // No other role with this name exists
      Role.populate = jest.fn().mockResolvedValue(mockRole);

      await roleController.updateRole(req, res, next);

      expect(mockRole.name).toBe('updatedRole');
      expect(mockRole.description).toBe('Updated description');
      expect(mockRole.permissions).toEqual(['perm1']);
      expect(mockRole.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRole,
        message: 'Role updated successfully'
      });
    });

    it('should return 404 if role not found', async () => {
      req.params.id = 'nonExistentId';
      req.body = { name: 'updatedName' };
      Role.findById = jest.fn().mockResolvedValue(null);

      await roleController.updateRole(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Role not found'
      });
    });

    it('should return 400 if trying to update name to existing role', async () => {
      req.params.id = 'roleId123';
      req.body = { name: 'existingRole' };
      
      const mockRole = { _id: 'roleId123', name: 'oldRole', description: 'desc', permissions: [] };
      const existingRole = { _id: 'differentId', name: 'existingRole' };

      Role.findById = jest.fn().mockResolvedValue(mockRole);
      Role.findOne = jest.fn().mockResolvedValue(existingRole); // Another role already has the new name

      await roleController.updateRole(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Role with this name already exists'
      });
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Update role error');
      req.params.id = 'roleId123';
      req.body = { name: 'updatedName' };
      Role.findById = jest.fn().mockRejectedValue(error);

      await roleController.updateRole(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteRole', () => {
    it('should delete role successfully', async () => {
      req.params.id = 'roleId123';
      const mockRole = { _id: 'roleId123', name: 'testRole' };
      const usersWithRole = []; // No users with this role

      Role.findById = jest.fn().mockResolvedValue(mockRole);
      User.find = jest.fn().mockResolvedValue(usersWithRole);
      Role.findByIdAndDelete = jest.fn().mockResolvedValue(mockRole);

      await roleController.deleteRole(req, res, next);

      expect(Role.findById).toHaveBeenCalledWith('roleId123');
      expect(User.find).toHaveBeenCalledWith({ role: 'testRole' });
      expect(Role.findByIdAndDelete).toHaveBeenCalledWith('roleId123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Role deleted successfully'
      });
    });

    it('should return 404 if role not found', async () => {
      req.params.id = 'nonExistentId';
      Role.findById = jest.fn().mockResolvedValue(null);

      await roleController.deleteRole(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Role not found'
      });
    });

    it('should return 400 if role is assigned to users', async () => {
      req.params.id = 'roleId123';
      const mockRole = { _id: 'roleId123', name: 'admin' };
      const usersWithRole = [{ _id: 'userId123', email: 'user@example.com' }]; // Users have this role

      Role.findById = jest.fn().mockResolvedValue(mockRole);
      User.find = jest.fn().mockResolvedValue(usersWithRole);

      await roleController.deleteRole(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot delete role: it is assigned to existing users'
      });
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Delete role error');
      req.params.id = 'roleId123';
      Role.findById = jest.fn().mockRejectedValue(error);

      await roleController.deleteRole(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getAllPermissions', () => {
    it('should return all permissions successfully', async () => {
      const mockPermissions = [
        { _id: 'perm1', name: 'user.read' },
        { _id: 'perm2', name: 'user.create' }
      ];

      Permission.find = jest.fn().mockResolvedValue(mockPermissions);

      await roleController.getAllPermissions(req, res, next);

      expect(Permission.find).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockPermissions,
        count: 2
      });
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Get permissions error');
      Permission.find = jest.fn().mockRejectedValue(error);

      await roleController.getAllPermissions(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('assignRoleToUser', () => {
    it('should assign role to user successfully', async () => {
      req.body = { userId: 'userId123', roleName: 'moderator' };
      const mockResult = { _id: 'userId123', role: 'moderator' };

      rbacService.assignRoleToUser = jest.fn().mockResolvedValue(mockResult);

      await roleController.assignRoleToUser(req, res, next);

      expect(rbacService.assignRoleToUser).toHaveBeenCalledWith('userId123', 'moderator');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
        message: 'Role moderator assigned to user successfully'
      });
    });

    it('should handle errors from rbacService', async () => {
      const error = new Error('Assign role error');
      req.body = { userId: 'userId123', roleName: 'moderator' };
      rbacService.assignRoleToUser = jest.fn().mockRejectedValue(error);

      await roleController.assignRoleToUser(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('addPermissionToRole', () => {
    it('should add permission to role successfully', async () => {
      req.body = { roleName: 'user', permissionName: 'profile.update' };
      const mockResult = { _id: 'roleId123', name: 'user', permissions: ['profile.update'] };

      rbacService.addPermissionToRole = jest.fn().mockResolvedValue(mockResult);

      await roleController.addPermissionToRole(req, res, next);

      expect(rbacService.addPermissionToRole).toHaveBeenCalledWith('user', 'profile.update');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
        message: 'Permission profile.update added to role user successfully'
      });
    });

    it('should handle errors from rbacService', async () => {
      const error = new Error('Add permission error');
      req.body = { roleName: 'user', permissionName: 'profile.update' };
      rbacService.addPermissionToRole = jest.fn().mockRejectedValue(error);

      await roleController.addPermissionToRole(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getRolePermissions', () => {
    it('should return role permissions successfully', async () => {
      req.params.roleName = 'admin';
      const mockPermissions = [
        { _id: 'perm1', name: 'user.create' },
        { _id: 'perm2', name: 'user.delete' }
      ];

      rbacService.getRolePermissions = jest.fn().mockResolvedValue(mockPermissions);

      await roleController.getRolePermissions(req, res, next);

      expect(rbacService.getRolePermissions).toHaveBeenCalledWith('admin');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockPermissions,
        count: 2
      });
    });

    it('should handle errors from rbacService', async () => {
      const error = new Error('Get role permissions error');
      req.params.roleName = 'admin';
      rbacService.getRolePermissions = jest.fn().mockRejectedValue(error);

      await roleController.getRolePermissions(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});