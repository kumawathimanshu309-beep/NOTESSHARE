const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { isLoggedIn, isTeacher } = require('../middleware/auth');

// Protected Teacher Dashboard (/teacher/dashboard)
router.get('/dashboard', isLoggedIn, isTeacher, teacherController.getTeacherDashboard);

// Protected Teacher Subjects & Topics Management (/teacher/subjects)
router.get('/subjects', isLoggedIn, isTeacher, teacherController.getMySubjects);
router.get('/subjects/:subjectId/topics', isLoggedIn, isTeacher, teacherController.getSubjectTopics);
router.post('/subjects/:subjectId/topics', isLoggedIn, isTeacher, teacherController.postCreateTopic);
router.post('/subjects/:subjectId/topics/:topicId/edit', isLoggedIn, isTeacher, teacherController.postUpdateTopic);
router.post('/subjects/:subjectId/topics/:topicId/toggle-active', isLoggedIn, isTeacher, teacherController.postToggleTopicActive);

// Public Teacher Profile (/teachers/:username)
router.get('/:username', teacherController.getTeacherProfile);

module.exports = router;
