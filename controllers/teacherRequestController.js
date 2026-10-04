const governanceService = require('../services/governanceService');
const Subject = require('../models/Subject');
const wrapAsync = require('../middleware/asyncWrapper');

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

  // Validate requested subjects against active Subject catalog
  const catalogSubjects = await Subject.find({ isActive: true }).select('name code').lean();
  const normalizedSubjects = [];
  parsedSubjects.forEach((sub) => {
    const trimmed = String(sub).trim();
    if (!trimmed) return;
    const matched = catalogSubjects.find(
      (cs) => cs.name.toLowerCase() === trimmed.toLowerCase() || (cs.code && cs.code.toLowerCase() === trimmed.toLowerCase())
    );
    if (matched && !normalizedSubjects.includes(matched.name)) {
      normalizedSubjects.push(matched.name);
    }
  });

  if (normalizedSubjects.length === 0) {
    req.flash('error', 'Please select at least one valid subject from the active catalog.');
    return res.redirect(303, req.user.role === 'teacher' ? '/teacher/dashboard' : '/dashboard');
  }

  const trimmedReason = typeof reason === 'string' ? reason.trim() : '';
  const trimmedQualifications = typeof qualifications === 'string' ? qualifications.trim() : '';
  const trimmedExperience = typeof experience === 'string' ? experience.trim() : '';

  if (!trimmedReason) {
    req.flash('error', 'Please provide a valid application reason.');
    return res.status(400).redirect(303, req.user.role === 'teacher' ? '/teacher/dashboard' : '/dashboard');
  }

  if (trimmedReason.length > 500) {
    req.flash('error', 'Reason cannot exceed 500 characters.');
    return res.status(400).redirect(303, req.user.role === 'teacher' ? '/teacher/dashboard' : '/dashboard');
  }

  if (trimmedQualifications.length > 200) {
    req.flash('error', 'Qualifications cannot exceed 200 characters.');
    return res.status(400).redirect(303, req.user.role === 'teacher' ? '/teacher/dashboard' : '/dashboard');
  }

  if (trimmedExperience.length > 200) {
    req.flash('error', 'Experience cannot exceed 200 characters.');
    return res.status(400).redirect(303, req.user.role === 'teacher' ? '/teacher/dashboard' : '/dashboard');
  }

  await governanceService.createTeacherRequest({
    candidateUserId: targetCandidateId,
    requestedById: req.user._id,
    reason: trimmedReason,
    qualifications: trimmedQualifications,
    subjects: normalizedSubjects,
    experience: trimmedExperience,
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
