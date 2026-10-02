const mongoose = require('mongoose');
const User = require('../models/User');
const Note = require('../models/Note');
const Doubt = require('../models/Doubt');
const Answer = require('../models/Answer');
const Comment = require('../models/Comment');
const HomeCard = require('../models/HomeCard');
const FeatureCard = require('../models/FeatureCard');
const AboutCard = require('../models/AboutCard');
const AuditLog = require('../models/AuditLog');
const TeacherRequest = require('../models/TeacherRequest');
const governanceService = require('../services/governanceService');
const notificationService = require('../services/notificationService');
const academicService = require('../services/academicService');
const wrapAsync = require('../middleware/asyncWrapper');
const AppError = require('../utils/AppError');

/**
 * Helper to validate HomeCard internal relative URL security
 */
const validateHomeCardUrl = (urlStr) => {
  if (!urlStr || typeof urlStr !== 'string') {
    throw new AppError('Target URL is required.', 400);
  }
  const trimmed = urlStr.trim();
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.includes('javascript:') ||
    trimmed.includes('data:') ||
    trimmed.includes('vbscript:')
  ) {
    throw new AppError('Invalid HomeCard URL. Only internal relative routes starting with / are allowed.', 400);
  }
  return trimmed;
};

// @desc    Render Admin Control Panel Dashboard with Real DB Statistics
// @route   GET /admin
exports.getAdminDashboard = wrapAsync(async (req, res) => {
  const [
    totalUsers,
    studentCount,
    teacherCount,
    adminCount,
    totalNotes,
    publishedNotesCount,
    privateNotesCount,
    totalDoubts,
    openDoubtsCount,
    resolvedDoubtsCount,
    totalAnswers,
    totalComments,
    pendingTeacherRequestsCount,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'teacher' }),
    User.countDocuments({ role: 'admin' }),
    Note.countDocuments({ isDeleted: false }),
    Note.countDocuments({ isPublished: true, isDeleted: false }),
    Note.countDocuments({ visibility: 'private', isDeleted: false }),
    Doubt.countDocuments({ isDeleted: false }),
    Doubt.countDocuments({ status: 'open', isDeleted: false }),
    Doubt.countDocuments({ status: 'resolved', isDeleted: false }),
    Answer.countDocuments({ isDeleted: false }),
    Comment.countDocuments({ isDeleted: false }),
    TeacherRequest.countDocuments({ status: 'pending' }),
  ]);

  const recentAuditLogs = await AuditLog.find()
    .populate('admin', 'name username')
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  res.render('admin/dashboard', {
    title: 'Admin Control Panel — StudyShare',
    path: '/admin',
    user: req.user,
    stats: {
      totalUsers,
      studentCount,
      teacherCount,
      adminCount,
      totalNotes,
      publishedNotesCount,
      privateNotesCount,
      totalDoubts,
      openDoubtsCount,
      resolvedDoubtsCount,
      totalAnswers,
      totalComments,
      pendingTeacherRequestsCount,
    },
    recentAuditLogs,
  });
});

// @desc    Get Paginated Users List for Governance & Role Management
// @route   GET /admin/users
exports.getUsers = wrapAsync(async (req, res) => {
  const { search, role, page = 1, limit = 20 } = req.query;
  const filter = {};

  if (role && ['student', 'teacher', 'admin'].includes(role)) {
    filter.role = role;
  }

  if (search && search.trim()) {
    const sanitizedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: sanitizedSearch, $options: 'i' } },
      { username: { $regex: sanitizedSearch, $options: 'i' } },
      { email: { $regex: sanitizedSearch, $options: 'i' } },
    ];
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (parsedPage - 1) * parsedLimit;

  // Never return password hashes in admin user listing
  const [users, totalCount] = await Promise.all([
    User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    User.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalCount / parsedLimit) || 1;

  res.render('admin/users', {
    title: 'User Management — Admin Panel',
    path: '/admin/users',
    users,
    totalCount,
    page: parsedPage,
    totalPages,
    query: req.query,
  });
});

// @desc    Update User Role with Strict Last-Admin Protection & Audit Logging
// @route   PATCH /admin/users/:id/role
exports.patchUserRole = wrapAsync(async (req, res) => {
  const { id } = req.params;
  const { role: newRole } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid user identifier.', 400);
  }

  const allowedRoles = ['student', 'teacher', 'admin'];
  if (!newRole || !allowedRoles.includes(newRole)) {
    throw new AppError('Invalid role specified.', 400);
  }

  const targetUser = await User.findById(id);
  if (!targetUser) {
    throw new AppError('Target user account not found.', 404);
  }

  const previousRole = targetUser.role;

  // Rule: Last-Admin Protection
  // If target user is an admin and new role is not admin, ensure at least one other admin remains in the DB
  if (previousRole === 'admin' && newRole !== 'admin') {
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    if (totalAdmins <= 1) {
      throw new AppError('Cannot remove or demote the last remaining administrator on the platform.', 400);
    }
  }

  targetUser.role = newRole;
  await targetUser.save();

  // Audit Log Entry
  await AuditLog.create({
    admin: req.user._id,
    action: 'ROLE_CHANGED',
    targetType: 'User',
    targetId: targetUser._id,
    details: {
      targetUsername: targetUser.username,
      previousRole,
      newRole,
    },
  });

  const successMsg = `Role for @${targetUser.username} updated to ${newRole.toUpperCase()}.`;

  const isAjax =
    req.xhr ||
    req.headers['x-requested-with'] === 'XMLHttpRequest' ||
    req.headers.accept?.includes('application/json');

  if (isAjax) {
    return res.json({
      success: true,
      message: successMsg,
      userId: targetUser._id,
      username: targetUser.username,
      role: newRole,
    });
  }

  req.flash('success', successMsg);
  res.redirect(303, '/admin/users');
});

