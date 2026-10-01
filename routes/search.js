const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

// Public Global Search Route
router.get('/', searchController.getGlobalSearch);

module.exports = router;
