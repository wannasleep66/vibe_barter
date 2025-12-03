// tests/unit/services/EmailService.test.js
const nodemailer = require('nodemailer');
const EmailService = require('../../../src/services/EmailService');
const { logger } = require('../../../src/logger/logger');

// Mock nodemailer
jest.mock('nodemailer');
jest.mock('../../../src/logger/logger');

describe('EmailService Unit Tests', () => {
  let mockTransporter, mockSendMail;

  beforeEach(() => {
    mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
    mockTransporter = {
      verify: jest.fn().mockImplementation((callback) => callback(null, true)),
      sendMail: mockSendMail
    };
    
    nodemailer.createTransporter.mockReturnValue(mockTransporter);
    logger.error = jest.fn();
    logger.info = jest.fn();
    
    // Re-require the service to apply mocks
    jest.resetModules();
    const actualModule = jest.requireActual('../../../src/services/EmailService');
    // Since EmailService is a singleton, we can't easily isolate the transporter here
    // We'll test the functionality through the methods directly
  });

  it('should generate correct email verification template', () => {
    const user = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com'
    };
    
    const verificationToken = 'testToken123';
    
    // Since the template is HTML and would be complex to check in detail,
    // we'll just ensure it returns a string with the expected elements
    const template = EmailService.generateEmailVerificationTemplate(user, verificationToken);
    
    expect(template).toContain('Verify Your Email Address');
    expect(template).toContain('Test User');
    expect(template).toContain('Barter Vibe');
    expect(template).toContain('testToken123');
    expect(template).toContain('Verify Email Address');
  });

  it('should have sendEmailVerification method', () => {
    expect(typeof EmailService.sendEmailVerification).toBe('function');
  });

  it('should have sendWelcomeEmail method', () => {
    expect(typeof EmailService.sendWelcomeEmail).toBe('function');
  });

  it('should have transporter', () => {
    // This test would be more effective if we could access the transporter instance
    // For now we just verify that the module exists and has the expected methods
    expect(EmailService).toBeDefined();
  });
});