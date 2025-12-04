// tests/unit/middleware/advertisementMediaValidation.test.js
const {
  validateCreateAdvertisementMedia,
  validateUpdateAdvertisementMedia,
  validateMediaId,
  validateAdvertisementId,
  validateMediaFile
} = require('../../../src/middleware/validation/advertisementMediaValidation');
const AppError = require('../../../src/utils/AppError');

describe('AdvertisementMedia Validation Middleware Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, query: {}, params: {}, file: null };
    res = {};
    next = jest.fn();
  });

  describe('validateCreateAdvertisementMedia', () => {
    it('should call next() for valid create advertisement media data', async () => {
      req.file = { filename: 'test.jpg' };
      req.body = {
        advertisementId: '507f1f77bcf86cd799439011',
        altText: 'Test alt text',
        isPrimary: true,
        sortOrder: 1
      };

      await validateCreateAdvertisementMedia(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body).toEqual({
        advertisementId: '507f1f77bcf86cd799439011',
        altText: 'Test alt text',
        isPrimary: true,
        sortOrder: 1
      });
    });

    it('should return error if no file is provided', async () => {
      req.body = {
        advertisementId: '507f1f77bcf86cd799439011'
      };

      await validateCreateAdvertisementMedia(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No file provided',
          statusCode: 400
        })
      );
    });

    it('should return error for invalid advertisement ID format', async () => {
      req.file = { filename: 'test.jpg' };
      req.body = {
        advertisementId: 'invalidId', // Invalid ObjectId format
        altText: 'Test alt text'
      };

      await validateCreateAdvertisementMedia(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Validation error'),
          statusCode: 400
        })
      );
    });

    it('should return error for invalid altText length', async () => {
      req.file = { filename: 'test.jpg' };
      req.body = {
        advertisementId: '507f1f77bcf86cd799439011',
        altText: 'A'.repeat(201) // Exceeds max length of 200
      };

      await validateCreateAdvertisementMedia(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Validation error'),
          statusCode: 400
        })
      );
    });
  });

  describe('validateUpdateAdvertisementMedia', () => {
    it('should call next() for valid update advertisement media data', async () => {
      req.body = {
        altText: 'Updated alt text',
        isPrimary: false,
        sortOrder: 2
      };

      await validateUpdateAdvertisementMedia(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body).toEqual({
        altText: 'Updated alt text',
        isPrimary: false,
        sortOrder: 2
      });
    });

    it('should allow partial updates', async () => {
      req.body = {
        altText: 'Updated alt text'
        // Only updating alt text
      };

      await validateUpdateAdvertisementMedia(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return error for invalid altText length', async () => {
      req.body = {
        altText: 'A'.repeat(201) // Exceeds max length of 200
      };

      await validateUpdateAdvertisementMedia(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Validation error'),
          statusCode: 400
        })
      );
    });
  });

  describe('validateMediaId', () => {
    it('should call next() for valid media ID', async () => {
      req.params = {
        id: '507f1f77bcf86cd799439011' // Valid ObjectId format
      };

      await validateMediaId(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return error for invalid media ID format', async () => {
      req.params = {
        id: 'invalidId' // Invalid format
      };

      await validateMediaId(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Validation error'),
          statusCode: 400
        })
      );
    });

    it('should return error when media ID is missing', async () => {
      req.params = {}; // No ID provided

      await validateMediaId(req, res, next);

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
        advertisementId: '507f1f77bcf86cd799439011' // Valid ObjectId format
      };

      await validateAdvertisementId(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return error for invalid advertisement ID format', async () => {
      req.params = {
        advertisementId: 'invalidId' // Invalid format
      };

      await validateAdvertisementId(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Validation error'),
          statusCode: 400
        })
      );
    });
  });

  describe('validateMediaFile', () => {
    it('should call next() for valid media file', async () => {
      req.file = {
        filename: 'test.jpg',
        originalname: 'test.jpg',
        size: 102400, // 100KB
        mimetype: 'image/jpeg'
      };

      await validateMediaFile(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return error if no file is provided', async () => {
      req.file = null;

      await validateMediaFile(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No file provided',
          statusCode: 400
        })
      );
    });

    it('should return error for file exceeding size limit', async () => {
      req.file = {
        filename: 'largefile.jpg',
        originalname: 'largefile.jpg',
        size: 11 * 1024 * 1024, // 11MB (over 10MB limit)
        mimetype: 'image/jpeg'
      };

      await validateMediaFile(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'File size exceeds maximum allowed size of 10MB',
          statusCode: 400
        })
      );
    });

    it('should return error for disallowed file type', async () => {
      req.file = {
        filename: 'script.js',
        originalname: 'script.js',
        size: 1024,
        mimetype: 'application/javascript' // Not in allowed list
      };

      await validateMediaFile(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('is not allowed'),
          statusCode: 400
        })
      );
    });
  });
});