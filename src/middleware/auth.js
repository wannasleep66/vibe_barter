// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logger } = require('../logger/logger');
const AppError = require('../utils/AppError');
const { verifyTokenWithBlacklist, checkPasswordChangedAfterToken } = require('../utils/jwt');

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
    // 2) Verification token with blacklist check
    const decoded = await verifyTokenWithBlacklist(token);

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(
        new AppError('The user belonging to this token no longer exists.', 401)
      );
    }

    // 4) Check if user changed password after the token was issued
    if (checkPasswordChangedAfterToken(currentUser, decoded.iat)) {
      return next(
        new AppError('User recently changed password! Please log in again.', 401)
      );
    }

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = currentUser;
    next();
  } catch (error) {
    // If it's an AppError we threw, pass it along
    if (error.isOperational) {
      return next(error);
    }

    // For other errors (like JWT verification errors), return a generic message
    return next(new AppError('Invalid token. Please log in again.', 401));
  }
};

// Add to User model for password change check
User.prototype.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }

  return false;
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

module.exports = { protect: exports.protect, restrictTo: exports.restrictTo };