// tests/unit/middleware/rbac.test.js
const { requirePermissions, checkResourcePermission, isAdmin, isModeratorOrAdmin } = require('../../../src/middleware/rbac');
const Role = require('../../../src/models/Role');
const User = require('../../../src/models/User');
const { logger } = require('../../../src/logger/logger');
const AppError = require('../../../src/utils/AppError');

// Mock dependencies
jest.mock('../../../src/models/Role');
jest.mock('../../../src/models/User');
jest.mock('../../../src/logger/logger');

describe('RBAC Middleware Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: null, params: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    
    jest.clearAllMocks();
    
    logger.warn = jest.fn();
    logger.error = jest.fn();
  });

  describe('requirePermissions', () => {
    it('should call next() if user has required permissions', async () => {
      const mockUser = { _id: 'userId123', role: 'admin' };
      const mockRole = { 
        name: 'admin', 
        permissions: [
          { name: 'user.create' },
          { name: 'user.read' }
        ] 
      };
      
      req.user = mockUser;
      Role.findOne = jest.fn().mockReturnThis();
      Role.populate = jest.fn().mockResolvedValue(mockRole);

      const middleware = requirePermissions('user.create', 'user.read');
      await middleware(req, res, next);

      expect(Role.findOne).toHaveBeenCalledWith({ name: 'admin' });
      expect(Role.populate).toHaveBeenCalledWith('permissions');
      expect(req.userPermissions).toContain('user.create');
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 if user lacks required permissions', async () => {
      const mockUser = { _id: 'userId123', role: 'user' };
      const mockRole = { 
        name: 'user', 
        permissions: [
          { name: 'profile.create' } // Missing 'user.create'
        ] 
      };
      
      req.user = mockUser;
      Role.findOne = jest.fn().mockReturnThis();
      Role.populate = jest.fn().mockResolvedValue(mockRole);

      const middleware = requirePermissions('user.create');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toContain('Insufficient permissions');
      expect(callArg.statusCode).toBe(403);
    });

    it('should return 401 if no user in request', async () => {
      req.user = null;
      
      const middleware = requirePermissions('user.create');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toContain('not logged in');
      expect(callArg.statusCode).toBe(401);
    });

    it('should return 401 if user role is not found', async () => {
      const mockUser = { _id: 'userId123', role: 'nonExistentRole' };
      req.user = mockUser;
      Role.findOne = jest.fn().mockReturnThis();
      Role.populate = jest.fn().mockResolvedValue(null); // Role not found

      const middleware = requirePermissions('user.create');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toContain('not found');
      expect(callArg.statusCode).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      const mockUser = { _id: 'userId123', role: 'admin' };
      req.user = mockUser;
      const error = new Error('Database error');
      Role.findOne = jest.fn().mockRejectedValue(error);

      const middleware = requirePermissions('user.create');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toContain('try again later');
      expect(callArg.statusCode).toBe(500);
      expect(logger.error).toHaveBeenCalledWith('RBAC middleware error:', error);
    });
  });

  describe('checkResourcePermission', () => {
    it('should call next() for user with appropriate resource permissions', async () => {
      const mockUser = { _id: 'userId123', role: 'admin' };
      const mockRole = { 
        name: 'admin', 
        permissions: [
          { name: 'user.update' }
        ] 
      };
      
      req.user = mockUser;
      req.params = { id: 'resourceId123' };
      Role.findOne = jest.fn().mockReturnThis();
      Role.populate = jest.fn().mockResolvedValue(mockRole);

      const middleware = checkResourcePermission('user', 'update');
      await middleware(req, res, next);

      expect(Role.findOne).toHaveBeenCalledWith({ name: 'admin' });
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 if user lacks specific resource permission', async () => {
      const mockUser = { _id: 'userId123', role: 'user' };
      const mockRole = { 
        name: 'user', 
        permissions: [
          { name: 'profile.read' } // Does not have 'user.update' permission
        ] 
      };
      
      req.user = mockUser;
      req.params = { id: 'resourceId123' };
      Role.findOne = jest.fn().mockReturnThis();
      Role.populate = jest.fn().mockResolvedValue(mockRole);

      const middleware = checkResourcePermission('user', 'update');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toContain('do not have permission to update');
      expect(callArg.statusCode).toBe(403);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(`attempted to update user without permission`)
      );
    });

    it('should allow wildcard permissions', async () => {
      const mockUser = { _id: 'userId123', role: 'admin' };
      const mockRole = { 
        name: 'admin', 
        permissions: [
          { name: '*' } // Wildcard permission
        ] 
      };
      
      req.user = mockUser;
      req.params = { id: 'resourceId123' };
      Role.findOne = jest.fn().mockReturnThis();
      Role.populate = jest.fn().mockResolvedValue(mockRole);

      const middleware = checkResourcePermission('user', 'delete');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle resource ownership checks', async () => {
      // This test would be complex to fully mock without knowing all resource types
      // For now, test basic functionality
      const mockUser = { _id: 'userId123', role: 'user' };
      const mockRole = { 
        name: 'user', 
        permissions: [
          { name: 'profile.update' }
        ] 
      };
      
      req.user = mockUser;
      req.params = { id: 'resourceId123' };
      Role.findOne = jest.fn().mockReturnThis();
      Role.populate = jest.fn().mockResolvedValue(mockRole);

      const middleware = checkResourcePermission('profile', 'update');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Permission check error');
      req.user = { _id: 'userId123', role: 'admin' };
      Role.findOne = jest.fn().mockRejectedValue(error);

      const middleware = checkResourcePermission('user', 'update');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toContain('try again later');
      expect(callArg.statusCode).toBe(500);
    });
  });

  describe('isAdmin', () => {
    it('should call next() for admin users', async () => {
      req.user = { _id: 'userId123', role: 'admin' };

      await isAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 403 for non-admin users', async () => {
      req.user = { _id: 'userId123', role: 'user' };

      await isAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toContain('Administrative access required');
      expect(callArg.statusCode).toBe(403);
    });

    it('should return 401 for unauthenticated users', async () => {
      req.user = null;

      await isAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toContain('not logged in');
      expect(callArg.statusCode).toBe(401);
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Admin check error');
      req.user = { _id: 'userId123', role: 'admin' };

      jest.spyOn(Role, 'findOne').mockRejectedValue(error);

      await isAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toContain('try again later');
      expect(callArg.statusCode).toBe(500);
      expect(logger.error).toHaveBeenCalledWith('Admin check middleware error:', error);
    });
  });

  describe('isModeratorOrAdmin', () => {
    it('should call next() for admin users', async () => {
      req.user = { _id: 'userId123', role: 'admin' };

      await isModeratorOrAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should call next() for moderator users', async () => {
      req.user = { _id: 'userId123', role: 'moderator' };

      await isModeratorOrAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 403 for non-moderator/non-admin users', async () => {
      req.user = { _id: 'userId123', role: 'user' };

      await isModeratorOrAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toContain('Moderation access required');
      expect(callArg.statusCode).toBe(403);
    });

    it('should return 401 for unauthenticated users', async () => {
      req.user = null;

      await isModeratorOrAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toContain('not logged in');
      expect(callArg.statusCode).toBe(401);
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Moderator check error');
      req.user = { _id: 'userId123', role: 'admin' };

      await isModeratorOrAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toContain('try again later');
      expect(callArg.statusCode).toBe(500);
      expect(logger.error).toHaveBeenCalledWith('Moderator/admin check middleware error:', error);
    });
  });
});