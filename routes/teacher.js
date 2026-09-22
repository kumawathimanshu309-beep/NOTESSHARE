const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { isLoggedIn, isTeacher } = require('../middleware/auth');

// Protected Teacher Dashboard (/teacher/dashboard)
router.get('/dashboard', isLoggedIn, isTeacher, teacherController.getTeacherDashboard);

// Public Teacher Profile (/teachers/:username)
router.get('/:username', teacherController.getTeacherProfile);

module.exports = router;
