// src/services/EmailService.js
const nodemailer = require('nodemailer');
const { logger } = require('../logger/logger');

class EmailService {
  constructor() {
    // Create transporter for sending emails
    this.transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Verify transporter configuration
    this.transporter.verify((error, success) => {
      if (error) {
        logger.error('Email service configuration error:', error);
      } else {
        logger.info('Email service is ready to send messages');
      }
    });
  }

  // Generate HTML template for email verification
  generateEmailVerificationTemplate(user, verificationToken) {
    const verificationURL = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/verify-email/${verificationToken}`;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Email Address</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            padding: 20px 0;
            border-bottom: 1px solid #eee;
          }
          .content {
            padding: 20px 0;
          }
          .footer {
            text-align: center;
            padding: 20px 0;
            border-top: 1px solid #eee;
            color: #777;
            font-size: 12px;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            margin: 20px 0;
            background-color: #667eea;
            color: white !important;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Barter Vibe</h1>
            <h2>Verify Your Email Address</h2>
          </div>
          <div class="content">
            <p>Hello ${user.firstName} ${user.lastName},</p>
            
            <p>Thank you for registering with Barter Vibe! To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
            
            <p style="text-align: center;">
              <a href="${verificationURL}" class="button">Verify Email Address</a>
            </p>
            
            <p>Or copy and paste this link into your browser:</p>
            <p><a href="${verificationURL}">${verificationURL}</a></p>
            
            <p><strong>This link will expire in 24 hours.</strong></p>
            
            <p>If you did not create an account with Barter Vibe, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Barter Vibe. All rights reserved.</p>
            <p>If you have any questions, please contact us at ${process.env.EMAIL_USER || 'support@example.com'}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Send email verification
  async sendEmailVerification(user, verificationToken) {
    try {
      const mailOptions = {
        from: `"Barter Vibe" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'Verify Your Email Address - Barter Vibe',
        html: this.generateEmailVerificationTemplate(user, verificationToken)
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Email verification sent successfully to ${user.email}`);
      return result;
    } catch (error) {
      logger.error(`Error sending email verification to ${user.email}:`, error);
      throw error;
    }
  }

  // Send welcome email after verification
  async sendWelcomeEmail(user) {
    try {
      const mailOptions = {
        from: `"Barter Vibe" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'Welcome to Barter Vibe!',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Welcome to Barter Vibe</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                background: white;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
              }
              .header {
                text-align: center;
                padding: 20px 0;
                border-bottom: 1px solid #eee;
              }
              .content {
                padding: 20px 0;
              }
              .footer {
                text-align: center;
                padding: 20px 0;
                border-top: 1px solid #eee;
                color: #777;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Barter Vibe</h1>
                <h2>Welcome Aboard!</h2>
              </div>
              <div class="content">
                <p>Hello ${user.firstName} ${user.lastName},</p>
                
                <p>Congratulations! Your email address has been successfully verified. You can now fully enjoy all the features of the Barter Vibe platform.</p>
                
                <p>Start exploring what you can do:</p>
                <ul>
                  <li>Create your profile</li>
                  <li>Post advertisements</li>
                  <li>Connect with other users</li>
                  <li>Start bartering!</li>
                </ul>
                
                <p>We're excited to have you join our community!</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Barter Vibe. All rights reserved.</p>
                <p>If you have any questions, please contact us at ${process.env.EMAIL_USER || 'support@example.com'}</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Welcome email sent successfully to ${user.email}`);
      return result;
    } catch (error) {
      logger.error(`Error sending welcome email to ${user.email}:`, error);
      throw error;
    }
  }
}

module.exports = new EmailService();