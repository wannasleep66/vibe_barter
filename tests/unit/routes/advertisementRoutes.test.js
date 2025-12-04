// tests/unit/routes/advertisementRoutes.test.js
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const advertisementRoutes = require('../../../src/routes/advertisements');
const { protect } = require('../../../src/middleware/auth');
const { 
  requirePermissions,
  isOwnResourceOrAdmin 
} = require('../../../src/middleware/rbac');
const {
  validateCreateAdvertisement,
  validateUpdateAdvertisement,
  validateGetAdvertisementsQuery,
  validateAdvertisementId,
  validateGetUserAdvertisementsQuery
} = require('../../../src/middleware/validation/advertisementValidation');

// Mock middleware functions
jest.mock('../../../src/middleware/auth', () => ({
  protect: jest.fn((req, res, next) => next())
}));

jest.mock('../../../src/middleware/rbac', () => ({
  requirePermissions: jest.fn(() => (req, res, next) => next()),
  isOwnResourceOrAdmin: jest.fn(() => (req, res, next) => next())
}));

jest.mock('../../../src/middleware/validation/advertisementValidation', () => ({
  validateCreateAdvertisement: jest.fn((req, res, next) => next()),
  validateUpdateAdvertisement: jest.fn((req, res, next) => next()),
  validateGetAdvertisementsQuery: jest.fn((req, res, next) => next()),
  validateAdvertisementId: jest.fn((req, res, next) => next()),
  validateGetUserAdvertisementsQuery: jest.fn((req, res, next) => next())
}));

describe('Advertisement Routes Unit Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/advertisements', advertisementRoutes);
    
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('GET /api/advertisements', () => {
    it('should call validateGetAdvertisementsQuery middleware', async () => {
      await request(app)
        .get('/api/advertisements')
        .expect(404); // Will get 404 because controller is not mocked

      expect(validateGetAdvertisementsQuery).toHaveBeenCalled();
    });

    it('should not require authentication for public endpoint', async () => {
      await request(app).get('/api/advertisements');
      
      // Protect middleware should not be called for this route
      expect(protect).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/advertisements/:id', () => {
    it('should call validateAdvertisementId middleware', async () => {
      await request(app)
        .get('/api/advertisements/123456789012')
        .expect(404);

      expect(validateAdvertisementId).toHaveBeenCalled();
    });

    it('should not require authentication for public endpoint', async () => {
      await request(app).get('/api/advertisements/123456789012');
      
      // Protect middleware should not be called for this route
      expect(protect).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/advertisements', () => {
    it('should require authentication and permissions', async () => {
      await request(app)
        .post('/api/advertisements')
        .send({ title: 'Test', description: 'Test', type: 'goods' })
        .expect(404);

      expect(protect).toHaveBeenCalled();
      expect(requirePermissions).toHaveBeenCalledWith('advertisement.create');
      expect(validateCreateAdvertisement).toHaveBeenCalled();
    });
  });

  describe('PATCH /api/advertisements/:id', () => {
    it('should require authentication and ownership check', async () => {
      await request(app)
        .patch('/api/advertisements/123456789012')
        .send({ title: 'Updated' })
        .expect(404);

      expect(protect).toHaveBeenCalled();
      expect(validateAdvertisementId).toHaveBeenCalled();
      expect(isOwnResourceOrAdmin).toHaveBeenCalledWith('ownerId');
      expect(validateUpdateAdvertisement).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/advertisements/:id', () => {
    it('should require authentication and ownership check', async () => {
      await request(app)
        .delete('/api/advertisements/123456789012')
        .expect(404);

      expect(protect).toHaveBeenCalled();
      expect(validateAdvertisementId).toHaveBeenCalled();
      expect(isOwnResourceOrAdmin).toHaveBeenCalledWith('ownerId');
    });
  });

  describe('PATCH /api/advertisements/:id/archive', () => {
    it('should require authentication and ownership check', async () => {
      await request(app)
        .patch('/api/advertisements/123456789012/archive')
        .expect(404);

      expect(protect).toHaveBeenCalled();
      expect(validateAdvertisementId).toHaveBeenCalled();
      expect(isOwnResourceOrAdmin).toHaveBeenCalledWith('ownerId');
    });
  });

  describe('GET /api/advertisements/my-advertisements', () => {
    it('should require authentication and permissions', async () => {
      await request(app)
        .get('/api/advertisements/my-advertisements')
        .expect(404);

      expect(protect).toHaveBeenCalled();
      expect(requirePermissions).toHaveBeenCalledWith('advertisement.read');
      expect(validateGetUserAdvertisementsQuery).toHaveBeenCalled();
    });
  });
});