const mongoose = require('mongoose');
const Note = require('../models/Note');
const User = require('../models/User');
const Like = require('../models/Like');
const Bookmark = require('../models/Bookmark');
const Rating = require('../models/Rating');
const Comment = require('../models/Comment');
const Doubt = require('../models/Doubt');
const Answer = require('../models/Answer');
const notificationService = require('./notificationService');
const AppError = require('../utils/AppError');

/**
 * Validates whether an avatar URL is safe and uses allowed protocols.
 * Allows: relative paths starting with / OR absolute http:// and https:// URLs.
 * Rejects: javascript:, data:, vbscript:, file:, // protocol-relative URLs.
 */
const isValidAvatarUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed === '') return false;
  if (
    trimmed.toLowerCase().startsWith('javascript:') ||
    trimmed.toLowerCase().startsWith('data:') ||
    trimmed.toLowerCase().startsWith('vbscript:') ||
    trimmed.toLowerCase().startsWith('file:') ||
    trimmed.startsWith('//')
  ) {
    return false;
  }
  return trimmed.startsWith('/') || trimmed.startsWith('http://') || trimmed.startsWith('https://');
};

/**
 * Safe pagination helper to clamp page >= 1 and limit between 1 and 50.
 */
const parsePagination = (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Checks note existence and enforces Phase 3 visibility & moderation authorization rules
 */
const checkNoteAccessibility = async (noteId, userId = null, userRole = null) => {
  if (!mongoose.Types.ObjectId.isValid(noteId)) {
    throw new AppError('Invalid note identifier.', 400);
  }

  const note = await Note.findById(noteId);
  if (!note || note.isDeleted) {
    throw new AppError('Requested note was not found.', 404);
  }

  const isAuthor = userId && note.author.equals(userId);
  const isAdmin = userRole === 'admin';

  if (!note.isPublished && !isAuthor && !isAdmin) {
    throw new AppError('Access denied: Note is unpublished.', 403);
  }

  if (note.visibility === 'private' && !isAuthor && !isAdmin) {
    throw new AppError('Access denied: Note is private.', 403);
  }

  // Moderation Guard for Interactions:
  // Like, Bookmark, Rating, Comment, Share require approvalStatus === 'approved'
  if (note.approvalStatus !== 'approved') {
    throw new AppError('Interactions are disabled because this note is pending review or not approved.', 403);
  }

  return note;
};

/**
 * Toggle Like for a note
 */
exports.toggleLike = async (noteId, userId, userRole) => {
  const note = await checkNoteAccessibility(noteId, userId, userRole);
  const existingLike = await Like.findOne({ user: userId, note: noteId });

  let liked = false;
  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
    liked = false;
  } else {
    try {
      await Like.create({ user: userId, note: noteId });
      liked = true;
    } catch (err) {
      if (err.code === 11000) {
        liked = true; // Duplicate key catch
      } else {
        throw err;
      }
    }
  }

  if (liked) {
    const actorUser = await User.findById(userId).select('name username').lean();
    const actorName = actorUser ? actorUser.name : 'Someone';
    await notificationService.createNotification({
      recipient: note.author,
      actor: userId,
      type: 'like',
      title: 'New Like on Your Note',
      message: `${actorName} liked your note "${note.title}"`,
      entityType: 'Note',
      entityId: note._id,
      url: `/notes/${note._id}`,
      eventKey: `like:${note._id}:${userId}`,
    });
  }

  const likeCount = await Like.countDocuments({ note: noteId });
  return { liked, likeCount, note };
};

/**
 * Toggle Bookmark for a note
 */
exports.toggleBookmark = async (noteId, userId, userRole) => {
  const note = await checkNoteAccessibility(noteId, userId, userRole);
  const existingBookmark = await Bookmark.findOne({ user: userId, note: noteId });

  let bookmarked = false;
  if (existingBookmark) {
    await Bookmark.findByIdAndDelete(existingBookmark._id);
    bookmarked = false;
  } else {
    try {
      await Bookmark.create({ user: userId, note: noteId });
      bookmarked = true;
    } catch (err) {
      if (err.code === 11000) {
        bookmarked = true; // Duplicate key catch
      } else {
        throw err;
      }
    }
  }

  const bookmarkCount = await Bookmark.countDocuments({ note: noteId });
  return { bookmarked, bookmarkCount, note };
};