// @desc    Get Resources / Notes List for Admin Moderation
// @route   GET /admin/notes
exports.getNotes = wrapAsync(async (req, res) => {
  const { search, role, status, page = 1, limit = 20 } = req.query;
  const filter = { isDeleted: false };

  if (search && search.trim()) {
    const sanitizedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { title: { $regex: sanitizedSearch, $options: 'i' } },
      { subject: { $regex: sanitizedSearch, $options: 'i' } },
      { topic: { $regex: sanitizedSearch, $options: 'i' } },
    ];
  }

  if (status === 'published') {
    filter.isPublished = true;
  } else if (status === 'unpublished') {
    filter.isPublished = false;
  }

  if (role && ['student', 'teacher', 'admin'].includes(role.toLowerCase())) {
    const matchingUsers = await User.find({ role: role.toLowerCase() }).select('_id').lean();
    const userIds = matchingUsers.map((u) => u._id);
    filter.author = { $in: userIds };
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (parsedPage - 1) * parsedLimit;

  const [notes, totalCount] = await Promise.all([
    Note.find(filter)
      .populate('author', 'name username email role avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    Note.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalCount / parsedLimit) || 1;

  res.render('admin/notes', {
    title: 'Resource & Note Moderation — Admin Panel',
    path: '/admin/notes',
    notes,
    totalCount,
    page: parsedPage,
    totalPages,
    query: req.query,
  });
});

// @desc    Admin Toggle Note Published Status
// @route   PATCH /admin/notes/:id/toggle-publish
exports.patchToggleNotePublish = wrapAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid note identifier.', 400);

  const note = await Note.findById(id);
  if (!note || note.isDeleted) throw new AppError('Note not found.', 404);

  note.isPublished = !note.isPublished;
  await note.save();

  await AuditLog.create({
    admin: req.user._id,
    action: note.isPublished ? 'NOTE_PUBLISHED' : 'NOTE_UNPUBLISHED',
    targetType: 'Note',
    targetId: note._id,
    details: { title: note.title, isPublished: note.isPublished },
  });

  const successMsg = `Note "${note.title}" ${note.isPublished ? 'published' : 'unpublished'}.`;

  const isAjax =
    req.xhr ||
    req.headers['x-requested-with'] === 'XMLHttpRequest' ||
    req.headers.accept?.includes('application/json');

  if (isAjax) {
    return res.json({
      success: true,
      message: successMsg,
      noteId: note._id,
      isPublished: note.isPublished,
    });
  }

  req.flash('success', successMsg);
  res.redirect(303, '/admin/notes');
});

// @desc    Admin Soft Delete Note
// @route   DELETE /admin/notes/:id
exports.deleteNote = wrapAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid note identifier.', 400);

  const note = await Note.findById(id);
  if (!note || note.isDeleted) throw new AppError('Note not found or already deleted.', 404);

  note.isDeleted = true;
  note.deletedAt = new Date();
  note.deletedBy = req.user._id;
  await note.save();

  await AuditLog.create({
    admin: req.user._id,
    action: 'NOTE_DELETED',
    targetType: 'Note',
    targetId: note._id,
    details: { title: note.title },
  });

  const successMsg = `Note "${note.title}" deleted.`;

  const isAjax =
    req.xhr ||
    req.headers['x-requested-with'] === 'XMLHttpRequest' ||
    req.headers.accept?.includes('application/json');

  if (isAjax) {
    return res.json({
      success: true,
      message: successMsg,
      noteId: note._id,
    });
  }

  req.flash('success', successMsg);
  res.redirect(303, '/admin/notes');
});

// @desc    Get Doubts for Admin Moderation
// @route   GET /admin/doubts
exports.getDoubts = wrapAsync(async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const filter = { isDeleted: false };

  if (search && search.trim()) {
    const sanitizedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { title: { $regex: sanitizedSearch, $options: 'i' } },
      { subject: { $regex: sanitizedSearch, $options: 'i' } },
    ];
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (parsedPage - 1) * parsedLimit;

  const [doubts, totalCount] = await Promise.all([
    Doubt.find(filter)
      .populate('student', 'name username role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    Doubt.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalCount / parsedLimit) || 1;

  res.render('admin/doubts', {
    title: 'Doubt Moderation — Admin Panel',
    path: '/admin/doubts',
    doubts,
    totalCount,
    page: parsedPage,
    totalPages,
    query: req.query,
  });
});

// @desc    Admin Soft Delete Doubt
// @route   DELETE /admin/doubts/:id
exports.deleteDoubt = wrapAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid doubt identifier.', 400);

  const doubt = await Doubt.findById(id);
  if (!doubt || doubt.isDeleted) throw new AppError('Doubt not found or already deleted.', 404);

  doubt.isDeleted = true;
  doubt.deletedAt = new Date();
  doubt.deletedBy = req.user._id;
  await doubt.save();

  await AuditLog.create({
    admin: req.user._id,
    action: 'DOUBT_DELETED',
    targetType: 'Doubt',
    targetId: doubt._id,
    details: { title: doubt.title },
  });

  req.flash('success', `Doubt "${doubt.title}" deleted.`);
  res.redirect(303, '/admin/doubts');
});

