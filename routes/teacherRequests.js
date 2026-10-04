const express = require('express');
const router = express.Router();
const teacherRequestController = require('../controllers/teacherRequestController');
const { isLoggedIn } = require('../middleware/auth');
const { verifyCsrfToken } = require('../middleware/csrf');
const { validateTeacherRequest } = require('../validators/teacherRequestValidator');

// Protected Route: Submit Teacher Application or Candidate Recommendation
router.post('/', isLoggedIn, verifyCsrfToken, validateTeacherRequest, teacherRequestController.postCreateTeacherRequest);

module.exports = router;
