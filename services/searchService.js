const Note = require('../models/Note');
const Doubt = require('../models/Doubt');
const User = require('../models/User');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');

/**
 * Perform safe global search across Notes, Doubts, Faculty, Subjects, and Topics
 */
exports.globalSearch = async (queryParams = {}) => {
  const { q, type = 'all', page = 1, limit = 12 } = queryParams;

  const searchQuery = (q && typeof q === 'string') ? q.trim() : '';

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(24, Math.max(1, parseInt(limit, 10) || 12));
  const skip = (parsedPage - 1) * parsedLimit;

  if (!searchQuery || searchQuery.length < 2) {
    return {
      query: searchQuery,
      type,
      results: [],
      counts: { all: 0, notes: 0, doubts: 0, faculty: 0, subjects: 0, topics: 0 },
      page: parsedPage,
      totalPages: 1,
      totalResults: 0,
    };
  }

  // Escape special regex characters to prevent regex injection attacks
  const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const searchRegex = new RegExp(escapedQuery, 'i');

  // Build safe visibility-checked queries
  const noteFilter = {
    isDeleted: false,
    isPublished: true,
    visibility: 'public',
    approvalStatus: 'approved',
    $or: [
      { title: searchRegex },
      { description: searchRegex },
      { subject: searchRegex },
      { category: searchRegex },
      { tags: searchRegex },
    ],
  };

  const doubtFilter = {
    isDeleted: false,
    $or: [
      { title: searchRegex },
      { description: searchRegex },
      { subject: searchRegex },
      { topic: searchRegex },
      { tags: searchRegex },
    ],
  };

  const facultyFilter = {
    role: { $in: ['teacher', 'admin'] },
    $or: [
      { name: searchRegex },
      { username: searchRegex },
      { designation: searchRegex },
      { department: searchRegex },
      { specialization: searchRegex },
      { subjectsHandled: searchRegex },
    ],
  };

  const subjectFilter = {
    isActive: true,
    $or: [
      { name: searchRegex },
      { code: searchRegex },
      { department: searchRegex },
      { description: searchRegex },
    ],
  };

  const topicFilter = {
    isActive: true,
    $or: [
      { name: searchRegex },
      { description: searchRegex },
    ],
  };

  // Get total document counts per category for UI filter tabs
  const [notesCount, doubtsCount, facultyCount, subjectsCount, topicsCount] = await Promise.all([
    Note.countDocuments(noteFilter),
    Doubt.countDocuments(doubtFilter),
    User.countDocuments(facultyFilter),
    Subject.countDocuments(subjectFilter),
    Topic.countDocuments(topicFilter),
  ]);

  const counts = {
    notes: notesCount,
    doubts: doubtsCount,
    faculty: facultyCount,
    subjects: subjectsCount,
    topics: topicsCount,
    all: notesCount + doubtsCount + facultyCount + subjectsCount + topicsCount,
  };

  let results = [];
  let totalForCurrentType = 0;

  if (type === 'notes') {
    totalForCurrentType = notesCount;
    const docs = await Note.find(noteFilter)
      .populate('author', 'name username avatar role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean();
    results = docs.map((d) => ({ ...d, resultType: 'note' }));
  } else if (type === 'doubts') {
    totalForCurrentType = doubtsCount;
    const docs = await Doubt.find(doubtFilter)
      .populate('student', 'name username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean();
    results = docs.map((d) => ({ ...d, resultType: 'doubt' }));
  } else if (type === 'faculty') {
    totalForCurrentType = facultyCount;
    const docs = await User.find(facultyFilter)
      .select('name username avatar role designation qualification department specialization subjectsHandled college')
      .sort({ name: 1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean();
    results = docs.map((d) => ({ ...d, resultType: 'faculty' }));
  } else if (type === 'subjects') {
    totalForCurrentType = subjectsCount;
    const docs = await Subject.find(subjectFilter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean();
    results = docs.map((d) => ({ ...d, resultType: 'subject' }));
  } else if (type === 'topics') {
    totalForCurrentType = topicsCount;
    const docs = await Topic.find(topicFilter)
      .populate('subject', 'name code')
      .sort({ name: 1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean();
    results = docs.map((d) => ({ ...d, resultType: 'topic' }));
  } else {
    // Type === 'all'
    totalForCurrentType = counts.all;
    const perCategoryLimit = 4;

    const [notesDocs, doubtsDocs, facultyDocs, subjectsDocs, topicsDocs] = await Promise.all([
      Note.find(noteFilter).populate('author', 'name username avatar role').sort({ createdAt: -1 }).limit(perCategoryLimit).lean(),
      Doubt.find(doubtFilter).populate('student', 'name username avatar').sort({ createdAt: -1 }).limit(perCategoryLimit).lean(),
      User.find(facultyFilter).select('name username avatar role designation qualification department specialization subjectsHandled college').sort({ name: 1 }).limit(perCategoryLimit).lean(),
      Subject.find(subjectFilter).sort({ name: 1 }).limit(perCategoryLimit).lean(),
      Topic.find(topicFilter).populate('subject', 'name code').sort({ name: 1 }).limit(perCategoryLimit).lean(),
    ]);

    results = [
      ...notesDocs.map((d) => ({ ...d, resultType: 'note' })),
      ...facultyDocs.map((d) => ({ ...d, resultType: 'faculty' })),
      ...subjectsDocs.map((d) => ({ ...d, resultType: 'subject' })),
      ...doubtsDocs.map((d) => ({ ...d, resultType: 'doubt' })),
      ...topicsDocs.map((d) => ({ ...d, resultType: 'topic' })),
    ];
  }

  const totalPages = Math.ceil(totalForCurrentType / parsedLimit) || 1;

  return {
    query: searchQuery,
    type,
    results,
    counts,
    page: parsedPage,
    totalPages,
    totalResults: totalForCurrentType,
  };
};
