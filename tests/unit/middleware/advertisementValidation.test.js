// tests/unit/middleware/advertisementValidation.test.js
const {
  validateCreateAdvertisement,
  validateUpdateAdvertisement,
  validateGetAdvertisementsQuery,
  validateAdvertisementId,
  validateGetUserAdvertisementsQuery
} = require('../../../src/middleware/validation/advertisementValidation');
const AppError = require('../../../src/utils/AppError');

describe('Advertisement Validation Middleware Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, query: {}, params: {} };
    res = {};
    next = jest.fn();
  });

  describe('validateCreateAdvertisement', () => {
    it('should call next() for valid advertisement creation data', async () => {
      req.body = {
        title: 'Valid Title',
        description: 'Valid description with sufficient length',
        categoryId: '507f1f77bcf86cd799439011',
        type: 'goods',
        exchangePreferences: 'Would like to exchange for electronics'
      };

      await validateCreateAdvertisement(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body).toEqual({
        title: 'Valid Title',
        description: 'Valid description with sufficient length',
        categoryId: '507f1f77bcf86cd799439011',
        type: 'goods',
        exchangePreferences: 'Would like to exchange for electronics'
      });
    });

    it('should return error for short title', async () => {
      req.body = {
        title: 'Hi', // Too short
        description: 'Valid description with sufficient length',
        categoryId: '507f1f77bcf86cd799439011',
        type: 'goods'
      };

      await validateCreateAdvertisement(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Validation error'),
          statusCode: 400
        })
      );
    });

    it('should return error for invalid category ID format', async () => {
      req.body = {
        title: 'Valid Title',
        description: 'Valid description with sufficient length',
        categoryId: 'invalidId', // Invalid format
        type: 'goods'
      };

      await validateCreateAdvertisement(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Validation error'),
          statusCode: 400
        })
      );
    });

    it('should return error for invalid type', async () => {
      req.body = {
        title: 'Valid Title',
        description: 'Valid description with sufficient length',
        categoryId: '507f1f77bcf86cd799439011',
        type: 'invalidType' // Not in allowed values
      };

      await validateCreateAdvertisement(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Validation error'),
          statusCode: 400
        })
      );
    });

    it('should return error for short description', async () => {
      req.body = {
        title: 'Valid Title',
        description: 'Hi', // Too short
        categoryId: '507f1f77bcf86cd799439011',
        type: 'goods'
      };

      await validateCreateAdvertisement(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Validation error'),
          statusCode: 400
        })
      );
    });
  });

  describe('validateUpdateAdvertisement', () => {
    it('should call next() for valid advertisement update data', async () => {
      req.body = {
        title: 'Updated Title',
        description: 'Updated description with sufficient length',
        categoryId: '507f1f77bcf86cd799439011',
        type: 'service'
      };

      await validateUpdateAdvertisement(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body).toEqual({
        title: 'Updated Title',
        description: 'Updated description with sufficient length',
        categoryId: '507f1f77bcf86cd799439011',
        type: 'service'
      });
    });

    it('should allow partial updates', async () => {
      req.body = {
        title: 'Updated Title'
        // Only updating title, other fields are optional
      };

      await validateUpdateAdvertisement(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return error for too short title', async () => {
      req.body = {
        title: 'Hi' // Too short
      };

      await validateUpdateAdvertisement(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Validation error'),
          statusCode: 400
        })
      );
    });
  });

  describe('validateGetAdvertisementsQuery', () => {
    it('should call next() for valid query parameters', async () => {
      req.query = {
        page: '2',
        limit: '20',
        type: 'goods',
        location: 'New York',
        isUrgent: 'true',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      await validateGetAdvertisementsQuery(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.query).toEqual({
        page: 2,
        limit: 20,
        type: 'goods',
        location: 'New York',
        isUrgent: true,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        isActive: 'true'
      });
    });

    it('should return error for invalid page number', async () => {
      req.query = {
        page: 'invalid' // Not a number
      };

      await validateGetAdvertisementsQuery(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Validation error'),
          statusCode: 400
        })
      );
    });

    it('should return error for invalid sort order', async () => {
      req.query = {
        sortOrder: 'invalid' // Not 'asc' or 'desc'
      };

      await validateGetAdvertisementsQuery(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Validation error'),
          statusCode: 400
        })
      );
    });
  });

  describe('validateAdvertisementId', () => {
    it('should call next() for valid advertisement ID', async () => {
      req.params = {
        id: '507f1f77bcf86cd799439011' // Valid ObjectId format
      };

      await validateAdvertisementId(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return error for invalid advertisement ID format', async () => {
      req.params = {
        id: 'invalidId' // Invalid format
      };

      await validateAdvertisementId(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Validation error'),
          statusCode: 400
        })
      );
    });

    it('should return error when ID is missing', async () => {
      req.params = {}; // No ID provided

      await validateAdvertisementId(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Validation error'),
          statusCode: 400
        })
      );
    });
  });

  describe('validateGetUserAdvertisementsQuery', () => {
    it('should call next() for valid query parameters for user ads', async () => {
      req.query = {
        page: '1',
        limit: '10',
        isActive: 'true',
        isArchived: 'false',
        sortBy: 'title',
        sortOrder: 'asc'
      };

      await validateGetUserAdvertisementsQuery(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.query).toEqual({
        page: 1,
        limit: 10,
        isActive: true,
        isArchived: false,
        sortBy: 'title',
        sortOrder: 'asc'
      });
    });

    it('should return error for invalid page number', async () => {
      req.query = {
        page: 'invalid'
      };

      await validateGetUserAdvertisementsQuery(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Validation error'),
          statusCode: 400
        })
      );
    });
  });
});