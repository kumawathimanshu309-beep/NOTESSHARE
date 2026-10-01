const mongoose = require('mongoose');
const User = require('../models/User');
const Note = require('../models/Note');
const Answer = require('../models/Answer');
const AppError = require('../utils/AppError');

/**
 * Fetch public faculty directory with search, filtering, and safe pagination
 */
exports.getFacultyDirectory = async (queryParams = {}) => {
  const { search, department, subject, designation, specialization, page = 1, limit = 12 } = queryParams;

  // Base filter: Only legitimate active/verified teacher accounts
  const filter = {
    role: { $in: ['teacher', 'admin'] },
  };

  // 1. Text / Regex Search across safe public fields
  if (search && typeof search === 'string' && search.trim()) {
    const sanitizedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(sanitizedSearch, 'i');

    filter.$or = [
      { name: searchRegex },
      { username: searchRegex },
      { designation: searchRegex },
      { department: searchRegex },
      { specialization: searchRegex },
      { subjectsHandled: searchRegex },
      { college: searchRegex },
    ];
  }

  // 2. Department Filter
  if (department && typeof department === 'string' && department.trim() && department !== 'All') {
    const sanitizedDept = department.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.department = new RegExp(`^${sanitizedDept}$`, 'i');
  }

  // 3. Subject Handled Filter
  if (subject && typeof subject === 'string' && subject.trim() && subject !== 'All') {
    const sanitizedSub = subject.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const subRegex = new RegExp(sanitizedSub, 'i');
    filter.subjectsHandled = subRegex;
  }

  // 4. Designation Filter
  if (designation && typeof designation === 'string' && designation.trim() && designation !== 'All') {
    const sanitizedDesig = designation.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.designation = new RegExp(`^${sanitizedDesig}$`, 'i');
  }

  // 5. Specialization Filter
  if (specialization && typeof specialization === 'string' && specialization.trim() && specialization !== 'All') {
    const sanitizedSpec = specialization.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.specialization = new RegExp(`^${sanitizedSpec}$`, 'i');
  }

  // Safe pagination
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(24, Math.max(1, parseInt(limit, 10) || 12));
  const skip = (parsedPage - 1) * parsedLimit;

  // STRICT FIELD SELECTION: Never expose password, passwordHash, googleId, auth tokens, session data, internal governance
  const selectFields = 'name username avatar role designation qualification department specialization college experience teachingBio bio subjectsHandled createdAt';

  const [facultyList, totalFaculty] = await Promise.all([
    User.find(filter)
      .select(selectFields)
      .sort({ name: 1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    User.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalFaculty / parsedLimit) || 1;

  // Fetch unique filter values from DB for dropdown options
  const [departments, designations] = await Promise.all([
    User.distinct('department', { role: { $in: ['teacher', 'admin'] }, department: { $ne: '' } }),
    User.distinct('designation', { role: { $in: ['teacher', 'admin'] }, designation: { $ne: '' } }),
  ]);

  return {
    facultyList,
    totalFaculty,
    page: parsedPage,
    totalPages,
    limit: parsedLimit,
    filterOptions: {
      departments: departments.filter(Boolean).sort(),
      designations: designations.filter(Boolean).sort(),
    },
  };
};

/**
 * Fetch Public Faculty Profile by ID or Username
 */
exports.getFacultyProfile = async (identifier) => {
  if (!identifier || typeof identifier !== 'string') {
    throw new AppError('Invalid faculty identifier.', 400);
  }

  let filter = {};
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    filter = { _id: identifier, role: { $in: ['teacher', 'admin'] } };
  } else {
    filter = { username: identifier.toLowerCase(), role: { $in: ['teacher', 'admin'] } };
  }

  const selectFields = 'name username avatar role designation qualification department specialization college experience teachingBio bio subjectsHandled createdAt';

  const teacher = await User.findOne(filter).select(selectFields).lean();

  if (!teacher) {
    throw new AppError('Faculty profile was not found.', 404);
  }

  // Fetch published public resources by teacher
  const resources = await Note.find({
    author: teacher._id,
    isPublished: true,
    visibility: 'public',
    isDeleted: false,
    approvalStatus: 'approved',
  })
    .select('title description subject category resourceType downloads views createdAt')
    .sort({ createdAt: -1 })
    .lean();

  // Fetch answers provided by teacher
  const answers = await Answer.find({ author: teacher._id, isDeleted: false })
    .populate('doubt', 'title subject status')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const acceptedCount = answers.filter((a) => a.isAccepted).length;

  return {
    teacher,
    resources,
    answers,
    stats: {
      totalResources: resources.length,
      totalAnswers: answers.length,
      acceptedCount,
      totalDownloads: resources.reduce((sum, r) => sum + (r.downloads || 0), 0),
    },
  };
};
