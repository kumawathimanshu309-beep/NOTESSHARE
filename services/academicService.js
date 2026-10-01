const mongoose = require('mongoose');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const AppError = require('../utils/AppError');

/**
 * Generate URL-friendly slug from string
 */
function createSlug(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Get paginated subjects for admin panel
 */
exports.getAllSubjects = async (query = {}) => {
  const { search, department, status, page = 1, limit = 20 } = query;
  const filter = {};

  if (status === 'active') filter.isActive = true;
  if (status === 'inactive') filter.isActive = false;

  if (department && department.trim()) {
    filter.department = department.trim();
  }

  if (search && search.trim()) {
    const sanitized = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: sanitized, $options: 'i' } },
      { code: { $regex: sanitized, $options: 'i' } },
      { department: { $regex: sanitized, $options: 'i' } },
    ];
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (parsedPage - 1) * parsedLimit;

  const [subjects, totalCount, departments] = await Promise.all([
    Subject.find(filter).sort({ name: 1 }).skip(skip).limit(parsedLimit).lean(),
    Subject.countDocuments(filter),
    Subject.distinct('department'),
  ]);

  // Aggregate topic counts for each subject
  const subjectIds = subjects.map((s) => s._id);
  const topicCounts = await Topic.aggregate([
    { $match: { subject: { $in: subjectIds } } },
    { $group: { _id: '$subject', count: { $sum: 1 } } },
  ]);

  const topicCountMap = {};
  topicCounts.forEach((tc) => {
    topicCountMap[tc._id.toString()] = tc.count;
  });

  const enrichedSubjects = subjects.map((s) => ({
    ...s,
    topicCount: topicCountMap[s._id.toString()] || 0,
  }));

  const totalPages = Math.ceil(totalCount / parsedLimit) || 1;

  return {
    subjects: enrichedSubjects,
    totalCount,
    departments,
    page: parsedPage,
    totalPages,
  };
};

/**
 * Get active subjects for public dropdowns
 */
exports.getActiveSubjects = async () => {
  return await Subject.find({ isActive: true }).sort({ name: 1 }).lean();
};

/**
 * Get single subject by ID
 */
exports.getSubjectById = async (subjectId) => {
  if (!mongoose.Types.ObjectId.isValid(subjectId)) {
    throw new AppError('Invalid subject ID.', 400);
  }
  const subject = await Subject.findById(subjectId).lean();
  if (!subject) throw new AppError('Subject not found.', 404);
  return subject;
};

/**
 * Create new subject
 */
exports.createSubject = async (data) => {
  const { name, code, department, description, isActive } = data;
  if (!name || !name.trim()) throw new AppError('Subject name is required.', 400);

  const trimmedName = name.trim();
  const slug = createSlug(trimmedName);

  // Check duplicate name or slug
  const existing = await Subject.findOne({
    $or: [{ name: { $regex: `^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }, { slug }],
  });

  if (existing) {
    throw new AppError(`A subject with the name "${trimmedName}" already exists.`, 400);
  }

  const subject = await Subject.create({
    name: trimmedName,
    slug,
    code: code ? code.trim() : '',
    department: department ? department.trim() : 'General',
    description: description ? description.trim() : '',
    isActive: isActive === 'false' || isActive === false ? false : true,
  });

  return subject;
};

/**
 * Update subject
 */
exports.updateSubject = async (subjectId, data) => {
  if (!mongoose.Types.ObjectId.isValid(subjectId)) {
    throw new AppError('Invalid subject ID.', 400);
  }

  const subject = await Subject.findById(subjectId);
  if (!subject) throw new AppError('Subject not found.', 404);

  const { name, code, department, description, isActive } = data;
  if (name && name.trim()) {
    const trimmedName = name.trim();
    const slug = createSlug(trimmedName);

    // Check duplicate excluding current subject
    const existing = await Subject.findOne({
      _id: { $ne: subjectId },
      $or: [{ name: { $regex: `^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }, { slug }],
    });

    if (existing) {
      throw new AppError(`Another subject with the name "${trimmedName}" already exists.`, 400);
    }

    subject.name = trimmedName;
    subject.slug = slug;
  }

  if (code !== undefined) subject.code = code.trim();
  if (department !== undefined) subject.department = department.trim();
  if (description !== undefined) subject.description = description.trim();
  if (isActive !== undefined) {
    subject.isActive = isActive === 'false' || isActive === false ? false : true;
  }

  await subject.save();
  return subject;
};