// @desc    Get Home Page Dynamic Content Cards for Admin Management
// @route   GET /admin/home-content
exports.getHomeCards = wrapAsync(async (req, res) => {
  const cards = await HomeCard.find({ isDeleted: false })
    .populate('createdBy', 'name username')
    .sort({ order: 1, createdAt: -1 })
    .lean();

  res.render('admin/home_content', {
    title: 'Home Page Content Management — Admin Panel',
    path: '/admin/home-content',
    cards,
  });
});

// @desc    Create New Home Page Card
// @route   POST /admin/home-content
exports.postHomeCard = wrapAsync(async (req, res) => {
  const { title, description, icon, ctaText, url, order } = req.body;

  const safeUrl = validateHomeCardUrl(url);

  const card = await HomeCard.create({
    title: title.trim(),
    description: description.trim(),
    icon: icon ? icon.trim() : '★',
    ctaText: ctaText ? ctaText.trim() : 'Explore Resource',
    url: safeUrl,
    order: parseInt(order, 10) || 0,
    isPublished: true,
    isEnabled: true,
    createdBy: req.user._id,
    updatedBy: req.user._id,
  });

  await AuditLog.create({
    admin: req.user._id,
    action: 'HOME_CARD_CREATED',
    targetType: 'HomeCard',
    targetId: card._id,
    details: { title: card.title, url: card.url },
  });

  req.flash('success', `Home Card "${card.title}" created successfully.`);
  res.redirect(303, '/admin/home-content');
});

// @desc    Toggle Home Page Card Published State
// @route   PATCH /admin/home-content/:id/toggle-publish
exports.patchToggleHomeCardPublish = wrapAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid card identifier.', 400);

  const card = await HomeCard.findById(id);
  if (!card || card.isDeleted) throw new AppError('Home Card not found.', 404);

  card.isPublished = !card.isPublished;
  card.updatedBy = req.user._id;
  await card.save();

  await AuditLog.create({
    admin: req.user._id,
    action: card.isPublished ? 'HOME_CARD_PUBLISHED' : 'HOME_CARD_UNPUBLISHED',
    targetType: 'HomeCard',
    targetId: card._id,
    details: { title: card.title, isPublished: card.isPublished },
  });

  req.flash('success', `Home Card "${card.title}" ${card.isPublished ? 'published' : 'unpublished'}.`);
  res.redirect(303, '/admin/home-content');
});

// @desc    Toggle Home Page Card Enabled State
// @route   PATCH /admin/home-content/:id/toggle-enable
exports.patchToggleHomeCardEnable = wrapAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid card identifier.', 400);

  const card = await HomeCard.findById(id);
  if (!card || card.isDeleted) throw new AppError('Home Card not found.', 404);

  card.isEnabled = !card.isEnabled;
  card.updatedBy = req.user._id;
  await card.save();

  await AuditLog.create({
    admin: req.user._id,
    action: card.isEnabled ? 'HOME_CARD_ENABLED' : 'HOME_CARD_DISABLED',
    targetType: 'HomeCard',
    targetId: card._id,
    details: { title: card.title, isEnabled: card.isEnabled },
  });

  req.flash('success', `Home Card "${card.title}" ${card.isEnabled ? 'enabled' : 'disabled'}.`);
  res.redirect(303, '/admin/home-content');
});

// @desc    Soft Delete Home Page Card
// @route   DELETE /admin/home-content/:id
exports.deleteHomeCard = wrapAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid card identifier.', 400);

  const card = await HomeCard.findById(id);
  if (!card || card.isDeleted) throw new AppError('Home Card not found.', 404);

  card.isDeleted = true;
  card.updatedBy = req.user._id;
  await card.save();

  await AuditLog.create({
    admin: req.user._id,
    action: 'HOME_CARD_DELETED',
    targetType: 'HomeCard',
    targetId: card._id,
    details: { title: card.title },
  });

  req.flash('success', `Home Card "${card.title}" soft deleted.`);
  res.redirect(303, '/admin/home-content');
});

// @desc    Restore Soft-Deleted Home Page Card
// @route   PATCH /admin/home-content/:id/restore
exports.restoreHomeCard = wrapAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid card identifier.', 400);

  const card = await HomeCard.findById(id);
  if (!card) throw new AppError('Home Card not found.', 404);

  card.isDeleted = false;
  card.updatedBy = req.user._id;
  await card.save();

  await AuditLog.create({
    admin: req.user._id,
    action: 'HOME_CARD_RESTORED',
    targetType: 'HomeCard',
    targetId: card._id,
    details: { title: card.title },
  });

  req.flash('success', `Home Card "${card.title}" restored.`);
  res.redirect(303, '/admin/home-content');
});

