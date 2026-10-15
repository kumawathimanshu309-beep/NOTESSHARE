const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const adminController = require('../controllers/adminController');

// Home / Landing Page
router.get('/', homeController.getHome);

// About Page
router.get('/about', homeController.getAbout);

// Features Page
router.get('/features', homeController.getFeatures);

// Legal Pages
router.get('/privacy', homeController.getPrivacy);
router.get('/terms', homeController.getTerms);
router.get('/cookies', homeController.getCookies);

// Public Academic API for Dynamic Dropdowns
router.get('/api/fields', adminController.getApiActiveFields);
router.get('/api/branches', adminController.getApiActiveBranches);
router.get('/api/subjects', adminController.getApiActiveSubjects);
router.get('/api/subjects/:subjectId/topics', adminController.getApiActiveTopics);

// Dynamic XML Sitemap
router.get('/sitemap.xml', homeController.getSitemap);

module.exports = router;
