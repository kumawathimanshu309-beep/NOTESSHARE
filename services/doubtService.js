const mongoose = require('mongoose');
const Doubt = require('../models/Doubt');
const Answer = require('../models/Answer');
const User = require('../models/User');
const notificationService = require('./notificationService');
const AppError = require('../utils/AppError');

/**
 * Create new Student Doubt
 */
exports.createDoubt = async (userId, data) => {
  const { title, description, subject, category, tags } = data;

  let processedTags = [];
  if (Array.isArray(tags)) {
    processedTags = tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
  } else if (typeof tags === 'string' && tags.trim()) {
    processedTags = tags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
  }

  const doubt = await Doubt.create({
    student: userId,
    title: title.trim(),
    description: description.trim(),
    subject: subject ? subject.trim() : 'General',
    category: category ? category.trim() : 'General',
    tags: processedTags,
    status: 'open',
  });

  return await doubt.populate('student', 'name username avatar role');
};

/**
 * Query public doubts listing with search, subject/status filters, safe pagination & whitelisted sorting
 */
exports.getDoubts = async (queryParams) => {
  const { search, subject, status, sort = 'newest', page = 1, limit = 12 } = queryParams;

  const filter = { isDeleted: false };

  // Status Filter
  if (status && ['open', 'answered', 'resolved', 'closed'].includes(status)) {
    filter.status = status;
  }

  // Subject Filter
  if (subject && subject !== 'All') {
    filter.subject = subject;
  }

  // Search Filter
  if (search && search.trim()) {
    const sanitizedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { title: { $regex: sanitizedSearch, $options: 'i' } },
      { description: { $regex: sanitizedSearch, $options: 'i' } },
      { subject: { $regex: sanitizedSearch, $options: 'i' } },
      { tags: { $regex: sanitizedSearch, $options: 'i' } },
    ];
  }

  // Whitelisted Sort Options
  let sortOption = { createdAt: -1 };
  if (sort === 'oldest') sortOption = { createdAt: 1 };
  if (sort === 'unanswered') sortOption = { status: 1, createdAt: -1 };
  if (sort === 'answered') sortOption = { status: -1, createdAt: -1 };

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
  const skip = (parsedPage - 1) * parsedLimit;

  const doubts = await Doubt.find(filter)
    .populate('student', 'name username avatar role')
    .sort(sortOption)
    .skip(skip)
    .limit(parsedLimit)
    .lean();

  const totalDoubts = await Doubt.countDocuments(filter);
  const totalPages = Math.ceil(totalDoubts / parsedLimit) || 1;

  return {
    doubts,
    totalDoubts,
    page: parsedPage,
    totalPages,
  };
};

/**
 * Fetch Doubt by ID with validation
 */
exports.getDoubtById = async (doubtId) => {
  if (!mongoose.Types.ObjectId.isValid(doubtId)) {
    throw new AppError('Invalid doubt identifier.', 400);
  }

  const doubt = await Doubt.findById(doubtId)
    .populate('student', 'name username avatar role')
    .populate({
      path: 'acceptedAnswer',
      populate: { path: 'author', select: 'name username avatar qualification' },
    });

  if (!doubt || doubt.isDeleted) {
    throw new AppError('Requested student doubt was not found.', 404);
  }

  return doubt;
};

/**
 * Update Doubt with ownership guard
 */
exports.updateDoubt = async (doubtId, userId, userRole, data) => {
  const doubt = await exports.getDoubtById(doubtId);

  const isOwner = doubt.student && doubt.student._id.equals(userId);
  const isAdmin = userRole === 'admin';

  if (!isOwner && !isAdmin) {
    throw new AppError('Forbidden: You do not have permission to edit this doubt.', 403);
  }

  const { title, description, subject, category, tags } = data;

  if (title) doubt.title = title.trim();
  if (description) doubt.description = description.trim();
  if (subject) doubt.subject = subject.trim();
  if (category) doubt.category = category.trim();

  if (tags) {
    if (Array.isArray(tags)) {
      doubt.tags = tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
    } else if (typeof tags === 'string') {
      doubt.tags = tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
    }
  }

  await doubt.save();
  return doubt;
};

/**
 * Soft delete Doubt
 */
exports.softDeleteDoubt = async (doubtId, userId, userRole) => {
  const doubt = await exports.getDoubtById(doubtId);

  const isOwner = doubt.student && doubt.student._id.equals(userId);
  const isAdmin = userRole === 'admin';

  if (!isOwner && !isAdmin) {
    throw new AppError('Forbidden: You do not have permission to delete this doubt.', 403);
  }

  doubt.isDeleted = true;
  doubt.deletedAt = new Date();
  doubt.deletedBy = userId;
  await doubt.save();

  return doubt;
};

/**
 * Submit Teacher Answer to a Doubt
 */