// @desc    Get Paginated System Audit Logs
// @route   GET /admin/audit-logs
exports.getAuditLogs = wrapAsync(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (parsedPage - 1) * parsedLimit;

  const [logs, totalCount] = await Promise.all([
    AuditLog.find()
      .populate('admin', 'name username role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    AuditLog.countDocuments(),
  ]);

  const totalPages = Math.ceil(totalCount / parsedLimit) || 1;

  res.render('admin/audit_logs', {
    title: 'Audit Logs — Admin Panel',
    path: '/admin/audit-logs',
    logs,
    totalCount,
    page: parsedPage,
    totalPages,
    query: req.query,
  });
});

// @desc    Get Paginated Teacher Requests for HOD/Admin Review
// @route   GET /admin/teacher-requests
exports.getTeacherRequests = wrapAsync(async (req, res) => {
  const result = await governanceService.getTeacherRequests(req.query);

  res.render('admin/teacher_requests', {
    title: 'Teacher Governance & Requests — Admin Panel',
    path: '/admin/teacher-requests',
    requests: result.requests,
    pagination: result.pagination,
    query: req.query,
  });
});

// @desc    Approve Pending Teacher Request & Promote User Role to Teacher
// @route   POST /admin/teacher-requests/:id/approve
exports.postApproveTeacherRequest = wrapAsync(async (req, res) => {
  const request = await governanceService.reviewTeacherRequest(req.params.id, req.user, 'approve');

  req.flash('success', 'Teacher request approved successfully! User promoted to Teacher role.');
  res.redirect(303, '/admin/teacher-requests');
});

// @desc    Reject Pending Teacher Request
// @route   POST /admin/teacher-requests/:id/reject
exports.postRejectTeacherRequest = wrapAsync(async (req, res) => {
  const { rejectionReason } = req.body;
  await governanceService.reviewTeacherRequest(req.params.id, req.user, 'reject', rejectionReason);

  req.flash('success', 'Teacher request rejected.');
  res.redirect(303, '/admin/teacher-requests');
});

// @desc    Demote Teacher to Student Role (Preserving historical assets/answers)
// @route   POST /admin/users/:id/demote
exports.postDemoteTeacher = wrapAsync(async (req, res) => {
  const demotedUser = await governanceService.demoteTeacher(req.params.id, req.user);

  req.flash('success', `Teacher @${demotedUser.username} demoted to Student role.`);
  res.redirect(303, '/admin/users');
});

// @desc    Get Pending Notes Moderation Queue for Admin Review
// @route   GET /admin/pending-notes
exports.getPendingNotes = wrapAsync(async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const filter = { approvalStatus: 'pending', isDeleted: false };

  if (search && search.trim()) {
    const sanitizedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { title: { $regex: sanitizedSearch, $options: 'i' } },
      { subject: { $regex: sanitizedSearch, $options: 'i' } },
    ];
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (parsedPage - 1) * parsedLimit;

  const [notes, totalCount] = await Promise.all([
    Note.find(filter)
      .populate('author', 'name username email role avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    Note.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalCount / parsedLimit) || 1;

  res.render('admin/pending_notes', {
    title: 'Pending Note Moderation — Admin Panel',
    path: '/admin/pending-notes',
    notes,
    totalCount,
    page: parsedPage,
    totalPages,
    query: req.query,
  });
});

// @desc    Approve Pending Student Note
// @route   POST /admin/notes/:id/approve
exports.postApproveNote = wrapAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid note identifier.', 400);

  const note = await Note.findById(id);
  if (!note || note.isDeleted) throw new AppError('Note not found.', 404);

  note.approvalStatus = 'approved';
  note.isPublished = true;
  note.approvedBy = req.user._id;
  note.approvedAt = new Date();
  note.rejectionReason = '';
  note.adminFeedback = '';

  await note.save();

  // AuditLog Entry
  await AuditLog.create({
    admin: req.user._id,
    action: 'NOTE_APPROVED',
    targetType: 'Note',
    targetId: note._id,
    details: {
      title: note.title,
      authorId: note.author,
      approvedAt: note.approvedAt,
    },
  });

  // Notify Note Author
  await notificationService.createNotification({
    recipient: note.author,
    actor: req.user._id,
    type: 'system',
    title: 'Study Note Approved!',
    message: `Your study note "${note.title}" has been approved by Admin and is now publicly visible.`,
    entityType: 'Note',
    entityId: note._id,
    url: `/notes/${note._id}`,
    eventKey: `note_approved:${note._id}:${Date.now()}`,
  });

  const successMsg = `Note "${note.title}" has been approved and published.`;

  const isAjax =
    req.xhr ||
    req.headers['x-requested-with'] === 'XMLHttpRequest' ||
    req.headers.accept?.includes('application/json');

  if (isAjax) {
    return res.json({
      success: true,
      message: successMsg,
      noteId: note._id,
      approvalStatus: note.approvalStatus,
      isPublished: note.isPublished,
    });
  }

  req.flash('success', successMsg);
  res.redirect(303, '/admin/pending-notes');
});

