const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { isLoggedIn } = require('../middleware/auth');

// All notification routes require authentication
router.use(isLoggedIn);

// Specific named action routes must come BEFORE parametric /:id routes
router.get('/', notificationController.getNotifications);
router.post('/read-all', notificationController.postMarkAllAsRead);

router.patch('/:id/read', notificationController.patchMarkAsRead);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
