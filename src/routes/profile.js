const express = require('express');
const router = express.Router();
const ProfileController = require('../controllers/profileController');
const { protect } = require('../middleware/auth');
const { requirePermissions } = require('../middleware/rbac');
const { validateCreateProfile, validateUpdateProfile } = require('../middleware/profileValidation');

// All routes are protected
router.use(protect);

// Get own profile
router.get('/me', ProfileController.getOwnProfile);

// Get specific user's profile
router.get('/user/:userId', ProfileController.getProfile);

// Create profile
router.post('/', validateCreateProfile, ProfileController.createProfile);

// Update own profile
router.put('/', validateUpdateProfile, ProfileController.updateProfile);

// Delete own profile
router.delete('/', ProfileController.deleteProfile);

// Get all profiles (admin access or public directory)
router.get('/', ProfileController.getAllProfiles);

// Search profiles
router.get('/search', ProfileController.searchProfiles);

module.exports = router;