// @desc    Reject Pending Student Note
// @route   POST /admin/notes/:id/reject
exports.postRejectNote = wrapAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid note identifier.', 400);

  const note = await Note.findById(id);
  if (!note || note.isDeleted) throw new AppError('Note not found.', 404);

  const { rejectionReason, adminFeedback } = req.body;
  note.approvalStatus = 'rejected';
  note.isPublished = false;
  note.rejectionReason = rejectionReason && rejectionReason.trim() ? rejectionReason.trim() : 'Irrelevant content';
  note.adminFeedback = adminFeedback ? adminFeedback.trim() : '';

  await note.save();

  // AuditLog Entry
  await AuditLog.create({
    admin: req.user._id,
    action: 'NOTE_REJECTED',
    targetType: 'Note',
    targetId: note._id,
    details: {
      title: note.title,
      authorId: note.author,
      rejectionReason: note.rejectionReason,
      adminFeedback: note.adminFeedback,
    },
  });

  // Notify Note Author
  await notificationService.createNotification({
    recipient: note.author,
    actor: req.user._id,
    type: 'system',
    title: 'Study Note Needs Changes',
    message: `Your study note "${note.title}" was rejected. Reason: ${note.rejectionReason}`,
    entityType: 'Note',
    entityId: note._id,
    url: `/dashboard`,
    eventKey: `note_rejected:${note._id}:${Date.now()}`,
  });

  const successMsg = `Note "${note.title}" rejected.`;

  const isAjax =
    req.xhr ||
    req.headers['x-requested-with'] === 'XMLHttpRequest' ||
    req.headers.accept?.includes('application/json');

  if (isAjax) {
    return res.json({
      success: true,
      message: successMsg,
      noteId: note._id,
      approvalStatus: note.approvalStatus,
      isPublished: note.isPublished,
    });
  }

  req.flash('success', successMsg);
  res.redirect(303, '/admin/pending-notes');
});

// ==========================================
// SUBJECT GOVERNANCE HANDLERS
// ==========================================

// @desc    Get Paginated Subjects List for Admin Governance
// @route   GET /admin/subjects
exports.getSubjects = wrapAsync(async (req, res) => {
  const result = await academicService.getAllSubjects(req.query);
  res.render('admin/subjects', {
    title: 'Subject Governance — Admin Panel',
    path: '/admin/subjects',
    subjects: result.subjects,
    totalCount: result.totalCount,
    departments: result.departments,
    page: result.page,
    totalPages: result.totalPages,
    query: req.query,
  });
});

// @desc    Create New Subject
// @route   POST /admin/subjects
exports.postCreateSubject = wrapAsync(async (req, res) => {
  try {
    const subject = await academicService.createSubject(req.body);

    try {
      await AuditLog.create({
        admin: req.user._id,
        action: 'SUBJECT_CREATED',
        targetType: 'Subject',
        targetId: subject._id,
        details: { name: subject.name, code: subject.code, department: subject.department },
      });
    } catch (auditErr) {
      console.error('AuditLog error in postCreateSubject:', auditErr);
    }

    req.flash('success', `Subject "${subject.name}" created successfully.`);
    res.redirect(303, '/admin/subjects');
  } catch (err) {
    req.flash('error', err.message || 'Failed to create subject.');
    res.redirect(303, req.headers.referer || '/admin/subjects');
  }
});

// @desc    Update Existing Subject
// @route   PATCH /admin/subjects/:id, POST /admin/subjects/:id
exports.patchUpdateSubject = wrapAsync(async (req, res) => {
  try {
    const { id } = req.params;
    const subject = await academicService.updateSubject(id, req.body);

    try {
      await AuditLog.create({
        admin: req.user._id,
        action: 'SUBJECT_UPDATED',
        targetType: 'Subject',
        targetId: subject._id,
        details: { name: subject.name, code: subject.code, department: subject.department, isActive: subject.isActive },
      });
    } catch (auditErr) {
      console.error('AuditLog error in patchUpdateSubject:', auditErr);
    }

    req.flash('success', `Subject "${subject.name}" updated successfully.`);
    res.redirect(303, '/admin/subjects');
  } catch (err) {
    req.flash('error', err.message || 'Failed to update subject.');
    res.redirect(303, req.headers.referer || '/admin/subjects');
  }
});

// @desc    Toggle Subject Active Status (Soft Delete)
// @route   PATCH /admin/subjects/:id/toggle-active, POST /admin/subjects/:id/toggle-active
exports.patchToggleSubjectActive = wrapAsync(async (req, res) => {
  try {
    const { id } = req.params;
    const subject = await academicService.toggleSubjectActive(id);

    try {
      await AuditLog.create({
        admin: req.user._id,
        action: subject.isActive ? 'SUBJECT_ACTIVATED' : 'SUBJECT_DEACTIVATED',
        targetType: 'Subject',
        targetId: subject._id,
        details: { name: subject.name, isActive: subject.isActive },
      });
    } catch (auditErr) {
      console.error('AuditLog error in patchToggleSubjectActive:', auditErr);
    }

    req.flash('success', `Subject "${subject.name}" is now ${subject.isActive ? 'Active' : 'Inactive'}.`);
    res.redirect(303, '/admin/subjects');
  } catch (err) {
    req.flash('error', err.message || 'Failed to toggle subject status.');
    res.redirect(303, req.headers.referer || '/admin/subjects');
  }
});

