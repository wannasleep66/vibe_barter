// src/controllers/authController.js
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logger } = require('../logger/logger');
const AppError = require('../utils/AppError');
const { blacklistToken } = require('../utils/jwt');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const { createTokens } = require('../utils/jwt');

const createSendToken = async (user, statusCode, res) => {
  const { accessToken, refreshToken } = createTokens(user);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    success: true,
    token: accessToken,
    refreshToken, // Include refresh token in response
    data: {
      user
    }
  });
};

exports.register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('User with this email already exists', 409));
    }

    const user = await User.create({
      email,
      password,
      firstName,
      lastName
    });

    // Generate email verification token
    const verificationToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Send verification email
    // In a production environment, you might want to send this in a background job
    try {
      const emailService = require('../services/EmailService');
      await emailService.sendEmailVerification(user, verificationToken);
    } catch (emailError) {
      // Log the error but don't prevent registration due to email failure
      logger.error('Failed to send verification email:', emailError);
      // The user will still need to verify their email but will have to request it again
    }

    createSendToken(user, 201, res);
  } catch (error) {
    // Handle duplicate key error (email uniqueness)
    if (error.code === 11000) {
      return next(new AppError('Email already exists', 409));
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(er => er.message);
      return next(new AppError(`Validation error: ${errors.join(', ')}`, 400));
    }

    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1) Check if email and password exist
    if (!email || !password) {
      return next(new AppError('Please provide email and password!', 400));
    }

    // 2) Check if user exists && password is correct
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      // Log failed login attempt
      logger.warn(`Failed login attempt for email: ${email} from IP: ${req.ip}`);
      return next(new AppError('Incorrect email or password', 401));
    }

    // 3) Check if account is active
    if (!user.isActive) {
      return next(new AppError('This account has been deactivated', 401));
    }

    // 4) Check if email is verified (optional: you can make this required or not)
    if (!user.isEmailVerified) {
      return next(new AppError('Please verify your email address before logging in', 401));
    }

    // 5) Update last login time
    user.lastLoginAt = Date.now();
    await user.save({ validateBeforeSave: false });

    // 6) If everything ok, send token to client
    createSendToken(user, 200, res);

    // Log successful login
    logger.info(`Successful login for user: ${user._id} from IP: ${req.ip}`);
  } catch (error) {
    next(error);
  }
};

exports.protect = async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }

  try {
    // 2) Verification token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(
        new AppError('The user belonging to this token no longer exists.', 401)
      );
    }

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = currentUser;
    next();
  } catch (error) {
    return next(new AppError('Invalid token. Please log in again.', 401));
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'moderator']. role='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};

exports.forgotPassword = async (req, res, next) => {
  try {
    // 1) Get user based on POSTed email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return next(new AppError('There is no user with email address.', 404));
    }

    // 2) Generate the random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // 3) Send it to user's email
    // We'll implement email sending later
    res.status(200).json({
      success: true,
      message: 'Token sent to email!'
    });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    // 1) Get user based on the token
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    // 2) If token has not expired, and there is user, set the new password
    if (!user) {
      return next(new AppError('Token is invalid or has expired', 400));
    }
    
    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // 3) Update changedPasswordAt property for the user
    // 4) Log the user in, send JWT
    createSendToken(user, 200, res);
  } catch (error) {
    next(error);
  }
};

exports.updatePassword = async (req, res, next) => {
  try {
    // 1) Get user from collection
    const user = await User.findById(req.user.id).select('+password');

    // 2) Check if POSTed current password is correct
    if (!(await user.comparePassword(req.body.passwordCurrent))) {
      return next(new AppError('Your current password is wrong.', 401));
    }

    // 3) If so, update password
    user.password = req.body.password;
    user.passwordChangedAt = Date.now();
    await user.save();
    // User.findByIdAndUpdate will NOT work as intended!

    // 4) Log user in, send JWT
    createSendToken(user, 200, res);
  } catch (error) {
    next(error);
  }
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

// Request new email verification
exports.requestVerificationEmail = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return next(new AppError('No user found with this email address', 404));
    }

    if (user.isEmailVerified) {
      return next(new AppError('Email is already verified', 400));
    }

    // Generate new email verification token
    const verificationToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Send verification email
    try {
      const emailService = require('../services/EmailService');
      await emailService.sendEmailVerification(user, verificationToken);

      res.status(200).json({
        success: true,
        message: 'Verification email sent successfully'
      });
    } catch (emailError) {
      logger.error('Failed to send verification email:', emailError);
      return next(new AppError('Failed to send verification email. Please try again later.', 500));
    }
  } catch (error) {
    next(error);
  }
};

