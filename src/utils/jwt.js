// src/utils/jwt.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('./AppError');

const generateToken = (id, expiresIn = process.env.JWT_EXPIRES_IN) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: expiresIn,
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

// Function to check if token is blacklisted
const isTokenBlacklisted = async (token) => {
  try {
    const blacklistedToken = await TokenBlacklist.findOne({ token });
    return !!blacklistedToken;
  } catch (error) {
    console.error('Error checking token blacklist:', error);
    return false; // Fail gracefully
  }
};

// Function to blacklist a token
const blacklistToken = async (token, userId, type = 'access', expiresIn = '15m') => {
  try {
    // Calculate expiry time based on expiresIn string
    let expiryDate = new Date();
    if (expiresIn.includes('d')) {
      // If it's in days
      const days = parseInt(expiresIn);
      expiryDate.setDate(expiryDate.getDate() + days);
    } else if (expiresIn.includes('h')) {
      // If it's in hours
      const hours = parseInt(expiresIn);
      expiryDate.setHours(expiryDate.getHours() + hours);
    } else if (expiresIn.includes('m')) {
      // If it's in minutes
      const minutes = parseInt(expiresIn);
      expiryDate.setMinutes(expiryDate.getMinutes() + minutes);
    } else if (expiresIn.includes('s')) {
      // If it's in seconds
      const seconds = parseInt(expiresIn);
      expiryDate.setSeconds(expiryDate.getSeconds() + seconds);
    }

    const blacklistedToken = new TokenBlacklist({
      token,
      userId,
      type,
      expiresAt: expiryDate
    });

    await blacklistedToken.save();
    return blacklistedToken;
  } catch (error) {
    console.error('Error blacklisting token:', error);
    throw new AppError('Could not blacklist token', 500);
  }
};

// Enhanced verification with blacklist check
const verifyTokenWithBlacklist = async (token) => {
  try {
    if (await isTokenBlacklisted(token)) {
      throw new AppError('Token has been invalidated. Please log in again.', 401);
    }

    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token has expired. Please log in again.', 401);
    }
    throw error;
  }
};

// Create access and refresh tokens
const createTokens = (user) => {
  const accessToken = generateToken(user._id, process.env.JWT_ACCESS_EXPIRES_IN || '15m');
  const refreshToken = generateToken(user._id, process.env.JWT_REFRESH_EXPIRES_IN || '7d');

  return {
    accessToken,
    refreshToken
  };
};

// Function to check if user changed password after token was issued
const checkPasswordChangedAfterToken = (user, jwtTimestamp) => {
  if (user.passwordChangedAt) {
    const changedTimestamp = parseInt(user.passwordChangedAt.getTime() / 1000, 10);
    return jwtTimestamp < changedTimestamp;
  }
  return false;
};

module.exports = {
  generateToken,
  verifyToken,
  verifyTokenWithBlacklist,
  isTokenBlacklisted,
  blacklistToken,
  createTokens,
  checkPasswordChangedAfterToken
};