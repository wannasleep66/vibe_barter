// tests/unit/middleware/rateLimit.test.js
const rateLimit = require('express-rate-limit');
const authLimiter = require('../../../src/middleware/rateLimit');

// Mock express-rate-limit
jest.mock('express-rate-limit');

describe('Rate Limiting Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create rate limiter with appropriate configuration', () => {
    expect(rateLimit).toHaveBeenCalledWith({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // Limit each IP to 5 attempts
      message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
  });

  it('should export a function', () => {
    expect(typeof authLimiter).toBe('function');
  });
});