/**
 * Upsert rating for a note and recalculate MongoDB aggregate average
 */
exports.upsertRating = async (noteId, userId, userRole, ratingValue, review = '') => {
  const note = await checkNoteAccessibility(noteId, userId, userRole);

  await Rating.findOneAndUpdate(
    { user: userId, note: noteId },
    { rating: ratingValue, review: review.trim() },
    { upsert: true, returnDocument: 'after', runValidators: true }
  );

  const actorUser = await User.findById(userId).select('name username').lean();
  const actorName = actorUser ? actorUser.name : 'Someone';
  await notificationService.createNotification({
    recipient: note.author,
    actor: userId,
    type: 'rating',
    title: 'New Rating on Your Note',
    message: `${actorName} rated your note "${note.title}" ${ratingValue} star${ratingValue > 1 ? 's' : ''}`,
    entityType: 'Note',
    entityId: note._id,
    url: `/notes/${note._id}`,
    eventKey: `rating:${note._id}:${userId}`,
  });

  const stats = await Rating.aggregate([
    { $match: { note: new mongoose.Types.ObjectId(noteId) } },
    {
      $group: {
        _id: '$note',
        avgRating: { $avg: '$rating' },
        totalRatings: { $sum: 1 },
      },
    },
  ]);

  const avgRating = stats.length > 0 ? parseFloat(stats[0].avgRating.toFixed(1)) : 0;
  const totalRatings = stats.length > 0 ? stats[0].totalRatings : 0;

  return { userRating: ratingValue, avgRating, totalRatings, note };
};

/**
 * Get Rating statistics and user's rating for a note
 */
exports.getNoteRatingStats = async (noteId, userId = null) => {
  if (!mongoose.Types.ObjectId.isValid(noteId)) {
    return { avgRating: 0, totalRatings: 0, userRating: null };
  }

  const stats = await Rating.aggregate([
    { $match: { note: new mongoose.Types.ObjectId(noteId) } },
    {
      $group: {
        _id: '$note',
        avgRating: { $avg: '$rating' },
        totalRatings: { $sum: 1 },
      },
    },
  ]);

  const avgRating = stats.length > 0 ? parseFloat(stats[0].avgRating.toFixed(1)) : 0;
  const totalRatings = stats.length > 0 ? stats[0].totalRatings : 0;

  let userRating = null;
  if (userId) {
    const userRatingDoc = await Rating.findOne({ user: userId, note: noteId });
    if (userRatingDoc) userRating = userRatingDoc.rating;
  }

  return { avgRating, totalRatings, userRating };
};

/**
 * Add Comment to a note
 */
exports.addComment = async (noteId, userId, userRole, content) => {
  const note = await checkNoteAccessibility(noteId, userId, userRole);
  const comment = await Comment.create({
    note: noteId,
    user: userId,
    content: content.trim(),
  });

  const populatedComment = await comment.populate('user', 'name username avatar role');
  const actorName = populatedComment.user ? populatedComment.user.name : 'Someone';

  await notificationService.createNotification({
    recipient: note.author,
    actor: userId,
    type: 'comment',
    title: 'New Comment on Your Note',
    message: `${actorName} commented on your note "${note.title}"`,
    entityType: 'Comment',
    entityId: comment._id,
    url: `/notes/${note._id}#comments`,
    eventKey: `comment:${comment._id}`,
  });

  return populatedComment;
};

/**
 * Get comments for a note
 */
exports.getNoteComments = async (noteId) => {
  if (!mongoose.Types.ObjectId.isValid(noteId)) return [];

  return await Comment.find({ note: noteId, isDeleted: false })
    .populate('user', 'name username avatar role')
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * Update comment with ownership validation
 */
exports.updateComment = async (commentId, userId, userRole, content) => {
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new AppError('Invalid comment identifier.', 400);
  }

  const comment = await Comment.findById(commentId);
  if (!comment || comment.isDeleted) {
    throw new AppError('Comment was not found or has been deleted.', 404);
  }

  const isOwner = comment.user.equals(userId);
  const isAdmin = userRole === 'admin';

  if (!isOwner && !isAdmin) {
    throw new AppError('Forbidden: You can only edit your own comments.', 403);
  }

  comment.content = content.trim();
  await comment.save();

  return await comment.populate('user', 'name username avatar role');
};

