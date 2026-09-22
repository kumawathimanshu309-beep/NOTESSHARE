const mongoose = require('mongoose');
const User = require('../models/User');
const Note = require('../models/Note');
const Doubt = require('../models/Doubt');
const Answer = require('../models/Answer');
const Comment = require('../models/Comment');
const HomeCard = require('../models/HomeCard');
const AuditLog = require('../models/AuditLog');
const TeacherRequest = require('../models/TeacherRequest');
const governanceService = require('../services/governanceService');
const notificationService = require('../services/notificationService');
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

  req.flash('success', `Role for @${targetUser.username} updated to ${newRole.toUpperCase()}.`);
  res.redirect('/admin/users');
});

// @desc    Get Resources / Notes List for Admin Moderation
// @route   GET /admin/notes
exports.getNotes = wrapAsync(async (req, res) => {
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

  const [notes, totalCount] = await Promise.all([
    Note.find(filter)
      .populate('author', 'name username email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    Note.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalCount / parsedLimit) || 1;

  res.render('admin/notes', {
    title: 'Note Moderation — Admin Panel',
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

  req.flash('success', `Note "${note.title}" ${note.isPublished ? 'published' : 'unpublished'}.`);
  res.redirect('/admin/notes');
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

  req.flash('success', `Note "${note.title}" deleted.`);
  res.redirect('/admin/notes');
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
  res.redirect('/admin/doubts');
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
  res.redirect('/admin/home-content');
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
  res.redirect('/admin/home-content');
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
  res.redirect('/admin/home-content');
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
  res.redirect('/admin/home-content');
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
  res.redirect('/admin/home-content');
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
  res.redirect('/admin/teacher-requests');
});

// @desc    Reject Pending Teacher Request
// @route   POST /admin/teacher-requests/:id/reject
exports.postRejectTeacherRequest = wrapAsync(async (req, res) => {
  const { rejectionReason } = req.body;
  await governanceService.reviewTeacherRequest(req.params.id, req.user, 'reject', rejectionReason);

  req.flash('success', 'Teacher request rejected.');
  res.redirect('/admin/teacher-requests');
});

// @desc    Demote Teacher to Student Role (Preserving historical assets/answers)
// @route   POST /admin/users/:id/demote
exports.postDemoteTeacher = wrapAsync(async (req, res) => {
  const demotedUser = await governanceService.demoteTeacher(req.params.id, req.user);

  req.flash('success', `Teacher @${demotedUser.username} demoted to Student role.`);
  res.redirect('/admin/users');
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

  req.flash('success', `Note "${note.title}" has been approved and published.`);
  res.redirect('/admin/pending-notes');
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

  req.flash('success', `Note "${note.title}" rejected.`);
  res.redirect('/admin/pending-notes');
});
