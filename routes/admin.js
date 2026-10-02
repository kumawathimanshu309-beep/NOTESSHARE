const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isLoggedIn, isAdmin } = require('../middleware/auth');
const { adminLimiter } = require('../middleware/rateLimiter');
const { verifyCsrfToken } = require('../middleware/csrf');

// All Admin Panel routes require active login + Admin role + rate limiting
router.use(isLoggedIn, isAdmin, adminLimiter);

// 1. Dashboard Overview
router.get('/', adminController.getAdminDashboard);

// 2. User & Role Management
router.get('/users', adminController.getUsers);
router.patch('/users/:id/role', verifyCsrfToken, adminController.patchUserRole);
router.post('/users/:id/role', verifyCsrfToken, adminController.patchUserRole);
router.post('/users/:id/demote', adminController.postDemoteTeacher);

// 2b. Teacher Governance Requests
router.get('/teacher-requests', adminController.getTeacherRequests);
router.post('/teacher-requests/:id/approve', adminController.postApproveTeacherRequest);
router.post('/teacher-requests/:id/reject', adminController.postRejectTeacherRequest);

// 3. Resource / Note Moderation
router.get('/notes', adminController.getNotes);
router.get('/pending-notes', adminController.getPendingNotes);
router.post('/notes/:id/approve', verifyCsrfToken, adminController.postApproveNote);
router.post('/notes/:id/reject', verifyCsrfToken, adminController.postRejectNote);
router.patch('/notes/:id/toggle-publish', verifyCsrfToken, adminController.patchToggleNotePublish);
router.post('/notes/:id/toggle-publish', verifyCsrfToken, adminController.patchToggleNotePublish);
router.delete('/notes/:id', verifyCsrfToken, adminController.deleteNote);
router.post('/notes/:id', verifyCsrfToken, adminController.deleteNote);
router.post('/notes/:id/delete', verifyCsrfToken, adminController.deleteNote);

// 4. Doubt Moderation
router.get('/doubts', adminController.getDoubts);
router.delete('/doubts/:id', adminController.deleteDoubt);

// 5. Home Page Content Management
router.get('/home-content', adminController.getHomeCards);
router.post('/home-content', adminController.postHomeCard);
router.patch('/home-content/:id/toggle-publish', adminController.patchToggleHomeCardPublish);
router.post('/home-content/:id/toggle-publish', adminController.patchToggleHomeCardPublish);
router.patch('/home-content/:id/toggle-enable', adminController.patchToggleHomeCardEnable);
router.post('/home-content/:id/toggle-enable', adminController.patchToggleHomeCardEnable);
router.patch('/home-content/:id/restore', adminController.restoreHomeCard);
router.post('/home-content/:id/restore', adminController.restoreHomeCard);
router.delete('/home-content/:id', adminController.deleteHomeCard);

// Features Cards Management
router.get('/features-cards', adminController.getFeatureCards);
router.post('/features-cards', adminController.postFeatureCard);
router.get('/features-cards/:id/edit', adminController.getEditFeatureCard);
router.post('/features-cards/:id/edit', adminController.postEditFeatureCard);
router.post('/features-cards/:id', adminController.postEditFeatureCard);
router.put('/features-cards/:id', adminController.postEditFeatureCard);
router.patch('/features-cards/:id/toggle-active', adminController.patchToggleFeatureCardActive);
router.post('/features-cards/:id/toggle-active', adminController.patchToggleFeatureCardActive);
router.delete('/features-cards/:id', adminController.deleteFeatureCard);
router.post('/features-cards/:id/delete', adminController.deleteFeatureCard);

// About Cards Management
router.get('/about-cards', adminController.getAboutCards);
router.post('/about-cards', adminController.postAboutCard);
router.get('/about-cards/:id/edit', adminController.getEditAboutCard);
router.post('/about-cards/:id/edit', adminController.postEditAboutCard);
router.post('/about-cards/:id', adminController.postEditAboutCard);
router.put('/about-cards/:id', adminController.postEditAboutCard);
router.patch('/about-cards/:id/toggle-active', adminController.patchToggleAboutCardActive);
router.post('/about-cards/:id/toggle-active', adminController.patchToggleAboutCardActive);
router.delete('/about-cards/:id', adminController.deleteAboutCard);
router.post('/about-cards/:id/delete', adminController.deleteAboutCard);

const { validateSubjectInput, validateTopicInput } = require('../validators/subjectValidator');

// 6. Audit Logs
router.get('/audit-logs', adminController.getAuditLogs);

// 7. Subject Governance
router.get('/subjects', adminController.getSubjects);
router.post('/subjects', validateSubjectInput, adminController.postCreateSubject);
router.patch('/subjects/:id', validateSubjectInput, adminController.patchUpdateSubject);
router.post('/subjects/:id', validateSubjectInput, adminController.patchUpdateSubject);
router.patch('/subjects/:id/toggle-active', adminController.patchToggleSubjectActive);
router.post('/subjects/:id/toggle-active', adminController.patchToggleSubjectActive);

// 8. Topic Governance
router.get('/subjects/:subjectId/topics', adminController.getSubjectTopics);
router.post('/subjects/:subjectId/topics', validateTopicInput, adminController.postCreateTopic);
router.patch('/subjects/:subjectId/topics/:topicId', validateTopicInput, adminController.patchUpdateTopic);
router.post('/subjects/:subjectId/topics/:topicId', validateTopicInput, adminController.patchUpdateTopic);
router.patch('/subjects/:subjectId/topics/:topicId/toggle-active', adminController.patchToggleTopicActive);
router.post('/subjects/:subjectId/topics/:topicId/toggle-active', adminController.patchToggleTopicActive);

module.exports = router;