/**
 * Toggle active status of subject (soft-delete toggle)
 */
exports.toggleSubjectActive = async (subjectId) => {
  if (!mongoose.Types.ObjectId.isValid(subjectId)) {
    throw new AppError('Invalid subject ID.', 400);
  }
  const subject = await Subject.findById(subjectId);
  if (!subject) throw new AppError('Subject not found.', 404);

  subject.isActive = !subject.isActive;
  await subject.save();
  return subject;
};

/**
 * Get topics for a specific subject
 */
exports.getTopicsBySubject = async (subjectId, query = {}) => {
  if (!mongoose.Types.ObjectId.isValid(subjectId)) {
    throw new AppError('Invalid subject ID.', 400);
  }

  const subject = await Subject.findById(subjectId).lean();
  if (!subject) throw new AppError('Parent subject not found.', 404);

  const { search, status } = query;
  const filter = { subject: subjectId };

  if (status === 'active') filter.isActive = true;
  if (status === 'inactive') filter.isActive = false;

  if (search && search.trim()) {
    const sanitized = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.name = { $regex: sanitized, $options: 'i' };
  }

  const topics = await Topic.find(filter).sort({ name: 1 }).lean();

  return {
    subject,
    topics,
  };
};

/**
 * Get active topics for a subject (for student dropdowns)
 */
exports.getActiveTopicsBySubject = async (subjectId) => {
  if (!mongoose.Types.ObjectId.isValid(subjectId)) return [];
  return await Topic.find({ subject: subjectId, isActive: true }).sort({ name: 1 }).lean();
};

/**
 * Create topic under subject
 */
exports.createTopic = async (subjectId, data) => {
  if (!mongoose.Types.ObjectId.isValid(subjectId)) {
    throw new AppError('Invalid subject ID.', 400);
  }

  const subject = await Subject.findById(subjectId);
  if (!subject) throw new AppError('Parent subject not found.', 404);

  const { name, description, isActive } = data;
  if (!name || !name.trim()) throw new AppError('Topic name is required.', 400);

  const trimmedName = name.trim();
  const slug = createSlug(trimmedName);

  // Check duplicate topic name under SAME subject
  const existing = await Topic.findOne({
    subject: subjectId,
    $or: [{ name: { $regex: `^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }, { slug }],
  });

  if (existing) {
    throw new AppError(`A topic named "${trimmedName}" already exists under ${subject.name}.`, 400);
  }

  const topic = await Topic.create({
    subject: subjectId,
    name: trimmedName,
    slug,
    description: description ? description.trim() : '',
    isActive: isActive === 'false' || isActive === false ? false : true,
  });

  return topic;
};

/**
 * Update topic
 */
exports.updateTopic = async (topicId, data) => {
  if (!mongoose.Types.ObjectId.isValid(topicId)) {
    throw new AppError('Invalid topic ID.', 400);
  }

  const topic = await Topic.findById(topicId);
  if (!topic) throw new AppError('Topic not found.', 404);

  const { name, description, isActive } = data;

  if (name && name.trim()) {
    const trimmedName = name.trim();
    const slug = createSlug(trimmedName);

    // Check duplicate topic under SAME subject excluding current topic
    const existing = await Topic.findOne({
      subject: topic.subject,
      _id: { $ne: topicId },
      $or: [{ name: { $regex: `^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }, { slug }],
    });

    if (existing) {
      throw new AppError(`Another topic named "${trimmedName}" already exists under this subject.`, 400);
    }

    topic.name = trimmedName;
    topic.slug = slug;
  }

  if (description !== undefined) topic.description = description.trim();
  if (isActive !== undefined) {
    topic.isActive = isActive === 'false' || isActive === false ? false : true;
  }

  await topic.save();
  return topic;
};

/**
 * Toggle active status of topic (soft-delete toggle)
 */
exports.toggleTopicActive = async (topicId) => {
  if (!mongoose.Types.ObjectId.isValid(topicId)) {
    throw new AppError('Invalid topic ID.', 400);
  }
  const topic = await Topic.findById(topicId);
  if (!topic) throw new AppError('Topic not found.', 404);

  topic.isActive = !topic.isActive;
  await topic.save();
  return topic;
};
