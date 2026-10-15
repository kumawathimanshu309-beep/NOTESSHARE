const wrapAsync = require('../middleware/asyncWrapper');
const socialService = require('../services/socialService');
const academicService = require('../services/academicService');
const TeacherRequest = require('../models/TeacherRequest');

// @desc    Render Protected Dashboard with role-specific views and analytics
// @route   GET /dashboard
exports.getDashboard = wrapAsync(async (req, res) => {
  // Admin role redirection to governance panel
  if (req.user.role === 'admin' || req.user.isAdmin) {
    return res.redirect('/admin');
  }

  const [dashboardData, activeSubjects, latestTeacherRequest] = await Promise.all([
    socialService.getUserDashboardData(req.user._id, req.user.role, req.query),
    academicService.getActiveSubjects(),
    req.user.role === 'student'
      ? TeacherRequest.findOne({ candidateUser: req.user._id })
          .populate('requestedBy', 'name username role')
          .populate('reviewedBy', 'name username')
          .sort({ createdAt: -1 })
          .lean()
      : Promise.resolve(null),
  ]);

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

  // Precompute whether the latest request was self-submitted or recommended by a teacher
  let processedTeacherRequest = null;
  if (latestTeacherRequest) {
    const reqById = latestTeacherRequest.requestedBy
      ? (latestTeacherRequest.requestedBy._id || latestTeacherRequest.requestedBy).toString()
      : '';
    const candId = latestTeacherRequest.candidateUser
      ? (latestTeacherRequest.candidateUser._id || latestTeacherRequest.candidateUser).toString()
      : req.user._id.toString();

    processedTeacherRequest = {
      ...latestTeacherRequest,
      isSelfRequest: reqById === candId,
    };
  }

  return res.render('dashboard/index', {
    title: `${req.user.name}'s Dashboard — StudyShare`,
    path: '/dashboard',
    user: dashboardData.user,
    activeSubjects,
    latestTeacherRequest: processedTeacherRequest,
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

