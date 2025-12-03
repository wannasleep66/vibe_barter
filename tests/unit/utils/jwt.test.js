// tests/unit/utils/jwt.test.js
const jwt = require('jsonwebtoken');
const { 
  generateToken, 
  verifyToken, 
  verifyTokenWithBlacklist, 
  isTokenBlacklisted, 
  blacklistToken, 
  createTokens,
  checkPasswordChangedAfterToken
} = require('../../../src/utils/jwt');
const TokenBlacklist = require('../../../src/models/TokenBlacklist');
const User = require('../../../src/models/User');
const AppError = require('../../../src/utils/AppError');

// Mock the models
jest.mock('../../../src/models/TokenBlacklist');
jest.mock('../../../src/models/User');

describe('JWT Utilities Unit Tests', () => {
  const mockUserId = 'testUserId';
  const mockToken = 'mockToken123';
  const mockSecret = 'testSecret123';

  beforeEach(() => {
    process.env.JWT_SECRET = mockSecret;
    process.env.JWT_EXPIRES_IN = '15m';
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(mockUserId);
      expect(token).toBeDefined();
      
      const decoded = jwt.verify(token, mockSecret);
      expect(decoded.id).toBe(mockUserId);
    });

    it('should generate a token with custom expiration', () => {
      const token = generateToken(mockUserId, '1h');
      expect(token).toBeDefined();
      
      const decoded = jwt.verify(token, mockSecret);
      expect(decoded.id).toBe(mockUserId);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = jwt.sign({ id: mockUserId }, mockSecret);
      const decoded = verifyToken(token);
      expect(decoded.id).toBe(mockUserId);
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyToken('invalidToken')).toThrow();
    });

    it('should throw error for expired token', () => {
      const expiredToken = jwt.sign({ id: mockUserId }, mockSecret, { expiresIn: '1ms' });
      // Wait for expiration
      jest.advanceTimersByTime(10);
      expect(() => verifyToken(expiredToken)).toThrow();
    });
  });

  describe('isTokenBlacklisted', () => {
    it('should return false for non-blacklisted token', async () => {
      TokenBlacklist.findOne.mockResolvedValue(null);
      
      const result = await isTokenBlacklisted(mockToken);
      expect(result).toBe(false);
      expect(TokenBlacklist.findOne).toHaveBeenCalledWith({ token: mockToken });
    });

    it('should return true for blacklisted token', async () => {
      TokenBlacklist.findOne.mockResolvedValue({ token: mockToken });
      
      const result = await isTokenBlacklisted(mockToken);
      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      TokenBlacklist.findOne.mockRejectedValue(new Error('Database error'));
      
      const result = await isTokenBlacklisted(mockToken);
      expect(result).toBe(false);
    });
  });

  describe('blacklistToken', () => {
    it('should blacklist a token with default values', async () => {
      const mockSave = jest.fn().mockResolvedValue({ token: mockToken });
      TokenBlacklist.mockImplementation(() => ({
        save: mockSave
      }));

      await blacklistToken(mockToken, mockUserId);
      
      expect(TokenBlacklist).toHaveBeenCalledWith({
        token: mockToken,
        userId: mockUserId,
        type: 'access',
        expiresAt: expect.any(Date)
      });
      expect(mockSave).toHaveBeenCalled();
    });

    it('should blacklist a token with custom values', async () => {
      const mockSave = jest.fn().mockResolvedValue({ token: mockToken });
      TokenBlacklist.mockImplementation(() => ({
        save: mockSave
      }));

      await blacklistToken(mockToken, mockUserId, 'refresh', '7d');
      
      expect(TokenBlacklist).toHaveBeenCalledWith({
        token: mockToken,
        userId: mockUserId,
        type: 'refresh',
        expiresAt: expect.any(Date)
      });
      expect(mockSave).toHaveBeenCalled();
    });

    it('should handle errors during blacklisting', async () => {
      TokenBlacklist.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(blacklistToken(mockToken, mockUserId)).rejects.toThrow(AppError);
    });
  });

  describe('verifyTokenWithBlacklist', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should verify non-blacklisted token', async () => {
      TokenBlacklist.findOne.mockResolvedValue(null);
      const validToken = jwt.sign({ id: mockUserId }, mockSecret);
      
      const decoded = await verifyTokenWithBlacklist(validToken);
      expect(decoded.id).toBe(mockUserId);
    });

    it('should reject blacklisted token', async () => {
      TokenBlacklist.findOne.mockResolvedValue({ token: mockToken });
      
      await expect(verifyTokenWithBlacklist(mockToken)).rejects.toThrow(AppError);
    });

    it('should reject expired token', async () => {
      const expiredToken = jwt.sign({ id: mockUserId }, mockSecret, { expiresIn: '1ms' });
      
      await expect(verifyTokenWithBlacklist(expiredToken)).rejects.toThrow(AppError);
    });
  });

  describe('createTokens', () => {
    it('should create both access and refresh tokens', () => {
      const mockUser = { _id: mockUserId };
      
      const { accessToken, refreshToken } = createTokens(mockUser);
      
      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();
      
      const accessDecoded = jwt.verify(accessToken, mockSecret);
      expect(accessDecoded.id).toBe(mockUserId);
      
      const refreshDecoded = jwt.verify(refreshToken, mockSecret);
      expect(refreshDecoded.id).toBe(mockUserId);
    });
  });

  describe('checkPasswordChangedAfterToken', () => {
    it('should return false if password was not changed after token issue', () => {
      const mockUser = {
        passwordChangedAt: null
      };
      
      const result = checkPasswordChangedAfterToken(mockUser, Date.now() / 1000);
      expect(result).toBe(false);
    });

    it('should return false if password was changed before token issue', () => {
      const passwordChangeTime = new Date(Date.now() - 10000); // 10 seconds ago
      const tokenIssueTime = Math.floor(Date.now() / 1000); // Current time
      
      const mockUser = {
        passwordChangedAt: passwordChangeTime
      };
      
      const result = checkPasswordChangedAfterToken(mockUser, tokenIssueTime);
      expect(result).toBe(false);
    });

    it('should return true if password was changed after token issue', () => {
      const tokenIssueTime = Math.floor((Date.now() - 10000) / 1000); // 10 seconds ago
      const passwordChangeTime = new Date(); // Now
      
      const mockUser = {
        passwordChangedAt: passwordChangeTime
      };
      
      const result = checkPasswordChangedAfterToken(mockUser, tokenIssueTime);
      expect(result).toBe(true);
    });
  });
});