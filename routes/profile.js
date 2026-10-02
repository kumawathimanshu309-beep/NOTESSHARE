const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { isLoggedIn } = require('../middleware/auth');
const { handleAvatarUpload } = require('../middleware/upload');

// Profile Edit Routes (MUST come before /:username)
router.get('/', profileController.redirectToOwnProfile);
router.get('/edit', isLoggedIn, profileController.renderEditProfileForm);
router.post('/edit', isLoggedIn, handleAvatarUpload('avatarFile'), profileController.updateProfile);
router.post('/', isLoggedIn, handleAvatarUpload('avatarFile'), profileController.updateProfile);
router.put('/', isLoggedIn, handleAvatarUpload('avatarFile'), profileController.updateProfile);
router.put('/edit', isLoggedIn, handleAvatarUpload('avatarFile'), profileController.updateProfile);

// Public User Profile Route
router.get('/:username', profileController.renderProfile);

module.exports = router;
