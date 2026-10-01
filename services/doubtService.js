const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Doubt = require('../models/Doubt');
const Answer = require('../models/Answer');
const User = require('../models/User');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const notificationService = require('./notificationService');
const blobService = require('./blobService');
const AppError = require('../utils/AppError');

/**
 * Save doubt attachment buffer (local / blob)
 */
async function saveDoubtFileBuffer(originalname, buffer, mimetype) {
  if (blobService && blobService.isBlobConfigured && blobService.isBlobConfigured()) {
    const blobResult = await blobService.uploadBufferToBlob(originalname, buffer, mimetype);
    return blobResult.url;
  }

  const uploadDir = path.join(__dirname, '../public/uploads/doubts');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const ext = path.extname(originalname).toLowerCase();
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const filename = `doubt-${uniqueSuffix}${ext}`;
  const filePath = path.join(uploadDir, filename);

  await fs.promises.writeFile(filePath, buffer);
  return `/uploads/doubts/${filename}`;
}

/**
 * Check if a teacher handles a given subject
 * Supports matching by Subject ObjectId, Subject Name (case-insensitive), or Subject Code (case-insensitive)
 * MANDATORY RULE: Specialization MUST NOT be used to exclude teachers.
 */
function isTeacherHandlingSubject(teacher, subjectDoc) {
  if (!teacher || !Array.isArray(teacher.subjectsHandled) || teacher.subjectsHandled.length === 0) {
    return false;
  }

  const targetId = subjectDoc._id ? subjectDoc._id.toString() : '';
  const targetName = subjectDoc.name ? subjectDoc.name.trim().toLowerCase() : '';
  const targetCode = subjectDoc.code ? subjectDoc.code.trim().toLowerCase() : '';

  return teacher.subjectsHandled.some((handled) => {
    if (!handled) return false;
    const itemStr = String(handled).trim().toLowerCase();

    // Check ObjectId match
    if (targetId && itemStr === targetId.toLowerCase()) return true;

    // Check Name match
    if (targetName && itemStr === targetName) return true;

    // Check Code match
    if (targetCode && itemStr === targetCode) return true;

    return false;
  });
}

/**
 * Create new Student Doubt with Subject/Topic Validation & Teacher Routing
 */