// Verify email with token
exports.verifyEmail = async (req, res, next) => {
  try {
    // Hash the token from the URL params
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    // Find user with matching verification token and not expired
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return next(new AppError('Token is invalid or has expired', 400));
    }

    // Update user to mark email as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    await user.save({ validateBeforeSave: false });

    // Send welcome email
    try {
      const emailService = require('../services/EmailService');
      await emailService.sendWelcomeEmail(user);
    } catch (emailError) {
      logger.error('Failed to send welcome email:', emailError);
      // Don't prevent verification due to welcome email failure
    }

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

const passport = require('passport');
const { generateToken } = require('../utils/jwt');

// Create JWT token for OAuth authenticated user
const createOAuthToken = (user) => {
  return generateToken(user._id, process.env.JWT_EXPIRES_IN || '15m');
};

// Google OAuth login
exports.googleAuth = passport.authenticate('google', { scope: ['profile', 'email'] });

exports.googleAuthCallback = async (req, res, next) => {
  try {
    // The user is already authenticated by Passport
    if (!req.user) {
      return next(new AppError('Authentication failed', 401));
    }

    const token = createOAuthToken(req.user);

    // Remove password from output
    req.user.password = undefined;

    // Update last login time
    req.user.lastLoginAt = Date.now();
    await req.user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      token,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    next(error);
  }
};

// VK OAuth login
exports.vkAuth = passport.authenticate('vkontakte', { scope: ['email'] });

exports.vkAuthCallback = async (req, res, next) => {
  try {
    // The user is already authenticated by Passport
    if (!req.user) {
      return next(new AppError('Authentication failed', 401));
    }

    const token = createOAuthToken(req.user);

    // Remove password from output
    req.user.password = undefined;

    // Update last login time
    req.user.lastLoginAt = Date.now();
    await req.user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      token,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    next(error);
  }
};

// Yandex OAuth login
exports.yandexAuth = passport.authenticate('yandex');

exports.yandexAuthCallback = async (req, res, next) => {
  try {
    // The user is already authenticated by Passport
    if (!req.user) {
      return next(new AppError('Authentication failed', 401));
    }

    const token = createOAuthToken(req.user);

    // Remove password from output
    req.user.password = undefined;

    // Update last login time
    req.user.lastLoginAt = Date.now();
    await req.user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      token,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    next(error);
  }
};

// Refresh token functionality
exports.refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken || req.query.refreshToken;

    if (!refreshToken) {
      return next(new AppError('Refresh token is required', 400));
    }

    // In a real implementation, you would check if the refresh token is valid
    // For now, we'll verify it's a valid JWT and the user still exists
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (error) {
      return next(new AppError('Invalid refresh token', 403));
    }

    // Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    // In a full implementation, you'd also check if the refresh token is blacklisted
    // and maintain a refresh token database with user-specific tokens

    // Generate new access token
    const newAccessToken = jwt.sign({ id: currentUser._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m'
    });

    res.status(200).json({
      success: true,
      token: newAccessToken
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    // Get the token from the request
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      // Get user ID from token without verification (we're logging out anyway)
      // Since we're logging out, we just want to blacklist the token
      try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.id) {
          await blacklistToken(token, decoded.id, 'access');
        }
      } catch (decodeError) {
        // If we can't decode the token, just proceed with logout
        logger.warn('Could not decode token during logout:', decodeError.message);
      }
    }

    // Destroy Passport session if it exists
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          logger.error('Error destroying session during logout:', err);
        }
      });
    }

    // Logout user from Passport
    if (req.logout) {
      req.logout((err) => {
        if (err) {
          logger.error('Error logging out from Passport:', err);
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    next(error);
  }
};