/**
 * Soft-delete comment with ownership / admin validation
 */
exports.deleteComment = async (commentId, userId, userRole) => {
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new AppError('Invalid comment identifier.', 400);
  }

  const comment = await Comment.findById(commentId);
  if (!comment || comment.isDeleted) {
    throw new AppError('Comment was not found or has already been deleted.', 404);
  }

  const isOwner = comment.user.equals(userId);
  const isAdmin = userRole === 'admin';

  if (!isOwner && !isAdmin) {
    throw new AppError('Forbidden: You can only delete your own comments.', 403);
  }

  comment.isDeleted = true;
  comment.deletedAt = new Date();
  comment.deletedBy = userId;
  await comment.save();

  return comment;
};

/**
 * Construct derived activity feed for a user across multiple collections with safe limits
 */
const buildUserActivityFeed = async (userId, limit = 15) => {
  const ACTIVITY_WINDOW = 10;
  const [notes, doubts, answers, bookmarks, likes] = await Promise.all([
    Note.find({ author: userId, isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(ACTIVITY_WINDOW)
      .select('title createdAt')
      .lean(),
    Doubt.find({ student: userId, isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(ACTIVITY_WINDOW)
      .select('title status createdAt')
      .lean(),
    Answer.find({ author: userId, isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(ACTIVITY_WINDOW)
      .populate('doubt', 'title')
      .select('doubt content isAccepted createdAt')
      .lean(),
    Bookmark.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(ACTIVITY_WINDOW)
      .populate('note', 'title subject isDeleted isPublished visibility approvalStatus')
      .select('note createdAt')
      .lean(),
    Like.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(ACTIVITY_WINDOW)
      .populate('note', 'title subject isDeleted isPublished visibility approvalStatus')
      .select('note createdAt')
      .lean(),
  ]);

  const items = [];

  notes.forEach((n) => {
    items.push({
      type: 'NOTE_CREATED',
      title: `Published study resource "${n.title}"`,
      link: `/notes/${n._id}`,
      createdAt: n.createdAt,
      icon: '📚',
      badgeClass: 'badge-purple',
    });
  });

  doubts.forEach((d) => {
    items.push({
      type: 'DOUBT_ASKED',
      title: `Asked doubt: "${d.title}"`,
      link: `/doubts/${d._id}`,
      createdAt: d.createdAt,
      icon: '❓',
      badgeClass: 'badge-yellow',
    });
  });

  answers.forEach((a) => {
    const doubtTitle = a.doubt ? a.doubt.title : 'a question';
    items.push({
      type: 'ANSWER_POSTED',
      title: `Answered: "${doubtTitle}"${a.isAccepted ? ' (Accepted Solution)' : ''}`,
      link: `/doubts/${a.doubt ? a.doubt._id : ''}#answers`,
      createdAt: a.createdAt,
      icon: '💡',
      badgeClass: a.isAccepted ? 'badge-green' : 'badge-blue',
    });
  });

  bookmarks.forEach((b) => {
    if (b.note && !b.note.isDeleted && b.note.isPublished && b.note.visibility === 'public' && b.note.approvalStatus === 'approved') {
      items.push({
        type: 'BOOKMARK_ADDED',
        title: `Bookmarked resource "${b.note.title}"`,
        link: `/notes/${b.note._id}`,
        createdAt: b.createdAt,
        icon: '🔖',
        badgeClass: 'badge-amber',
      });
    }
  });

  likes.forEach((l) => {
    if (l.note && !l.note.isDeleted && l.note.isPublished && l.note.visibility === 'public' && l.note.approvalStatus === 'approved') {
      items.push({
        type: 'LIKE_GIVEN',
        title: `Liked resource "${l.note.title}"`,
        link: `/notes/${l.note._id}`,
        createdAt: l.createdAt,
        icon: '❤️',
        badgeClass: 'badge-pink',
      });
    }
  });

  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return items.slice(0, limit);
};

/**
 * Get user profile details & public published resources with safe projection & pagination
 */
exports.getUserProfileData = async (username, currentUserId = null, currentUserRole = null, queryParams = {}) => {
  if (!username || typeof username !== 'string') {
    throw new AppError('Invalid username parameter.', 400);
  }

  const user = await User.findOne({ username: username.toLowerCase().trim() })
    .select('-password')
    .lean();

  if (!user) {
    throw new AppError('User profile not found.', 404);
  }

  const isSelf = currentUserId ? user._id.toString() === currentUserId.toString() : false;
  const isAdmin = currentUserRole === 'admin';

  // Safe Projection Object (No password, passwordHash, internal secrets)
  const safeProfileUser = {
    _id: user._id,
    name: user.name,
    username: user.username,
    avatar: isValidAvatarUrl(user.avatar) ? user.avatar : '/images/logo.png',
    role: user.role,
    bio: user.bio || '',
    qualification: user.qualification || '',
    experience: user.experience || '',
    teachingBio: user.teachingBio || '',
    subjectsHandled: user.subjectsHandled || [],
    verificationStatus: user.verificationStatus || 'pending',
    createdAt: user.createdAt,
  };

  const pagination = parsePagination(queryParams);

  // Build notes query
  const noteQuery = { author: user._id, isDeleted: false };
  if (!isSelf && !isAdmin) {
    noteQuery.isPublished = true;
    noteQuery.visibility = 'public';
    noteQuery.approvalStatus = 'approved';
  }

  const [notes, totalNotesCount, authoredNoteIds] = await Promise.all([
    Note.find(noteQuery)
      .populate('author', 'name username avatar role')
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Note.countDocuments(noteQuery),
    Note.find({ author: user._id, isDeleted: false }).distinct('_id'),
  ]);

  // Aggregate stats across user's authored notes
  const [totalLikesReceived, totalBookmarksReceived, ratingStats] = await Promise.all([
    Like.countDocuments({ note: { $in: authoredNoteIds } }),
    Bookmark.countDocuments({ note: { $in: authoredNoteIds } }),
    Rating.aggregate([
      { $match: { note: { $in: authoredNoteIds } } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } },
    ]),
  ]);

  const avgRating = ratingStats.length > 0 ? parseFloat(ratingStats[0].avgRating.toFixed(1)) : 0;
  const totalDownloads = notes.reduce((sum, n) => sum + (n.downloads || 0), 0);

  // Doubts (for student) & Answers (for teacher)
  let doubts = [];
  let totalDoubtsAsked = 0;
  if (user.role === 'student') {
    [doubts, totalDoubtsAsked] = await Promise.all([
      Doubt.find({ student: user._id, isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Doubt.countDocuments({ student: user._id, isDeleted: false }),
    ]);
  }

  let answers = [];
  let totalAnswersGiven = 0;
  let totalAcceptedAnswers = 0;
  if (user.role === 'teacher') {
    [answers, totalAnswersGiven, totalAcceptedAnswers] = await Promise.all([
      Answer.find({ author: user._id, isDeleted: false })
        .populate('doubt', 'title status')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Answer.countDocuments({ author: user._id, isDeleted: false }),
      Answer.countDocuments({ author: user._id, isDeleted: false, isAccepted: true }),
    ]);
  }

  // Private sections (Owner only)
  let privateBookmarks = [];
  let privateLikes = [];
  let activityFeed = [];
  if (isSelf) {
    const [rawBookmarks, rawLikes] = await Promise.all([
      Bookmark.find({ user: user._id })
        .populate({
          path: 'note',
          populate: { path: 'author', select: 'name username avatar' },
        })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Like.find({ user: user._id })
        .populate({
          path: 'note',
          populate: { path: 'author', select: 'name username avatar' },
        })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    privateBookmarks = rawBookmarks
      .map((b) => b.note)
      .filter((n) => n && !n.isDeleted && n.isPublished && n.visibility === 'public');

    privateLikes = rawLikes
      .map((l) => l.note)
      .filter((n) => n && !n.isDeleted && n.isPublished && n.visibility === 'public');

    activityFeed = await buildUserActivityFeed(user._id, 15);
  }

  return {
    profileUser: safeProfileUser,
    notes,
    doubts,
    answers,
    isSelf,
    isAdmin,
    privateBookmarks: privateBookmarks || [],
    privateLikes: privateLikes || [],
    activityFeed: activityFeed || [],
    pagination: {
      currentPage: pagination.page,
      totalPages: Math.ceil(totalNotesCount / pagination.limit) || 1,
      totalNotesCount,
      limit: pagination.limit,
    },
    stats: {
      totalNotes: totalNotesCount,
      totalLikesReceived,
      totalBookmarksReceived,
      totalDownloads,
      avgRating,
      totalDoubtsAsked,
      totalAnswersGiven,
      totalAcceptedAnswers,
    },
  };
};

/**
 * Update User Profile with Mass-Assignment Protection & Avatar Protocol Enforcement
 */
exports.updateUserProfile = async (userId, profileData) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError('Invalid user identifier.', 400);
  }

  const { name, username, bio, avatar, qualification, experience, teachingBio, subjectsHandled } = profileData;

  const updatePayload = {};

  if (name) {
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      throw new AppError('Name must be between 2 and 50 characters.', 400);
    }
    updatePayload.name = trimmedName;
  }

  if (username) {
    const trimmedUsername = username.toLowerCase().trim();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      throw new AppError('Username must be between 3 and 30 characters.', 400);
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
      throw new AppError('Username can only contain letters, numbers, underscores, and hyphens.', 400);
    }

    const existing = await User.findOne({
      username: trimmedUsername,
      _id: { $ne: userId },
    });
    if (existing) {
      throw new AppError('Username is already taken by another account.', 400);
    }
    updatePayload.username = trimmedUsername;
  }

  if (bio !== undefined) {
    const trimmedBio = bio.trim();
    if (trimmedBio.length > 250) {
      throw new AppError('Bio cannot exceed 250 characters.', 400);
    }
    updatePayload.bio = trimmedBio;
  }

  if (avatar !== undefined) {
    if (avatar && isValidAvatarUrl(avatar)) {
      updatePayload.avatar = avatar.trim();
    } else {
      updatePayload.avatar = '/images/logo.png';
    }
  }

  if (qualification !== undefined) updatePayload.qualification = qualification.trim().slice(0, 100);
  if (experience !== undefined) updatePayload.experience = experience.trim().slice(0, 100);
  if (teachingBio !== undefined) updatePayload.teachingBio = teachingBio.trim().slice(0, 500);
  if (Array.isArray(subjectsHandled)) updatePayload.subjectsHandled = subjectsHandled.map((s) => String(s).trim());

  let updatedUser;
  try {
    updatedUser = await User.findByIdAndUpdate(userId, updatePayload, {
      returnDocument: 'after',
      runValidators: true,
    }).select('-password');
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError('Username is already taken by another account.', 400);
    }
    throw err;
  }

  if (!updatedUser) {
    throw new AppError('User profile not found.', 404);
  }

  return updatedUser;
};

/**
 * Get User Dashboard Data (Student vs Teacher Role-Aware)
 */
exports.getUserDashboardData = async (userId, userRole = null, queryParams = {}) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError('Invalid user identifier.', 400);
  }

  const user = await User.findById(userId).select('-password').lean();
  if (!user) throw new AppError('User account not found.', 404);

  const pagination = parsePagination(queryParams);

  // Notifications integration
  const [notificationsResult, unreadNotificationsCount] = await Promise.all([
    notificationService.getUserNotifications(userId, { limit: 5 }),
    notificationService.getUnreadCount(userId),
  ]);
  const notifications = notificationsResult ? notificationsResult.notifications || [] : [];

  // Activity Feed & Popular Notes
  const [activityFeed, popularNotes] = await Promise.all([
    buildUserActivityFeed(userId, 15),
    Note.find({ isPublished: true, visibility: 'public', isDeleted: false, approvalStatus: 'approved' })
      .sort({ views: -1, downloads: -1, createdAt: -1 })
      .limit(6)
      .populate('author', 'name username avatar role')
      .lean(),
  ]);

  let dashboardResponse = {
    user,
    notifications,
    unreadNotificationsCount,
    activityFeed,
    popularNotes,
    pagination: {
      currentPage: pagination.page,
      limit: pagination.limit,
    },
  };

  if (user.role === 'teacher') {
    const teacherSubjects = Array.isArray(user.subjectsHandled) && user.subjectsHandled.length > 0
      ? user.subjectsHandled
      : [];

    const subjectFilter = teacherSubjects.length > 0 ? { subject: { $in: teacherSubjects } } : {};

    const [
      authoredNotes,
      authoredCount,
      myAnswers,
      myAnswersCount,
      openDoubts,
      openDoubtsCount,
      acceptedAnswersCount,
    ] = await Promise.all([
      Note.find({ author: userId, isDeleted: false })
        .populate('author', 'name username avatar role')
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      Note.countDocuments({ author: userId, isDeleted: false }),
      Answer.find({ author: userId, isDeleted: false })
        .populate('doubt', 'title status')
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      Answer.countDocuments({ author: userId, isDeleted: false }),
      Doubt.find({ status: 'open', isDeleted: false, ...subjectFilter })
        .populate('student', 'name username avatar')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Doubt.countDocuments({ status: 'open', isDeleted: false, ...subjectFilter }),
      Answer.countDocuments({ author: userId, isDeleted: false, isAccepted: true }),
    ]);

    const authoredNoteIds = authoredNotes.map((n) => n._id);
    const [likesReceivedCount, ratingStats] = await Promise.all([
      Like.countDocuments({ note: { $in: authoredNoteIds } }),
      Rating.aggregate([
        { $match: { note: { $in: authoredNoteIds } } },
        { $group: { _id: null, avgRating: { $avg: '$rating' } } },
      ]),
    ]);

    const totalDownloads = authoredNotes.reduce((sum, n) => sum + (n.downloads || 0), 0);
    const totalViews = authoredNotes.reduce((sum, n) => sum + (n.views || 0), 0);
    const avgRating = ratingStats.length > 0 ? parseFloat(ratingStats[0].avgRating.toFixed(1)) : 0;

    dashboardResponse = {
      ...dashboardResponse,
      teacher: user,
      uploadedResources: authoredNotes,
      myAnswers,
      openDoubts,
      stats: {
        resourcesCount: authoredCount,
        answersCount: myAnswersCount,
        acceptedAnswersCount,
        totalDownloadsReceived: totalDownloads,
        totalViewsReceived: totalViews,
        likesReceivedCount,
        avgRating,
        openDoubtsCount,
      },
    };
  } else {
    // Student Dashboard Data
    const [
      uploadedNotes,
      uploadedCount,
      rawBookmarks,
      bookmarkedCount,
      rawLikes,
      likedCount,
      myDoubts,
      myDoubtsCount,
    ] = await Promise.all([
      Note.find({ author: userId, isDeleted: false })
        .populate('author', 'name username avatar role')
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      Note.countDocuments({ author: userId, isDeleted: false }),
      Bookmark.find({ user: userId })
        .populate({
          path: 'note',
          populate: { path: 'author', select: 'name username avatar role' },
        })
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      Bookmark.countDocuments({ user: userId }),
      Like.find({ user: userId })
        .populate({
          path: 'note',
          populate: { path: 'author', select: 'name username avatar role' },
        })
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      Like.countDocuments({ user: userId }),
      Doubt.find({ student: userId, isDeleted: false })
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      Doubt.countDocuments({ student: userId, isDeleted: false }),
    ]);

    const bookmarkedNotes = rawBookmarks
      .map((b) => b.note)
      .filter((n) => n && !n.isDeleted && n.isPublished && n.visibility === 'public' && n.approvalStatus === 'approved');

    const likedNotes = rawLikes
      .map((l) => l.note)
      .filter((n) => n && !n.isDeleted && n.isPublished && n.visibility === 'public' && n.approvalStatus === 'approved');

    const myDoubtIds = myDoubts.map((d) => d._id);
    const answersReceivedCount = await Answer.countDocuments({
      doubt: { $in: myDoubtIds },
      isDeleted: false,
    });

    const userComments = await Comment.find({ user: userId, isDeleted: false })
      .populate('note', 'title subject category')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const totalDownloadsReceived = uploadedNotes.reduce((sum, n) => sum + (n.downloads || 0), 0);
    const totalViewsReceived = uploadedNotes.reduce((sum, n) => sum + (n.views || 0), 0);

    dashboardResponse = {
      ...dashboardResponse,
      uploadedNotes,
      bookmarkedNotes,
      likedNotes,
      myDoubts,
      userComments,
      stats: {
        uploadedCount,
        bookmarkedCount,
        likedCount,
        totalDownloadsReceived,
        totalViewsReceived,
        doubtsCount: myDoubtsCount,
        answersReceivedCount,
        commentCount: userComments.length,
      },
    };
  }

  return dashboardResponse;
};

exports.checkNoteAccessibility = checkNoteAccessibility;
exports.isValidAvatarUrl = isValidAvatarUrl;
exports.parsePagination = parsePagination;
