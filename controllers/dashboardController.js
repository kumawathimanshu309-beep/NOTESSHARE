const wrapAsync = require('../middleware/asyncWrapper');
const socialService = require('../services/socialService');

// @desc    Render Protected Dashboard with role-specific views and analytics
// @route   GET /dashboard
exports.getDashboard = wrapAsync(async (req, res) => {
  // Admin role redirection to governance panel
  if (req.user.role === 'admin' || req.user.isAdmin) {
    return res.redirect('/admin');
  }

  const dashboardData = await socialService.getUserDashboardData(req.user._id, req.user.role, req.query);

  if (req.user.role === 'teacher') {
    return res.render('teacher/dashboard', {
      title: `Teacher Dashboard — ${req.user.name} | StudyShare`,
      path: '/dashboard',
      teacher: dashboardData.teacher,
      uploadedResources: dashboardData.uploadedResources,
      myAnswers: dashboardData.myAnswers,
      openDoubts: dashboardData.openDoubts,
      notifications: dashboardData.notifications,
      unreadNotificationsCount: dashboardData.unreadNotificationsCount,
      activityFeed: dashboardData.activityFeed,
      popularNotes: dashboardData.popularNotes,
      stats: dashboardData.stats,
      pagination: dashboardData.pagination,
    });
  }

  return res.render('dashboard/index', {
    title: `${req.user.name}'s Dashboard — StudyShare`,
    path: '/dashboard',
    user: dashboardData.user,
    uploadedNotes: dashboardData.uploadedNotes,
    bookmarkedNotes: dashboardData.bookmarkedNotes,
    likedNotes: dashboardData.likedNotes,
    myDoubts: dashboardData.myDoubts,
    userComments: dashboardData.userComments,
    notifications: dashboardData.notifications,
    unreadNotificationsCount: dashboardData.unreadNotificationsCount,
    activityFeed: dashboardData.activityFeed,
    popularNotes: dashboardData.popularNotes,
    stats: dashboardData.stats,
    pagination: dashboardData.pagination,
  });
});
