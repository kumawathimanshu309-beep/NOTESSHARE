const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

// Home / Landing Page
router.get('/', homeController.getHome);

// About Page
router.get('/about', homeController.getAbout);

// Features Page
router.get('/features', homeController.getFeatures);

module.exports = router;
