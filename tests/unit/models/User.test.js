// tests/unit/models/User.test.js
const User = require('../../../src/models/User');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

describe('User Model', () => {
  describe('User Schema', () => {
    it('should require email field', () => {
      const user = new User({
        password: 'testPassword123',
        firstName: 'John',
        lastName: 'Doe'
      });

      const { errors } = user.validateSync();
      expect(errors.email.message).toBe('Email is required');
    });

    it('should require a valid email format', () => {
      const user = new User({
        email: 'invalid-email',
        password: 'testPassword123',
        firstName: 'John',
        lastName: 'Doe'
      });

      const { errors } = user.validateSync();
      expect(errors.email.message).toBe('Please enter a valid email');
    });

    it('should require password field', () => {
      const user = new User({
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      });

      const { errors } = user.validateSync();
      expect(errors.password.message).toBe('Password is required');
    });

    it('should require password to be at least 6 characters', () => {
      const user = new User({
        email: 'test@example.com',
        password: '12345', // Less than 6 characters
        firstName: 'John',
        lastName: 'Doe'
      });

      const { errors } = user.validateSync();
      expect(errors.password.message).toBe('Password must be at least 6 characters long');
    });

    it('should have timestamps enabled', () => {
      const user = new User({
        email: 'test@example.com',
        password: 'testPassword123',
        firstName: 'John',
        lastName: 'Doe'
      });

      expect(user).toHaveProperty('createdAt');
      expect(user).toHaveProperty('updatedAt');
    });
  });

  describe('Password Hashing', () => {
    it('should hash password before saving', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'testPassword123',
        firstName: 'John',
        lastName: 'Doe'
      });

      await user.save();
      expect(user.password).not.toBe('testPassword123');
    });

    it('should compare passwords correctly', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'testPassword123',
        firstName: 'John',
        lastName: 'Doe'
      });

      await user.save();
      const isValid = await user.comparePassword('testPassword123');
      const isInvalid = await user.comparePassword('wrongPassword');

      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Password Reset Token', () => {
    it('should create a valid password reset token', () => {
      const user = new User({
        email: 'test@example.com',
        password: 'testPassword123',
        firstName: 'John',
        lastName: 'Doe'
      });

      const resetToken = user.createPasswordResetToken();
      const hashedToken = user.passwordResetToken;

      expect(resetToken).toBeDefined();
      expect(hashedToken).toBeDefined();
      expect(resetToken.length).toBe(64); // 32 bytes hex string
    });
  });
});