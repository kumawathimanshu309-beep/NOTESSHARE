const teacherService = require('../services/teacherService');
const wrapAsync = require('../middleware/asyncWrapper');

/**
 * GET /teacher/dashboard
 * Protected Teacher Control Panel
 */
exports.getTeacherDashboard = wrapAsync(async (req, res) => {
  const dashboardData = await teacherService.getTeacherDashboardData(req.user._id);

  res.render('teacher/dashboard', {
    title: `${req.user.name}'s Teacher Dashboard — StudyShare`,
    path: '/teacher/dashboard',
    teacher: dashboardData.teacher,
    uploadedResources: dashboardData.uploadedResources,
    openDoubts: dashboardData.openDoubts,
    myAnswers: dashboardData.myAnswers,
    stats: dashboardData.stats,
  });
});

/**
 * GET /teachers/:username
 * Public Teacher Profile Page
 */
exports.getTeacherProfile = wrapAsync(async (req, res) => {
  const username = req.params.username;
  const { teacher, resources, answers, stats } = await teacherService.getTeacherProfileData(username);

  res.render('teachers/show', {
    title: `${teacher.name} — Verified Teacher Profile`,
    path: '/teachers',
    teacher,
    resources,
    answers,
    stats,
  });
});
