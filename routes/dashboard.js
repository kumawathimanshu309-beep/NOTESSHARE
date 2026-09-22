const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { isLoggedIn } = require('../middleware/auth');

// Protected Dashboard Route
router.get('/', isLoggedIn, dashboardController.getDashboard);

module.exports = router;
