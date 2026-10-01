const express = require('express');
const router = express.Router();
const facultyController = require('../controllers/facultyController');

// Public Faculty Directory Listing & Search
router.get('/', facultyController.getFacultyDirectory);

// Public Faculty Profile (by ObjectId or Username)
router.get('/:id', facultyController.getFacultyProfile);

module.exports = router;
