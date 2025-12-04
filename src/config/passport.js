// src/config/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const VKStrategy = require('passport-vkontakte').Strategy;
const YandexStrategy = require('passport-yandex').Strategy;
const User = require('../models/User');

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Find user by Google ID
    let user = await User.findOne({ 
      'oauth.googleId': profile.id 
    });

    if (user) {
      // Update access token if user already exists
      user.oauth.googleAccessToken = accessToken;
      await user.save();
      return done(null, user);
    }

    // Check if user exists with the same email
    user = await User.findOne({ email: profile.emails[0].value });
    
    if (user) {
      // Link Google account to existing user
      user.oauth.googleId = profile.id;
      user.oauth.googleAccessToken = accessToken;
      user.oauth.googleRefreshToken = refreshToken;
      await user.save();
      return done(null, user);
    }

    // Create new user
    const newUser = await User.create({
      email: profile.emails[0].value,
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
      oauth: {
        googleId: profile.id,
        googleAccessToken: accessToken,
        googleRefreshToken: refreshToken
      },
      isEmailVerified: true // OAuth emails are typically verified
    });

    return done(null, newUser);
  } catch (error) {
    return done(error, null);
  }
}));

// VK OAuth Strategy
passport.use(new VKStrategy({
  clientID: process.env.VK_CLIENT_ID,
  clientSecret: process.env.VK_CLIENT_SECRET,
  callbackURL: process.env.VK_CALLBACK_URL,
  scope: ['email'] // Request email permission
}, async (accessToken, refreshToken, params, profile, done) => {
  try {
    // Find user by VK ID
    let user = await User.findOne({ 
      'oauth.vkId': profile.id 
    });

    if (user) {
      // Update access token if user already exists
      user.oauth.vkAccessToken = accessToken;
      await user.save();
      return done(null, user);
    }

    // Check if user exists with the same email (if available)
    let email = null;
    if (params.email) {
      email = params.email;
      user = await User.findOne({ email });
    }
    
    if (user) {
      // Link VK account to existing user
      user.oauth.vkId = profile.id;
      user.oauth.vkAccessToken = accessToken;
      user.oauth.vkRefreshToken = refreshToken;
      await user.save();
      return done(null, user);
    }

    // Create new user
    const newUser = await User.create({
      email: email || `vk-${profile.id}@example.com`, // Use placeholder if no email
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
      oauth: {
        vkId: profile.id,
        vkAccessToken: accessToken,
        vkRefreshToken: refreshToken
      },
      isEmailVerified: !!email // Mark as verified if email was provided
    });

    return done(null, newUser);
  } catch (error) {
    return done(error, null);
  }
}));

// Yandex OAuth Strategy
passport.use(new YandexStrategy({
  clientID: process.env.YANDEX_CLIENT_ID,
  clientSecret: process.env.YANDEX_CLIENT_SECRET,
  callbackURL: process.env.YANDEX_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Find user by Yandex ID
    let user = await User.findOne({ 
      'oauth.yandexId': profile.id 
    });

    if (user) {
      // Update access token if user already exists
      user.oauth.yandexAccessToken = accessToken;
      await user.save();
      return done(null, user);
    }

    // Check if user exists with the same email
    user = await User.findOne({ email: profile.emails[0].value });
    
    if (user) {
      // Link Yandex account to existing user
      user.oauth.yandexId = profile.id;
      user.oauth.yandexAccessToken = accessToken;
      user.oauth.yandexRefreshToken = refreshToken;
      await user.save();
      return done(null, user);
    }

    // Create new user
    const newUser = await User.create({
      email: profile.emails[0].value,
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
      oauth: {
        yandexId: profile.id,
        yandexAccessToken: accessToken,
        yandexRefreshToken: refreshToken
      },
      isEmailVerified: true // OAuth emails are typically verified
    });

    return done(null, newUser);
  } catch (error) {
    return done(error, null);
  }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;