exports.addAnswer = async (doubtId, teacherId, teacherRole, content) => {
  if (teacherRole !== 'teacher' && teacherRole !== 'admin') {
    throw new AppError('Forbidden: Only verified teachers or administrators can answer doubts.', 403);
  }

  const doubt = await exports.getDoubtById(doubtId);

  if (doubt.status === 'closed') {
    throw new AppError('This doubt is closed for new answers.', 400);
  }

  const answer = await Answer.create({
    doubt: doubt._id,
    author: teacherId,
    content: content.trim(),
  });

  if (doubt.status === 'open') {
    doubt.status = 'answered';
    await doubt.save();
  }

  const populatedAnswer = await answer.populate('author', 'name username avatar role qualification experience');
  const authorName = populatedAnswer.author ? populatedAnswer.author.name : 'Someone';
  const isTeacher = teacherRole === 'teacher';

  const recipientId = doubt.student && doubt.student._id ? doubt.student._id : doubt.student;
  await notificationService.createNotification({
    recipient: recipientId,
    actor: teacherId,
    type: isTeacher ? 'teacher_answer' : 'doubt_answer',
    title: isTeacher ? 'Teacher Answered Your Doubt' : 'New Answer on Your Doubt',
    message: `${authorName} answered your doubt "${doubt.title}"`,
    entityType: 'Doubt',
    entityId: doubt._id,
    url: `/doubts/${doubt._id}`,
    eventKey: `answer:${answer._id}`,
  });

  return populatedAnswer;
};

/**
 * Fetch answers for a doubt
 */
exports.getAnswersForDoubt = async (doubtId) => {
  if (!mongoose.Types.ObjectId.isValid(doubtId)) return [];

  return await Answer.find({ doubt: doubtId, isDeleted: false })
    .populate('author', 'name username avatar role qualification experience')
    .sort({ isAccepted: -1, createdAt: -1 })
    .lean();
};

/**
 * Update Teacher Answer
 */
exports.updateAnswer = async (answerId, teacherId, teacherRole, content) => {
  if (!mongoose.Types.ObjectId.isValid(answerId)) {
    throw new AppError('Invalid answer identifier.', 400);
  }

  const answer = await Answer.findById(answerId);
  if (!answer || answer.isDeleted) {
    throw new AppError('Requested answer was not found or has been deleted.', 404);
  }

  const isAuthor = answer.author.equals(teacherId);
  const isAdmin = teacherRole === 'admin';

  if (!isAuthor && !isAdmin) {
    throw new AppError('Forbidden: You can only edit your own answer.', 403);
  }

  answer.content = content.trim();
  await answer.save();

  return await answer.populate('author', 'name username avatar role qualification');
};

/**
 * Soft Delete Teacher Answer
 */
exports.deleteAnswer = async (answerId, teacherId, teacherRole) => {
  if (!mongoose.Types.ObjectId.isValid(answerId)) {
    throw new AppError('Invalid answer identifier.', 400);
  }

  const answer = await Answer.findById(answerId);
  if (!answer || answer.isDeleted) {
    throw new AppError('Requested answer was not found or has already been deleted.', 404);
  }

  const isAuthor = answer.author.equals(teacherId);
  const isAdmin = teacherRole === 'admin';

  if (!isAuthor && !isAdmin) {
    throw new AppError('Forbidden: You can only delete your own answer.', 403);
  }

  answer.isDeleted = true;
  answer.deletedAt = new Date();
  answer.deletedBy = teacherId;
  await answer.save();

  return answer;
};

/**
 * Student Accepts an Answer (Strict Student Ownership Guard & Concurrency State Consistency)
 */
exports.acceptAnswer = async (answerId, studentId, studentRole) => {
  if (!mongoose.Types.ObjectId.isValid(answerId)) {
    throw new AppError('Invalid answer identifier.', 400);
  }

  const answer = await Answer.findById(answerId);
  if (!answer || answer.isDeleted) {
    throw new AppError('Answer was not found.', 404);
  }

  const doubt = await Doubt.findById(answer.doubt);
  if (!doubt || doubt.isDeleted) {
    throw new AppError('Associated student doubt was not found.', 404);
  }

  const isDoubtOwner = doubt.student.equals(studentId);
  const isAdmin = studentRole === 'admin';

  if (!isDoubtOwner && !isAdmin) {
    throw new AppError('Forbidden: Only the student who posted this doubt can accept an answer.', 403);
  }

  // Single-accepted answer enforcement: reset any existing accepted answer for this doubt
  await Answer.updateMany({ doubt: doubt._id }, { isAccepted: false });

  // Mark target answer as accepted
  answer.isAccepted = true;
  await answer.save();

  // Update doubt state
  doubt.acceptedAnswer = answer._id;
  doubt.isResolved = true;
  doubt.status = 'resolved';
  await doubt.save();

  const studentUser = await User.findById(studentId).select('name username').lean();
  const studentName = studentUser ? studentUser.name : 'Student';

  await notificationService.createNotification({
    recipient: answer.author,
    actor: studentId,
    type: 'answer_accepted',
    title: 'Your Answer Was Accepted!',
    message: `${studentName} accepted your answer to "${doubt.title}"`,
    entityType: 'Answer',
    entityId: answer._id,
    url: `/doubts/${doubt._id}`,
    eventKey: `accepted:${doubt._id}:${answer._id}`,
  });

  return { doubt, answer };
};