// ==========================================
// TOPIC GOVERNANCE HANDLERS
// ==========================================

// @desc    Get Topics for Selected Subject
// @route   GET /admin/subjects/:subjectId/topics
exports.getSubjectTopics = wrapAsync(async (req, res) => {
  const { subjectId } = req.params;
  const result = await academicService.getTopicsBySubject(subjectId, req.query);

  res.render('admin/topics', {
    title: `Topic Governance (${result.subject.name}) — Admin Panel`,
    path: '/admin/subjects',
    subject: result.subject,
    topics: result.topics,
    query: req.query,
  });
});

// @desc    Create New Topic under Subject
// @route   POST /admin/subjects/:subjectId/topics
exports.postCreateTopic = wrapAsync(async (req, res) => {
  const { subjectId } = req.params;
  try {
    const topic = await academicService.createTopic(subjectId, req.body);

    try {
      await AuditLog.create({
        admin: req.user._id,
        action: 'TOPIC_CREATED',
        targetType: 'Topic',
        targetId: topic._id,
        details: { name: topic.name, subjectId },
      });
    } catch (auditErr) {
      console.error('AuditLog error in postCreateTopic:', auditErr);
    }

    req.flash('success', `Topic "${topic.name}" created.`);
    res.redirect(303, `/admin/subjects/${subjectId}/topics`);
  } catch (err) {
    req.flash('error', err.message || 'Failed to create topic.');
    res.redirect(303, req.headers.referer || `/admin/subjects/${subjectId}/topics`);
  }
});

// @desc    Update Topic
// @route   PATCH /admin/subjects/:subjectId/topics/:topicId, POST /admin/subjects/:subjectId/topics/:topicId
exports.patchUpdateTopic = wrapAsync(async (req, res) => {
  const { subjectId, topicId } = req.params;
  try {
    const topic = await academicService.updateTopic(topicId, req.body);

    try {
      await AuditLog.create({
        admin: req.user._id,
        action: 'TOPIC_UPDATED',
        targetType: 'Topic',
        targetId: topic._id,
        details: { name: topic.name, isActive: topic.isActive },
      });
    } catch (auditErr) {
      console.error('AuditLog error in patchUpdateTopic:', auditErr);
    }

    req.flash('success', `Topic "${topic.name}" updated successfully.`);
    res.redirect(303, `/admin/subjects/${subjectId}/topics`);
  } catch (err) {
    req.flash('error', err.message || 'Failed to update topic.');
    res.redirect(303, req.headers.referer || `/admin/subjects/${subjectId}/topics`);
  }
});

// @desc    Toggle Topic Active Status (Soft Delete)
// @route   PATCH /admin/subjects/:subjectId/topics/:topicId/toggle-active, POST /admin/subjects/:subjectId/topics/:topicId/toggle-active
exports.patchToggleTopicActive = wrapAsync(async (req, res) => {
  const { subjectId, topicId } = req.params;
  try {
    const topic = await academicService.toggleTopicActive(topicId);

    try {
      await AuditLog.create({
        admin: req.user._id,
        action: topic.isActive ? 'TOPIC_ACTIVATED' : 'TOPIC_DEACTIVATED',
        targetType: 'Topic',
        targetId: topic._id,
        details: { name: topic.name, isActive: topic.isActive },
      });
    } catch (auditErr) {
      console.error('AuditLog error in patchToggleTopicActive:', auditErr);
    }

    req.flash('success', `Topic "${topic.name}" is now ${topic.isActive ? 'Active' : 'Inactive'}.`);
    res.redirect(303, `/admin/subjects/${subjectId}/topics`);
  } catch (err) {
    req.flash('error', err.message || 'Failed to toggle topic status.');
    res.redirect(303, req.headers.referer || `/admin/subjects/${subjectId}/topics`);
  }
});

// ==========================================
// PUBLIC API FOR DYNAMIC STUDENT DROPDOWNS
// ==========================================

// @desc    Get Active Subjects JSON for Dropdowns
// @route   GET /api/subjects
exports.getApiActiveSubjects = wrapAsync(async (req, res) => {
  const subjects = await academicService.getActiveSubjects();
  res.json({ success: true, subjects });
});

// @desc    Get Active Topics JSON for Selected Subject
// @route   GET /api/subjects/:subjectId/topics
exports.getApiActiveTopics = wrapAsync(async (req, res) => {
  const { subjectId } = req.params;
  const topics = await academicService.getActiveTopicsBySubject(subjectId);
  res.json({ success: true, topics });
});

// ==========================================
// FEATURES CARDS MANAGEMENT
// ==========================================

