const express = require('express');
const router = express.Router();
const ProfileController = require('../controllers/profileController');
const FileHandler = require('../utils/FileHandler');
const { protect } = require('../middleware/auth');
const { requirePermissions } = require('../middleware/rbac');
const { validateCreateProfile, validateUpdateProfile } = require('../middleware/profileValidation');

const fileHandler = new FileHandler('./uploads');

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

// Upload profile photo
router.post('/photo', fileHandler.createProfilePhotoUploadMiddleware('photo'), ProfileController.uploadProfilePhoto);

// Remove profile photo
router.delete('/photo', ProfileController.removeProfilePhoto);

// Skills routes - all protected
router.post('/skills', require('../middleware/profileValidation').validateAddSkill, ProfileController.addSkill);
router.get('/skills', ProfileController.getSkills);
router.put('/skills', require('../middleware/profileValidation').validateUpdateSkill, ProfileController.updateSkill);
router.delete('/skills/:skill', ProfileController.removeSkill);

// Languages routes - all protected
router.post('/languages', require('../middleware/profileValidation').validateAddLanguage, ProfileController.addLanguage);
router.get('/languages', ProfileController.getLanguages);
router.put('/languages', require('../middleware/profileValidation').validateUpdateLanguage, ProfileController.updateLanguage);
router.delete('/languages/:language', ProfileController.removeLanguage);

module.exports = router;