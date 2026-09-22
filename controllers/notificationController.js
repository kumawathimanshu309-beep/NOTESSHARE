const notificationService = require('../services/notificationService');
const wrapAsync = require('../middleware/asyncWrapper');

// @desc    Render Notification Center
// @route   GET /notifications
exports.getNotifications = wrapAsync(async (req, res) => {
  const result = await notificationService.getUserNotifications(req.user._id, req.query);

  res.render('notifications/index', {
    title: 'Notifications — StudyShare',
    path: '/notifications',
    notifications: result.notifications,
    totalCount: result.totalCount,
    unreadCount: result.unreadCount,
    page: result.page,
    totalPages: result.totalPages,
  });
});

// @desc    Mark single notification as read
// @route   PATCH /notifications/:id/read
exports.patchMarkAsRead = wrapAsync(async (req, res) => {
  const notification = await notificationService.markAsRead(req.params.id, req.user._id);

  if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
    return res.json({ success: true, notification });
  }

  req.flash('success', 'Notification marked as read.');
  res.redirect('/notifications');
});

// @desc    Mark all notifications as read for current user
// @route   POST /notifications/read-all
exports.postMarkAllAsRead = wrapAsync(async (req, res) => {
  const count = await notificationService.markAllAsRead(req.user._id);

  if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
    return res.json({ success: true, markedCount: count });
  }

  req.flash('success', `${count} notification${count === 1 ? '' : 's'} marked as read.`);
  res.redirect('/notifications');
});

// @desc    Delete / dismiss a single notification
// @route   DELETE /notifications/:id
exports.deleteNotification = wrapAsync(async (req, res) => {
  await notificationService.deleteNotification(req.params.id, req.user._id);

  if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
    return res.json({ success: true });
  }

  req.flash('success', 'Notification removed.');
  res.redirect('/notifications');
});