exports.createDoubt = async (userId, data, file) => {
  const { title, description, subjectId, topicId, subject, topic, category, tags } = data;

  if (!title || title.trim().length < 5) {
    throw new AppError('Title must be at least 5 characters.', 400);
  }
  if (!description || description.trim().length < 10) {
    throw new AppError('Description must be at least 10 characters long.', 400);
  }

  // 1. Validate Subject from DB
  let subjectDoc = null;
  if (subjectId && mongoose.Types.ObjectId.isValid(subjectId)) {
    subjectDoc = await Subject.findById(subjectId);
  } else if (subject && subject.trim()) {
    subjectDoc = await Subject.findOne({
      $or: [
        { name: { $regex: `^${subject.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
        { code: { $regex: `^${subject.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
      ],
    });
  }

  if (!subjectDoc || !subjectDoc.isActive) {
    throw new AppError('The selected subject does not exist or is inactive.', 400);
  }

  // 2. Validate Topic from DB
  let topicDoc = null;
  if (topicId && topicId !== 'default' && mongoose.Types.ObjectId.isValid(topicId)) {
    topicDoc = await Topic.findById(topicId);
  } else if (topic && topic.trim()) {
    topicDoc = await Topic.findOne({
      subject: subjectDoc._id,
      name: { $regex: `^${topic.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    });
  }

  if (topicDoc) {
    if (!topicDoc.isActive) {
      throw new AppError('The selected topic is inactive.', 400);
    }
    if (topicDoc.subject.toString() !== subjectDoc._id.toString()) {
      throw new AppError('Selected topic does not belong to the chosen subject.', 400);
    }
  } else {
    // If no topic matched or 0 topics created for subject yet, find or create default topic
    let defaultTopic = await Topic.findOne({ subject: subjectDoc._id, isActive: true });
    if (!defaultTopic) {
      const slug = `general-${subjectDoc._id}-${Date.now()}`;
      defaultTopic = await Topic.create({
        name: 'General Overview',
        slug,
        subject: subjectDoc._id,
        description: `General topics for ${subjectDoc.name}`,
        isActive: true,
      });
    }
    topicDoc = defaultTopic;
  }

  // 3. Attachment File Processing & Size Limit Validation
  let attachmentUrl = '';
  if (file) {
    if (file.size > 15 * 1024 * 1024) {
      throw new AppError('File too large. Maximum allowed file size is 15 MB.', 400);
    }
    attachmentUrl = await saveDoubtFileBuffer(file.originalname, file.buffer, file.mimetype);
  }

  // 4. Tags processing
  let processedTags = [];
  if (Array.isArray(tags)) {
    processedTags = tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
  } else if (typeof tags === 'string' && tags.trim()) {
    processedTags = tags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
  }

  // 5. Create Doubt Document in DB
  const doubt = await Doubt.create({
    student: userId,
    title: title.trim(),
    description: description.trim(),
    subjectId: subjectDoc._id,
    subject: subjectDoc.name,
    topicId: topicDoc._id,
    topic: topicDoc.name,
    category: subjectDoc.department || category || 'General',
    attachment: attachmentUrl,
    tags: processedTags,
    status: 'open',
  });

  // 6. CRITICAL ROUTING ALGORITHM
  // Find ALL eligible teachers in system
  const eligibleTeachers = await User.find({ role: 'teacher' }).select('_id name email subjectsHandled specialization').lean();

  const studentUser = await User.findById(userId).select('name').lean();
  const studentName = studentUser ? studentUser.name : 'A student';

  // Route notifications to EVERY matching teacher handling the selected Subject
  for (const teacher of eligibleTeachers) {
    if (isTeacherHandlingSubject(teacher, subjectDoc)) {
      await notificationService.createNotification({
        recipient: teacher._id,
        actor: userId,
        type: 'system',
        title: `New Doubt in ${subjectDoc.name}`,
        message: `${studentName} asked a question in ${subjectDoc.name}: "${doubt.title}"`,
        entityType: 'Doubt',
        entityId: doubt._id,
        url: `/doubts/${doubt._id}`,
        eventKey: `doubt_routed:${doubt._id}:${teacher._id}`,
      });
    }
  }

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
    filter.$or = [{ subject: subject }, { category: subject }];
  }

  // Search Filter
  if (search && search.trim()) {
    const sanitizedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { title: { $regex: sanitizedSearch, $options: 'i' } },
      { description: { $regex: sanitizedSearch, $options: 'i' } },
      { subject: { $regex: sanitizedSearch, $options: 'i' } },
      { topic: { $regex: sanitizedSearch, $options: 'i' } },
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
    eventKey: `answer_posted:${answer._id}:${recipientId}`,
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

  return await answer.populate('author', 'name username avatar role qualification experience');
};

/**
 * Delete Teacher Answer
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
 * Accept Answer as Solution (Student Doubt Owner Only)
 */
exports.acceptAnswer = async (answerId, userId, userRole) => {
  if (!mongoose.Types.ObjectId.isValid(answerId)) {
    throw new AppError('Invalid answer identifier.', 400);
  }

  const answer = await Answer.findById(answerId).populate('doubt');
  if (!answer || answer.isDeleted) {
    throw new AppError('Answer was not found or has been deleted.', 404);
  }

  const doubt = await Doubt.findById(answer.doubt._id);
  if (!doubt || doubt.isDeleted) {
    throw new AppError('Associated doubt was not found.', 404);
  }

  const isDoubtOwner = doubt.student.equals(userId);
  const isAdmin = userRole === 'admin';

  if (!isDoubtOwner && !isAdmin) {
    throw new AppError('Forbidden: Only the student who posted this doubt can accept an answer.', 403);
  }

  // Clear previously accepted answers for this doubt
  await Answer.updateMany({ doubt: doubt._id }, { isAccepted: false });

  answer.isAccepted = true;
  await answer.save();

  doubt.acceptedAnswer = answer._id;
  doubt.status = 'resolved';
  doubt.isResolved = true;
  await doubt.save();

  // Notify answer author
  const authorUser = await User.findById(userId).select('name').lean();
  const authorName = authorUser ? authorUser.name : 'Someone';
  await notificationService.createNotification({
    recipient: answer.author,
    actor: userId,
    type: 'answer_accepted',
    title: 'Your Answer Was Accepted!',
    message: `${authorName} marked your answer as the accepted solution for "${doubt.title}"`,
    entityType: 'Answer',
    entityId: answer._id,
    url: `/doubts/${doubt._id}#answers`,
    eventKey: `accept_answer:${answer._id}`,
  });

  return { doubt, answer };
};

/**
 * Vote on Teacher Answer (Helpful / Unhelpful)
 */
exports.voteAnswer = async (answerId, userId, voteType) => {
  if (!mongoose.Types.ObjectId.isValid(answerId)) {
    throw new AppError('Invalid answer identifier.', 400);
  }
  if (!['helpful', 'unhelpful'].includes(voteType)) {
    throw new AppError('Invalid vote type. Must be helpful or unhelpful.', 400);
  }

  const answer = await Answer.findById(answerId);
  if (!answer || answer.isDeleted) {
    throw new AppError('Answer was not found or has been deleted.', 404);
  }

  if (!Array.isArray(answer.helpfulVotes)) answer.helpfulVotes = [];
  if (!Array.isArray(answer.unhelpfulVotes)) answer.unhelpfulVotes = [];

  const userObjId = new mongoose.Types.ObjectId(userId);
  const helpfulIndex = answer.helpfulVotes.findIndex((id) => id.equals(userObjId));
  const unhelpfulIndex = answer.unhelpfulVotes.findIndex((id) => id.equals(userObjId));

  if (voteType === 'helpful') {
    if (helpfulIndex > -1) {
      // Toggle OFF
      answer.helpfulVotes.splice(helpfulIndex, 1);
    } else {
      answer.helpfulVotes.push(userObjId);
      if (unhelpfulIndex > -1) {
        // Vote Switch
        answer.unhelpfulVotes.splice(unhelpfulIndex, 1);
      }
    }
  } else if (voteType === 'unhelpful') {
    if (unhelpfulIndex > -1) {
      // Toggle OFF
      answer.unhelpfulVotes.splice(unhelpfulIndex, 1);
    } else {
      answer.unhelpfulVotes.push(userObjId);
      if (helpfulIndex > -1) {
        // Vote Switch
        answer.helpfulVotes.splice(helpfulIndex, 1);
      }
    }
  }

  answer.helpfulCount = answer.helpfulVotes.length;
  await answer.save();

  return {
    doubtId: answer.doubt,
    answerId: answer._id,
    helpfulCount: answer.helpfulCount,
    helpfulVotesCount: answer.helpfulVotes.length,
    unhelpfulVotesCount: answer.unhelpfulVotes.length,
    userVote: answer.helpfulVotes.some((id) => id.equals(userObjId))
      ? 'helpful'
      : answer.unhelpfulVotes.some((id) => id.equals(userObjId))
      ? 'unhelpful'
      : null,
  };
};

// Export helper for tests
exports.isTeacherHandlingSubject = isTeacherHandlingSubject;
