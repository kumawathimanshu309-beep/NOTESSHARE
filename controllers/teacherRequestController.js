const governanceService = require('../services/governanceService');
const wrapAsync = require('../middleware/asyncWrapper');
const AppError = require('../utils/AppError');

/**
 * POST /teacher-requests
 * Submit a Teacher Application (Student) or Candidate Recommendation (Teacher)
 */
exports.postCreateTeacherRequest = wrapAsync(async (req, res) => {
  const { candidateUserId, reason, qualifications, subjects, experience } = req.body;

  // Security guard: Students can only apply for themselves; Teachers can recommend students
  let targetCandidateId = req.user._id;
  if (req.user.role === 'teacher' && candidateUserId) {
    targetCandidateId = candidateUserId;
  }

  // Parse subjects array if submitted as string or array
  let parsedSubjects = [];
  if (Array.isArray(subjects)) {
    parsedSubjects = subjects;
  } else if (typeof subjects === 'string' && subjects.trim()) {
    parsedSubjects = subjects.split(',').map((s) => s.trim());
  }

  await governanceService.createTeacherRequest({
    candidateUserId: targetCandidateId,
    requestedById: req.user._id,
    reason: reason || '',
    qualifications: qualifications || '',
    subjects: parsedSubjects,
    experience: experience || '',
  });

  const isSelf = targetCandidateId.toString() === req.user._id.toString();
  req.flash(
    'success',
    isSelf
      ? 'Your teacher application has been submitted successfully and is pending HOD/Admin review.'
      : 'Candidate recommendation submitted successfully for HOD/Admin review.'
  );

  res.redirect(303, req.user.role === 'teacher' ? '/teacher/dashboard' : '/dashboard');
});