// @desc    List All Managed Feature Cards
// @route   GET /admin/features-cards
exports.getFeatureCards = wrapAsync(async (req, res) => {
  const cards = await FeatureCard.find({ isDeleted: false })
    .populate('createdBy', 'name username')
    .sort({ order: 1, createdAt: -1 })
    .lean();

  res.render('admin/features_cards', {
    title: 'Features Cards Management - Admin Panel',
    path: '/admin/features-cards',
    cards,
  });
});

// @desc    Create New Feature Card
// @route   POST /admin/features-cards
exports.postFeatureCard = wrapAsync(async (req, res) => {
  const { title, description, icon, order } = req.body;

  if (!title || !title.trim()) {
    throw new AppError('Feature Card title is required.', 400);
  }
  if (!description || !description.trim()) {
    throw new AppError('Feature Card description is required.', 400);
  }

  const card = await FeatureCard.create({
    title: title.trim(),
    description: description.trim(),
    icon: icon && icon.trim() ? icon.trim() : '✨',
    order: parseInt(order, 10) || 0,
    isActive: true,
    createdBy: req.user._id,
    updatedBy: req.user._id,
  });

  try {
    await AuditLog.create({
      admin: req.user._id,
      action: 'FEATURE_CARD_CREATED',
      targetType: 'FeatureCard',
      targetId: card._id,
      details: { title: card.title },
    });
  } catch (auditErr) {
    console.error('AuditLog error in postFeatureCard:', auditErr);
  }

  req.flash('success', `Feature Card "${card.title}" created successfully.`);
  res.redirect(303, '/admin/features-cards');
});

// @desc    Render Edit Feature Card Form
// @route   GET /admin/features-cards/:id/edit
exports.getEditFeatureCard = wrapAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid card identifier.', 400);

  const card = await FeatureCard.findById(id);
  if (!card || card.isDeleted) throw new AppError('Feature Card not found.', 404);

  res.render('admin/features_card_edit', {
    title: `Edit Feature Card — ${card.title} - Admin Panel`,
    path: '/admin/features-cards',
    card,
  });
});

// @desc    Edit Existing Feature Card
// @route   POST /admin/features-cards/:id/edit
exports.postEditFeatureCard = wrapAsync(async (req, res) => {
  const { id } = req.params;
  const { title, description, icon, order, isActive } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid card identifier.', 400);
  if (!title || !title.trim()) throw new AppError('Feature Card title is required.', 400);
  if (!description || !description.trim()) throw new AppError('Feature Card description is required.', 400);

  const card = await FeatureCard.findById(id);
  if (!card || card.isDeleted) throw new AppError('Feature Card not found.', 404);

  card.title = title.trim();
  card.description = description.trim();
  card.icon = icon && icon.trim() ? icon.trim() : '✨';
  card.order = parseInt(order, 10) || 0;
  if (isActive !== undefined) {
    card.isActive = isActive === 'true' || isActive === true || isActive === '1';
  }
  card.updatedBy = req.user._id;
  await card.save();

  try {
    await AuditLog.create({
      admin: req.user._id,
      action: 'FEATURE_CARD_UPDATED',
      targetType: 'FeatureCard',
      targetId: card._id,
      details: { title: card.title, order: card.order, isActive: card.isActive },
    });
  } catch (auditErr) {
    console.error('AuditLog error in postEditFeatureCard:', auditErr);
  }

  req.flash('success', `Feature Card "${card.title}" updated successfully.`);
  res.redirect(303, '/admin/features-cards');
});

// @desc    Toggle Feature Card Active State
// @route   POST /admin/features-cards/:id/toggle-active
exports.patchToggleFeatureCardActive = wrapAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid card identifier.', 400);

  const card = await FeatureCard.findById(id);
  if (!card || card.isDeleted) throw new AppError('Feature Card not found.', 404);

  card.isActive = !card.isActive;
  card.updatedBy = req.user._id;
  await card.save();

  try {
    await AuditLog.create({
      admin: req.user._id,
      action: 'FEATURE_CARD_TOGGLED',
      targetType: 'FeatureCard',
      targetId: card._id,
      details: { title: card.title, isActive: card.isActive },
    });
  } catch (auditErr) {
    console.error('AuditLog error in patchToggleFeatureCardActive:', auditErr);
  }

  req.flash('success', `Feature Card "${card.title}" is now ${card.isActive ? 'Active' : 'Inactive'}.`);
  res.redirect(303, '/admin/features-cards');
});

// @desc    Soft Delete Feature Card
// @route   POST /admin/features-cards/:id/delete
exports.deleteFeatureCard = wrapAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid card identifier.', 400);

  const card = await FeatureCard.findById(id);
  if (!card || card.isDeleted) throw new AppError('Feature Card not found.', 404);

  card.isDeleted = true;
  card.updatedBy = req.user._id;
  await card.save();

  try {
    await AuditLog.create({
      admin: req.user._id,
      action: 'FEATURE_CARD_DELETED',
      targetType: 'FeatureCard',
      targetId: card._id,
      details: { title: card.title },
    });
  } catch (auditErr) {
    console.error('AuditLog error in deleteFeatureCard:', auditErr);
  }

  req.flash('success', `Feature Card "${card.title}" deleted.`);
  res.redirect(303, '/admin/features-cards');
});

// ==========================================
// ABOUT CARDS MANAGEMENT
// ==========================================

