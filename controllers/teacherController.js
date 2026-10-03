const mongoose = require('mongoose');
const teacherService = require('../services/teacherService');
const academicService = require('../services/academicService');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const wrapAsync = require('../middleware/asyncWrapper');

/**
 * GET /teacher/dashboard
 * Protected Teacher Control Panel
 */
exports.getTeacherDashboard = wrapAsync(async (req, res) => {
  // If user is admin without teacher capability, redirect to admin governance panel
  const hasTeacherAccess =
    req.user.role === 'teacher' ||
    (req.user.role === 'admin' &&
      (req.user.isTeacherCapability ||
        req.user.canAccessTeacher ||
        (typeof req.user.hasTeacherAccess === 'function' && req.user.hasTeacherAccess())));

  if (!hasTeacherAccess) {
    if (req.user.role === 'admin' || req.user.isAdmin) {
      return res.redirect('/admin');
    }
    return res.redirect('/dashboard');
  }

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
 * GET /teacher/subjects
 * View assigned subjects for the authenticated teacher
 */
exports.getMySubjects = wrapAsync(async (req, res) => {
  const allActiveSubjects = await Subject.find({ isActive: true }).sort({ name: 1 }).lean();

  // Filter ONLY subjects assigned to this teacher (or all active if admin)
  const assignedSubjects = allActiveSubjects.filter((s) =>
    academicService.isTeacherAssignedToSubject(req.user, s)
  );

  // Count topics for each assigned subject
  const subjectIds = assignedSubjects.map((s) => s._id);
  const topicCounts = await Topic.aggregate([
    { $match: { subject: { $in: subjectIds } } },
    { $group: { _id: '$subject', count: { $sum: 1 } } },
  ]);

  const countMap = {};
  topicCounts.forEach((tc) => {
    countMap[tc._id.toString()] = tc.count;
  });

  const subjectsWithCounts = assignedSubjects.map((s) => ({
    ...s,
    topicCount: countMap[s._id.toString()] || 0,
  }));

  res.render('teacher/subjects', {
    title: 'My Subjects & Topics — Teacher Portal | StudyShare',
    path: '/teacher/subjects',
    teacher: req.user,
    subjects: subjectsWithCounts,
  });
});

/**
 * GET /teacher/subjects/:subjectId/topics
 * View and manage topics inside an assigned subject
 */
exports.getSubjectTopics = wrapAsync(async (req, res) => {
  const { subjectId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(subjectId)) {
    req.flash('error', 'Invalid subject identifier.');
    return res.status(400).redirect('/teacher/subjects');
  }

  const subject = await Subject.findById(subjectId).lean();
  if (!subject) {
    req.flash('error', 'Subject not found.');
    return res.status(404).redirect('/teacher/subjects');
  }

  // MANDATORY SECURITY: Verify teacher is assigned to this subject
  if (!academicService.isTeacherAssignedToSubject(req.user, subject)) {
    req.flash('error', `Access denied. You are not assigned to manage topics for "${subject.name}".`);
    return res.status(403).redirect('/teacher/subjects');
  }

  const topics = await Topic.find({ subject: subject._id }).sort({ createdAt: -1 }).lean();

  res.render('teacher/topics', {
    title: `${subject.name} Topics — Teacher Portal | StudyShare`,
    path: '/teacher/subjects',
    teacher: req.user,
    subject,
    topics,
  });
});

/**
 * POST /teacher/subjects/:subjectId/topics
 * Create a new topic under an assigned subject (subject automatically linked)
 */
exports.postCreateTopic = wrapAsync(async (req, res) => {
  const { subjectId } = req.params;
  const { name, description } = req.body;

  if (!mongoose.Types.ObjectId.isValid(subjectId)) {
    req.flash('error', 'Invalid subject identifier.');
    return res.status(400).redirect('/teacher/subjects');
  }

  const subject = await Subject.findById(subjectId);
  if (!subject) {
    req.flash('error', 'Subject not found.');
    return res.status(404).redirect('/teacher/subjects');
  }

  // MANDATORY SECURITY: Verify teacher is assigned to this subject
  if (!academicService.isTeacherAssignedToSubject(req.user, subject)) {
    req.flash('error', `Access denied. You cannot create topics for unassigned subject "${subject.name}".`);
    return res.status(403).redirect('/teacher/subjects');
  }

  if (!name || !name.trim()) {
    req.flash('error', 'Topic name is required.');
    return res.status(400).redirect(`/teacher/subjects/${subjectId}/topics`);
  }

  try {
    const topic = await academicService.createTopic(subject._id, {
      name: name.trim(),
      description: description ? description.trim() : '',
    });

    req.flash('success', `Topic "${topic.name}" created successfully under ${subject.name}.`);
    res.redirect(303, `/teacher/subjects/${subjectId}/topics`);
  } catch (err) {
    req.flash('error', err.message || 'Failed to create topic.');
    res.redirect(303, `/teacher/subjects/${subjectId}/topics`);
  }
});

/**
 * POST /teacher/subjects/:subjectId/topics/:topicId/edit
 * Edit topic name & description under an assigned subject
 */
exports.postUpdateTopic = wrapAsync(async (req, res) => {
  const { subjectId, topicId } = req.params;
  const { name, description } = req.body;

  if (!mongoose.Types.ObjectId.isValid(subjectId) || !mongoose.Types.ObjectId.isValid(topicId)) {
    req.flash('error', 'Invalid identifier.');
    return res.status(400).redirect('/teacher/subjects');
  }

  const subject = await Subject.findById(subjectId).lean();
  if (!subject || !academicService.isTeacherAssignedToSubject(req.user, subject)) {
    req.flash('error', 'Access denied. You are not assigned to manage this subject.');
    return res.status(403).redirect('/teacher/subjects');
  }

  const topic = await Topic.findOne({ _id: topicId, subject: subjectId });
  if (!topic) {
    req.flash('error', 'Topic not found under this subject.');
    return res.status(404).redirect(`/teacher/subjects/${subjectId}/topics`);
  }

  try {
    const updated = await academicService.updateTopic(topicId, {
      name: name ? name.trim() : topic.name,
      description: typeof description !== 'undefined' ? description.trim() : topic.description,
    });

    req.flash('success', `Topic "${updated.name}" updated successfully.`);
    res.redirect(303, `/teacher/subjects/${subjectId}/topics`);
  } catch (err) {
    req.flash('error', err.message || 'Failed to update topic.');
    res.redirect(303, `/teacher/subjects/${subjectId}/topics`);
  }
});

/**
 * POST /teacher/subjects/:subjectId/topics/:topicId/toggle-active
 * Toggle topic active status (soft-delete / deactivation)
 */
exports.postToggleTopicActive = wrapAsync(async (req, res) => {
  const { subjectId, topicId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(subjectId) || !mongoose.Types.ObjectId.isValid(topicId)) {
    req.flash('error', 'Invalid identifier.');
    return res.status(400).redirect('/teacher/subjects');
  }

  const subject = await Subject.findById(subjectId).lean();
  if (!subject || !academicService.isTeacherAssignedToSubject(req.user, subject)) {
    req.flash('error', 'Access denied. You are not assigned to manage this subject.');
    return res.status(403).redirect('/teacher/subjects');
  }

  const topic = await Topic.findOne({ _id: topicId, subject: subjectId });
  if (!topic) {
    req.flash('error', 'Topic not found under this subject.');
    return res.status(404).redirect(`/teacher/subjects/${subjectId}/topics`);
  }

  try {
    const updated = await academicService.toggleTopicActive(topicId);
    req.flash('success', `Topic "${updated.name}" is now ${updated.isActive ? 'Active' : 'Inactive'}.`);
    res.redirect(303, `/teacher/subjects/${subjectId}/topics`);
  } catch (err) {
    req.flash('error', err.message || 'Failed to toggle topic status.');
    res.redirect(303, `/teacher/subjects/${subjectId}/topics`);
  }
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
