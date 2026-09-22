const express = require('express');
const router = express.Router();
const teacherRequestController = require('../controllers/teacherRequestController');
const { isLoggedIn } = require('../middleware/auth');

// Protected Route: Submit Teacher Application or Candidate Recommendation
router.post('/', isLoggedIn, teacherRequestController.postCreateTeacherRequest);

module.exports = router;
