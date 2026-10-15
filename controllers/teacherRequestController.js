const mongoose = require('mongoose');
const governanceService = require('../services/governanceService');
const Subject = require('../models/Subject');
const wrapAsync = require('../middleware/asyncWrapper');

/**
 * POST /teacher-requests
 * Submit a Teacher Application (Student) or Candidate Recommendation (Teacher)
 */
exports.postCreateTeacherRequest = wrapAsync(async (req, res) => {
  const { candidateUserId, reason, qualifications, subjects, experience } = req.body;
  const isAjax = Boolean(
    req.xhr ||
    req.headers?.['x-requested-with'] === 'XMLHttpRequest' ||
    req.headers?.accept?.includes('application/json')
  );
  const redirectTarget = req.user.role === 'teacher' ? '/teacher/dashboard' : '/dashboard';

  // Security guard: Students can only apply for themselves; Teachers must provide a valid third-party candidate
  let targetCandidateId = req.user._id;
  if (req.user.role === 'teacher') {
    if (!candidateUserId || !mongoose.Types.ObjectId.isValid(candidateUserId)) {
      if (isAjax) {
        return res.status(400).json({ success: false, message: 'Please provide a valid 24-character candidate user identifier.' });
      }
      req.flash('error', 'Please provide a valid 24-character candidate user identifier.');
      return res.redirect(303, '/teacher/dashboard');
    }
    if (candidateUserId.toString() === req.user._id.toString()) {
      if (isAjax) {
        return res.status(400).json({ success: false, message: 'Teachers cannot recommend themselves. You are already a verified teacher.' });
      }
      req.flash('error', 'Teachers cannot recommend themselves. You are already a verified teacher.');
      return res.redirect(303, '/teacher/dashboard');
    }
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
    if (isAjax) {
      return res.status(400).json({ success: false, message: 'Please select at least one valid subject from the active catalog.' });
    }
    req.flash('error', 'Please select at least one valid subject from the active catalog.');
    return res.redirect(303, redirectTarget);
  }

  const trimmedReason = typeof reason === 'string' ? reason.trim() : '';
  const trimmedQualifications = typeof qualifications === 'string' ? qualifications.trim() : '';
  const trimmedExperience = typeof experience === 'string' ? experience.trim() : '';

  if (!trimmedReason) {
    if (isAjax) {
      return res.status(400).json({ success: false, message: 'Please provide a valid application reason.' });
    }
    req.flash('error', 'Please provide a valid application reason.');
    return res.redirect(303, redirectTarget);
  }

  if (trimmedReason.length > 500) {
    if (isAjax) {
      return res.status(400).json({ success: false, message: 'Reason cannot exceed 500 characters.' });
    }
    req.flash('error', 'Reason cannot exceed 500 characters.');
    return res.redirect(303, redirectTarget);
  }

  if (trimmedQualifications.length > 200) {
    if (isAjax) {
      return res.status(400).json({ success: false, message: 'Qualifications cannot exceed 200 characters.' });
    }
    req.flash('error', 'Qualifications cannot exceed 200 characters.');
    return res.redirect(303, redirectTarget);
  }

  if (trimmedExperience.length > 200) {
    if (isAjax) {
      return res.status(400).json({ success: false, message: 'Experience cannot exceed 200 characters.' });
    }
    req.flash('error', 'Experience cannot exceed 200 characters.');
    return res.redirect(303, redirectTarget);
  }

  const isSelf = targetCandidateId.toString() === req.user._id.toString();

  try {
    await governanceService.createTeacherRequest({
      candidateUserId: targetCandidateId,
      requestedById: req.user._id,
      reason: trimmedReason,
      qualifications: trimmedQualifications,
      subjects: normalizedSubjects,
      experience: trimmedExperience,
    });

    const successMsg = isSelf
      ? 'Your teacher application has been submitted successfully and is pending HOD/Admin review.'
      : 'Candidate recommendation submitted successfully for HOD/Admin review.';

    if (isAjax) {
      return res.status(201).json({ success: true, message: successMsg });
    }

    req.flash('success', successMsg);
  } catch (err) {
    const errorMsg = err.message || 'Could not submit teacher application.';
    if (isAjax) {
      return res.status(err.statusCode || 400).json({ success: false, message: errorMsg });
    }
    req.flash('error', errorMsg);
  }

  res.redirect(303, redirectTarget);
});