// @desc    List All Managed About Cards
// @route   GET /admin/about-cards
exports.getAboutCards = wrapAsync(async (req, res) => {
  const cards = await AboutCard.find({ isDeleted: false })
    .populate('createdBy', 'name username')
    .sort({ order: 1, createdAt: -1 })
    .lean();

  res.render('admin/about_cards', {
    title: 'About Cards Management - Admin Panel',
    path: '/admin/about-cards',
    cards,
  });
});

// @desc    Create New About Card
// @route   POST /admin/about-cards
exports.postAboutCard = wrapAsync(async (req, res) => {
  const { title, description, icon, order } = req.body;

  if (!title || !title.trim()) {
    throw new AppError('About Card title is required.', 400);
  }
  if (!description || !description.trim()) {
    throw new AppError('About Card description is required.', 400);
  }

  const card = await AboutCard.create({
    title: title.trim(),
    description: description.trim(),
    icon: icon && icon.trim() ? icon.trim() : 'ℹ️',
    order: parseInt(order, 10) || 0,
    isActive: true,
    createdBy: req.user._id,
    updatedBy: req.user._id,
  });

  try {
    await AuditLog.create({
      admin: req.user._id,
      action: 'ABOUT_CARD_CREATED',
      targetType: 'AboutCard',
      targetId: card._id,
      details: { title: card.title },
    });
  } catch (auditErr) {
    console.error('AuditLog error in postAboutCard:', auditErr);
  }

  req.flash('success', `About Card "${card.title}" created successfully.`);
  res.redirect(303, '/admin/about-cards');
});

// @desc    Render Edit About Card Form
// @route   GET /admin/about-cards/:id/edit
exports.getEditAboutCard = wrapAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid card identifier.', 400);

  const card = await AboutCard.findById(id);
  if (!card || card.isDeleted) throw new AppError('About Card not found.', 404);

  res.render('admin/about_card_edit', {
    title: `Edit About Card — ${card.title} - Admin Panel`,
    path: '/admin/about-cards',
    card,
  });
});

// @desc    Edit Existing About Card
// @route   POST /admin/about-cards/:id/edit
exports.postEditAboutCard = wrapAsync(async (req, res) => {
  const { id } = req.params;
  const { title, description, icon, order, isActive } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid card identifier.', 400);
  if (!title || !title.trim()) throw new AppError('About Card title is required.', 400);
  if (!description || !description.trim()) throw new AppError('About Card description is required.', 400);

  const card = await AboutCard.findById(id);
  if (!card || card.isDeleted) throw new AppError('About Card not found.', 404);

  card.title = title.trim();
  card.description = description.trim();
  card.icon = icon && icon.trim() ? icon.trim() : 'ℹ️';
  card.order = parseInt(order, 10) || 0;
  if (isActive !== undefined) {
    card.isActive = isActive === 'true' || isActive === true || isActive === '1';
  }
  card.updatedBy = req.user._id;
  await card.save();

  try {
    await AuditLog.create({
      admin: req.user._id,
      action: 'ABOUT_CARD_UPDATED',
      targetType: 'AboutCard',
      targetId: card._id,
      details: { title: card.title, order: card.order, isActive: card.isActive },
    });
  } catch (auditErr) {
    console.error('AuditLog error in postEditAboutCard:', auditErr);
  }

  req.flash('success', `About Card "${card.title}" updated successfully.`);
  res.redirect(303, '/admin/about-cards');
});

// @desc    Toggle About Card Active State
// @route   POST /admin/about-cards/:id/toggle-active
exports.patchToggleAboutCardActive = wrapAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid card identifier.', 400);

  const card = await AboutCard.findById(id);
  if (!card || card.isDeleted) throw new AppError('About Card not found.', 404);

  card.isActive = !card.isActive;
  card.updatedBy = req.user._id;
  await card.save();

  try {
    await AuditLog.create({
      admin: req.user._id,
      action: 'ABOUT_CARD_TOGGLED',
      targetType: 'AboutCard',
      targetId: card._id,
      details: { title: card.title, isActive: card.isActive },
    });
  } catch (auditErr) {
    console.error('AuditLog error in patchToggleAboutCardActive:', auditErr);
  }

  req.flash('success', `About Card "${card.title}" is now ${card.isActive ? 'Active' : 'Inactive'}.`);
  res.redirect(303, '/admin/about-cards');
});

// @desc    Soft Delete About Card
// @route   POST /admin/about-cards/:id/delete
exports.deleteAboutCard = wrapAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid card identifier.', 400);

  const card = await AboutCard.findById(id);
  if (!card || card.isDeleted) throw new AppError('About Card not found.', 404);

  card.isDeleted = true;
  card.updatedBy = req.user._id;
  await card.save();

  try {
    await AuditLog.create({
      admin: req.user._id,
      action: 'ABOUT_CARD_DELETED',
      targetType: 'AboutCard',
      targetId: card._id,
      details: { title: card.title },
    });
  } catch (auditErr) {
    console.error('AuditLog error in deleteAboutCard:', auditErr);
  }

  req.flash('success', `About Card "${card.title}" deleted.`);
  res.redirect(303, '/admin/about-cards');
});


