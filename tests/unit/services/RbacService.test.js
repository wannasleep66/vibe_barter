// tests/unit/services/RbacService.test.js
const rbacService = require('../../../src/services/RbacService');
const Role = require('../../../src/models/Role');
const Permission = require('../../../src/models/Permission');
const User = require('../../../src/models/User');
const { logger } = require('../../../src/logger/logger');

// Mock the models and logger
jest.mock('../../../src/models/Role');
jest.mock('../../../src/models/Permission');
jest.mock('../../../src/models/User');
jest.mock('../../../src/logger/logger');

describe('RbacService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default logger mock
    logger.info = jest.fn();
    logger.warn = jest.fn();
    logger.error = jest.fn();
  });

  describe('createDefaultRolesAndPermissions', () => {
    it('should create default permissions if they do not exist', async () => {
      // Mock that permissions don't exist initially
      Permission.findOne = jest.fn().mockResolvedValue(null);
      Permission.create = jest.fn().mockReturnValue({});

      // Mock that roles don't exist initially
      Role.findOne = jest.fn().mockResolvedValue(null);
      Role.create = jest.fn().mockResolvedValue({ _id: 'roleId123' });
      
      // Mock finding all permissions for admin role
      Permission.find = jest.fn().mockResolvedValue([
        { _id: 'perm1', name: 'user.create' },
        { _id: 'perm2', name: 'user.read' }
      ]);

      await rbacService.createDefaultRolesAndPermissions();

      // Check that permissions were created
      expect(Permission.create).toHaveBeenCalledTimes(expect.arrayContaining([expect.anything()]).length > 0);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Created permission:'));
    });

    it('should create default roles if they do not exist', async () => {
      // Mock that permissions exist
      Permission.findOne = jest.fn().mockResolvedValue({ _id: 'perm123' });
      Permission.find = jest.fn().mockResolvedValue([{ _id: 'perm1' }, { _id: 'perm2' }]);
      
      // Mock that roles don't exist
      Role.findOne = jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      Role.create = jest.fn().mockResolvedValue({ _id: 'roleId123' });

      await rbacService.createDefaultRolesAndPermissions();

      // Check that roles were created
      expect(Role.create).toHaveBeenCalledTimes(3); // user, moderator, admin
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Created role:'));
    });

    it('should update roles if they already exist', async () => {
      const mockExistingRole = {
        _id: 'existingRoleId',
        name: 'user',
        permissions: [],
        save: jest.fn()
      };
      
      // Mock that permissions exist
      Permission.findOne = jest.fn().mockResolvedValue({ _id: 'perm123' });
      Permission.find = jest.fn().mockResolvedValue([{ _id: 'perm1', name: 'profile.read' }]);
      
      // Mock that role exists
      Role.findOne = jest.fn().mockResolvedValueOnce(mockExistingRole);
      Role.populate = jest.fn().mockResolvedValue(mockExistingRole);

      await rbacService.createDefaultRolesAndPermissions();

      // Check that role was updated (saved) instead of created
      expect(mockExistingRole.save).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database error');
      Permission.findOne = jest.fn().mockRejectedValue(error);

      await expect(rbacService.createDefaultRolesAndPermissions())
        .rejects
        .toThrow('Database error');

      expect(logger.error).toHaveBeenCalledWith('Error creating default roles and permissions:', error);
    });
  });

  describe('hasPermission', () => {
    it('should return true if user has required permissions', async () => {
      const mockUser = { _id: 'userId123', role: 'admin' };
      const mockRole = {
        name: 'admin',
        permissions: [{ name: 'user.create' }, { name: 'user.read' }]
      };
      
      User.findById = jest.fn().mockResolvedValue(mockUser);
      Role.findOne = jest.fn().mockResolvedValue(mockRole);
      Role.populate = jest.fn().mockResolvedValue(mockRole);

      const result = await rbacService.hasPermission('userId123', ['user.create']);

      expect(result).toBe(true);
    });

    it('should return true if user has wildcard permission', async () => {
      const mockUser = { _id: 'userId123', role: 'admin' };
      const mockRole = {
        name: 'admin',
        permissions: [{ name: '*' }] // Wildcard permission
      };
      
      User.findById = jest.fn().mockResolvedValue(mockUser);
      Role.findOne = jest.fn().mockResolvedValue(mockRole);
      Role.populate = jest.fn().mockResolvedValue(mockRole);

      const result = await rbacService.hasPermission('userId123', ['any.permission']);

      expect(result).toBe(true);
    });

    it('should return false if user lacks required permissions', async () => {
      const mockUser = { _id: 'userId123', role: 'user' };
      const mockRole = {
        name: 'user',
        permissions: [{ name: 'profile.read' }]
      };
      
      User.findById = jest.fn().mockResolvedValue(mockUser);
      Role.findOne = jest.fn().mockResolvedValue(mockRole);
      Role.populate = jest.fn().mockResolvedValue(mockRole);

      const result = await rbacService.hasPermission('userId123', ['user.delete']);

      expect(result).toBe(false);
    });

    it('should throw error for non-existent user', async () => {
      User.findById = jest.fn().mockResolvedValue(null);

      await expect(rbacService.hasPermission('nonExistentUser', ['user.read']))
        .rejects
        .toThrow('User not found');
    });

    it('should handle errors during permission checking', async () => {
      const error = new Error('Permission check error');
      User.findById = jest.fn().mockRejectedValue(error);

      await expect(rbacService.hasPermission('userId123', ['user.read']))
        .rejects
        .toThrow('Permission check error');
    });
  });

  describe('assignRoleToUser', () => {
    it('should assign role to user successfully', async () => {
      const mockRole = { _id: 'roleId123', name: 'moderator' };
      const mockUser = { 
        _id: 'userId123', 
        role: 'user',
        save: jest.fn()
      };
      
      Role.findOne = jest.fn().mockResolvedValue(mockRole);
      User.findById = jest.fn().mockResolvedValue(mockUser);

      const result = await rbacService.assignRoleToUser('userId123', 'moderator');

      expect(result).toEqual(mockUser);
      expect(mockUser.role).toBe('moderator');
      expect(mockUser.save).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Role moderator assigned to user userId123');
    });

    it('should throw error for non-existent role', async () => {
      Role.findOne = jest.fn().mockResolvedValue(null);

      await expect(rbacService.assignRoleToUser('userId123', 'nonExistentRole'))
        .rejects
        .toThrow('Role not found');
    });

    it('should throw error for non-existent user', async () => {
      const mockRole = { _id: 'roleId123', name: 'moderator' };
      
      Role.findOne = jest.fn().mockResolvedValue(mockRole);
      User.findById = jest.fn().mockResolvedValue(null);

      await expect(rbacService.assignRoleToUser('nonExistentUser', 'moderator'))
        .rejects
        .toThrow('User not found');
    });

    it('should handle errors during role assignment', async () => {
      const error = new Error('Assignment error');
      Role.findOne = jest.fn().mockRejectedValue(error);

      await expect(rbacService.assignRoleToUser('userId123', 'moderator'))
        .rejects
        .toThrow('Assignment error');
    });
  });

  describe('addPermissionToRole', () => {
    it('should add permission to role successfully', async () => {
      const mockPermission = { _id: 'permId123', name: 'user.create' };
      const mockRole = { 
        _id: 'roleId123',
        name: 'user',
        permissions: [],
        save: jest.fn()
      };
      
      Permission.findOne = jest.fn().mockResolvedValue(mockPermission);
      Role.findOne = jest.fn().mockResolvedValue(mockRole);
      Role.populate = jest.fn().mockResolvedValue(mockRole);

      const result = await rbacService.addPermissionToRole('user', 'user.create');

      expect(result.permissions).toContainEqual(mockPermission._id);
      expect(mockRole.save).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Permission user.create added to role user');
    });

    it('should not add permission if already exists', async () => {
      const mockPermission = { _id: 'permId123', name: 'user.create' };
      const mockRole = { 
        _id: 'roleId123',
        name: 'user',
        permissions: [{ name: 'user.create' }], // Already has this permission
        save: jest.fn()
      };
      
      Permission.findOne = jest.fn().mockResolvedValue(mockPermission);
      Role.findOne = jest.fn().mockResolvedValue(mockRole);
      Role.populate = jest.fn().mockResolvedValue(mockRole);

      const result = await rbacService.addPermissionToRole('user', 'user.create');

      expect(mockRole.save).not.toHaveBeenCalled(); // Should not save if already exists
      expect(logger.warn).toHaveBeenCalledWith('Permission user.create is already assigned to role user');
    });

    it('should throw error for non-existent permission', async () => {
      Permission.findOne = jest.fn().mockResolvedValue(null);

      await expect(rbacService.addPermissionToRole('user', 'nonExistentPerm'))
        .rejects
        .toThrow('Permission not found');
    });

    it('should throw error for non-existent role', async () => {
      const mockPermission = { _id: 'permId123', name: 'user.create' };
      
      Permission.findOne = jest.fn().mockResolvedValue(mockPermission);
      Role.findOne = jest.fn().mockResolvedValue(null);

      await expect(rbacService.addPermissionToRole('nonExistentRole', 'user.create'))
        .rejects
        .toThrow('Role not found');
    });

    it('should handle errors during permission addition', async () => {
      const error = new Error('Permission addition error');
      Permission.findOne = jest.fn().mockRejectedValue(error);

      await expect(rbacService.addPermissionToRole('user', 'user.create'))
        .rejects
        .toThrow('Permission addition error');
    });
  });

  describe('getRolePermissions', () => {
    it('should return permissions for a role', async () => {
      const mockRole = {
        _id: 'roleId123',
        name: 'admin',
        permissions: [
          { name: 'user.create', resource: 'user', action: 'create' },
          { name: 'user.read', resource: 'user', action: 'read' }
        ]
      };

      Role.findOne = jest.fn().mockResolvedValue(mockRole);
      Role.populate = jest.fn().mockResolvedValue(mockRole);

      const result = await rbacService.getRolePermissions('admin');

      expect(result).toEqual(mockRole.permissions);
    });

    it('should throw error for non-existent role', async () => {
      Role.findOne = jest.fn().mockResolvedValue(null);

      await expect(rbacService.getRolePermissions('nonExistentRole'))
        .rejects
        .toThrow('Role not found');
    });

    it('should handle errors during permission retrieval', async () => {
      const error = new Error('Permission retrieval error');
      Role.findOne = jest.fn().mockRejectedValue(error);

      await expect(rbacService.getRolePermissions('admin'))
        .rejects
        .toThrow('Permission retrieval error');
    });
  });
});