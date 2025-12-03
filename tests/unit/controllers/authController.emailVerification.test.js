// tests/unit/controllers/authController.emailVerification.test.js
const { requestVerificationEmail, verifyEmail } = require('../../../src/controllers/authController');
const User = require('../../../src/models/User');
const { logger } = require('../../../src/logger/logger');
const AppError = require('../../../src/utils/AppError');
const crypto = require('crypto');

// Mock dependencies
jest.mock('../../../src/models/User');
jest.mock('../../../src/logger/logger');
jest.mock('crypto');
jest.mock('../../../src/services/EmailService');

describe('Auth Controller - Email Verification Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    
    jest.clearAllMocks();
  });

  describe('requestVerificationEmail', () => {
    it('should send verification email for unverified user', async () => {
      const mockUser = {
        _id: 'userId',
        email: 'test@example.com',
        isEmailVerified: false,
        createEmailVerificationToken: jest.fn().mockReturnValue('verificationToken'),
        save: jest.fn()
      };

      req.body = { email: 'test@example.com' };
      User.findOne = jest.fn().mockResolvedValue(mockUser);

      const emailService = require('../../../src/services/EmailService');
      emailService.sendEmailVerification = jest.fn().mockResolvedValue({ success: true });

      await requestVerificationEmail(req, res, next);

      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(mockUser.createEmailVerificationToken).toHaveBeenCalled();
      expect(mockUser.save).toHaveBeenCalledWith({ validateBeforeSave: false });
      expect(emailService.sendEmailVerification).toHaveBeenCalledWith(mockUser, 'verificationToken');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Verification email sent successfully'
      });
    });

    it('should return error for non-existent user', async () => {
      req.body = { email: 'nonexistent@example.com' };
      User.findOne = jest.fn().mockResolvedValue(null);

      await requestVerificationEmail(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toBe('No user found with this email address');
      expect(callArg.statusCode).toBe(404);
    });

    it('should return error for already verified user', async () => {
      const mockUser = {
        _id: 'userId',
        email: 'verified@example.com',
        isEmailVerified: true
      };

      req.body = { email: 'verified@example.com' };
      User.findOne = jest.fn().mockResolvedValue(mockUser);

      await requestVerificationEmail(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toBe('Email is already verified');
      expect(callArg.statusCode).toBe(400);
    });

    it('should handle email sending error', async () => {
      const mockUser = {
        _id: 'userId',
        email: 'test@example.com',
        isEmailVerified: false,
        createEmailVerificationToken: jest.fn().mockReturnValue('verificationToken'),
        save: jest.fn()
      };

      req.body = { email: 'test@example.com' };
      User.findOne = jest.fn().mockResolvedValue(mockUser);

      const emailService = require('../../../src/services/EmailService');
      emailService.sendEmailVerification = jest.fn().mockRejectedValue(new Error('Email send error'));

      await requestVerificationEmail(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toBe('Failed to send verification email. Please try again later.');
      expect(callArg.statusCode).toBe(500);
    });

    it('should handle general errors', async () => {
      req.body = { email: 'test@example.com' };
      User.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

      await requestVerificationEmail(req, res, next);

      expect(next).toHaveBeenCalledWith(new Error('Database error'));
    });
  });

  describe('verifyEmail', () => {
    it('should verify user email with valid token', async () => {
      const mockUser = {
        _id: 'userId',
        email: 'verify@example.com',
        isEmailVerified: false,
        emailVerificationToken: 'hashedToken',
        emailVerificationExpires: Date.now() + 10000, // Not expired
        save: jest.fn()
      };

      req.params = { token: 'verificationToken' };
      
      // Mock crypto to return the expected hash
      crypto.createHash = jest.fn().mockReturnThis();
      crypto.update = jest.fn().mockReturnThis();
      crypto.digest = jest.fn().mockReturnValue('hashedToken');
      
      User.findOne = jest.fn().mockResolvedValue(mockUser);

      const emailService = require('../../../src/services/EmailService');
      emailService.sendWelcomeEmail = jest.fn().mockResolvedValue({ success: true });

      await verifyEmail(req, res, next);

      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
      expect(crypto.update).toHaveBeenCalledWith('verificationToken');
      expect(crypto.digest).toHaveBeenCalledWith('hex');
      expect(User.findOne).toHaveBeenCalledWith({
        emailVerificationToken: 'hashedToken',
        emailVerificationExpires: expect.any(Object) // $gt condition
      });
      
      expect(mockUser.isEmailVerified).toBe(true);
      expect(mockUser.emailVerificationToken).toBeUndefined();
      expect(mockUser.emailVerificationExpires).toBeUndefined();
      expect(mockUser.save).toHaveBeenCalledWith({ validateBeforeSave: false });
      expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(mockUser);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Email verified successfully'
      });
    });

    it('should return error for invalid or expired token', async () => {
      req.params = { token: 'invalidToken' };
      
      // Mock crypto to return a hash
      crypto.createHash = jest.fn().mockReturnThis();
      crypto.update = jest.fn().mockReturnThis();
      crypto.digest = jest.fn().mockReturnValue('hashedToken');
      
      User.findOne = jest.fn().mockResolvedValue(null); // No user found

      await verifyEmail(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const callArg = next.mock.calls[0][0];
      expect(callArg.message).toBe('Token is invalid or has expired');
      expect(callArg.statusCode).toBe(400);
    });

    it('should handle welcome email error gracefully', async () => {
      const mockUser = {
        _id: 'userId',
        email: 'verify@example.com',
        isEmailVerified: false,
        emailVerificationToken: 'hashedToken',
        emailVerificationExpires: Date.now() + 10000, // Not expired
        save: jest.fn()
      };

      req.params = { token: 'verificationToken' };
      
      // Mock crypto to return the expected hash
      crypto.createHash = jest.fn().mockReturnThis();
      crypto.update = jest.fn().mockReturnThis();
      crypto.digest = jest.fn().mockReturnValue('hashedToken');
      
      User.findOne = jest.fn().mockResolvedValue(mockUser);

      const emailService = require('../../../src/services/EmailService');
      emailService.sendWelcomeEmail = jest.fn().mockRejectedValue(new Error('Email send error'));

      await verifyEmail(req, res, next);

      // The verification should still succeed despite email error
      expect(mockUser.isEmailVerified).toBe(true);
      expect(mockUser.emailVerificationToken).toBeUndefined();
      expect(mockUser.emailVerificationExpires).toBeUndefined();
      expect(mockUser.save).toHaveBeenCalledWith({ validateBeforeSave: false });
      expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(mockUser);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Email verified successfully'
      });
    });

    it('should handle general errors', async () => {
      req.params = { token: 'verificationToken' };
      crypto.createHash = jest.fn().mockReturnThis();
      crypto.update = jest.fn().mockReturnThis();
      crypto.digest = jest.fn().mockReturnValue('hashedToken');
      User.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

      await verifyEmail(req, res, next);

      expect(next).toHaveBeenCalledWith(new Error('Database error'));
    });
  });
});