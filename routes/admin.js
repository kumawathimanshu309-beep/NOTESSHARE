const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isLoggedIn, isAdmin } = require('../middleware/auth');
const { adminLimiter } = require('../middleware/rateLimiter');

// All Admin Panel routes require active login + Admin role + rate limiting
router.use(isLoggedIn, isAdmin, adminLimiter);

// 1. Dashboard Overview
router.get('/', adminController.getAdminDashboard);

// 2. User & Role Management
router.get('/users', adminController.getUsers);
router.patch('/users/:id/role', adminController.patchUserRole);
router.post('/users/:id/demote', adminController.postDemoteTeacher);

// 2b. Teacher Governance Requests
router.get('/teacher-requests', adminController.getTeacherRequests);
router.post('/teacher-requests/:id/approve', adminController.postApproveTeacherRequest);
router.post('/teacher-requests/:id/reject', adminController.postRejectTeacherRequest);

// 3. Resource / Note Moderation
router.get('/notes', adminController.getNotes);
router.get('/pending-notes', adminController.getPendingNotes);
router.post('/notes/:id/approve', adminController.postApproveNote);
router.post('/notes/:id/reject', adminController.postRejectNote);
router.patch('/notes/:id/toggle-publish', adminController.patchToggleNotePublish);
router.delete('/notes/:id', adminController.deleteNote);

// 4. Doubt Moderation
router.get('/doubts', adminController.getDoubts);
router.delete('/doubts/:id', adminController.deleteDoubt);

// 5. Home Page Content Management
router.get('/home-content', adminController.getHomeCards);
router.post('/home-content', adminController.postHomeCard);
router.patch('/home-content/:id/toggle-publish', adminController.patchToggleHomeCardPublish);
router.patch('/home-content/:id/toggle-enable', adminController.patchToggleHomeCardEnable);
router.patch('/home-content/:id/restore', adminController.restoreHomeCard);
router.delete('/home-content/:id', adminController.deleteHomeCard);

// 6. Audit Logs
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
