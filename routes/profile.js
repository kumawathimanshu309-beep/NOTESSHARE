const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { isLoggedIn } = require('../middleware/auth');

// Profile Edit Routes (MUST come before /:username)
router.get('/', profileController.redirectToOwnProfile);
router.get('/edit', isLoggedIn, profileController.renderEditProfileForm);
router.post('/edit', isLoggedIn, profileController.updateProfile);
router.post('/', isLoggedIn, profileController.updateProfile);
router.put('/', isLoggedIn, profileController.updateProfile);
router.put('/edit', isLoggedIn, profileController.updateProfile);

// Public User Profile Route
router.get('/:username', profileController.renderProfile);

module.exports = router;
