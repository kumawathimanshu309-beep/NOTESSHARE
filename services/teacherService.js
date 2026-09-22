const User = require('../models/User');
const Note = require('../models/Note');
const Doubt = require('../models/Doubt');
const Answer = require('../models/Answer');
const AppError = require('../utils/AppError');

/**
 * Get Teacher Dashboard data (uploaded resources, open doubts, answers provided, stats)
 */
exports.getTeacherDashboardData = async (teacherId) => {
  const teacher = await User.findById(teacherId).select('-password').lean();
  if (!teacher) throw new AppError('Teacher account not found.', 404);

  // 1. Resources uploaded by teacher
  const uploadedResources = await Note.find({ author: teacherId, isDeleted: false })
    .populate('author', 'name username avatar role')
    .sort({ createdAt: -1 })
    .lean();

  // 2. Open Student Doubts available to be answered
  const openDoubts = await Doubt.find({ status: { $in: ['open', 'answered'] }, isDeleted: false })
    .populate('student', 'name username avatar')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  // 3. Answers provided by this teacher
  const myAnswers = await Answer.find({ author: teacherId, isDeleted: false })
    .populate({
      path: 'doubt',
      select: 'title subject status',
      populate: { path: 'student', select: 'name username' },
    })
    .sort({ createdAt: -1 })
    .lean();

  const acceptedAnswersCount = myAnswers.filter((a) => a.isAccepted).length;

  return {
    teacher,
    uploadedResources,
    openDoubts,
    myAnswers,
    stats: {
      resourcesCount: uploadedResources.length,
      answersCount: myAnswers.length,
      acceptedAnswersCount,
      totalDownloadsReceived: uploadedResources.reduce((sum, n) => sum + (n.downloads || 0), 0),
    },
  };
};

/**
 * Get Teacher Public Profile data
 */
exports.getTeacherProfileData = async (username) => {
  const teacher = await User.findOne({ username: username.toLowerCase() })
    .select('-password')
    .lean();

  if (!teacher) {
    throw new AppError('Teacher profile not found.', 404);
  }

  if (teacher.role !== 'teacher' && teacher.role !== 'admin') {
    throw new AppError('Requested user profile is not a registered Teacher account.', 404);
  }

  // Teacher published public resources
  const resources = await Note.find({ author: teacher._id, isPublished: true, visibility: 'public', isDeleted: false, approvalStatus: 'approved' })
    .populate('author', 'name username avatar role')
    .sort({ createdAt: -1 })
    .lean();

  // Teacher answers
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
