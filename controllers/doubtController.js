const doubtService = require('../services/doubtService');
const { doubtSchema } = require('../validators/doubtValidator');
const { answerSchema } = require('../validators/answerValidator');
const wrapAsync = require('../middleware/asyncWrapper');

/**
 * GET /doubts
 * Public / Student / Teacher Doubts Listing & Search
 */
exports.getDoubts = wrapAsync(async (req, res) => {
  const result = await doubtService.getDoubts(req.query);

  res.render('doubts/index', {
    title: 'Student Doubts & Q&A — StudyShare',
    path: '/doubts',
    doubts: result.doubts,
    totalDoubts: result.totalDoubts,
    page: result.page,
    totalPages: result.totalPages,
    query: req.query,
  });
});

/**
 * GET /doubts/new
 * Render Ask Doubt Form
 */
exports.getNewDoubtForm = (req, res) => {
  res.render('doubts/new', {
    title: 'Ask a Doubt — StudyShare',
    path: '/doubts/new',
    formData: {},
  });
};

/**
 * POST /doubts
 * Submit New Doubt with Identity Derivation
 */
exports.postDoubt = wrapAsync(async (req, res) => {
  const { error, value } = doubtSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMsg = error.details.map((d) => d.message).join(' ');
    req.flash('error', errorMsg);
    return res.render('doubts/new', {
      title: 'Ask a Doubt — StudyShare',
      path: '/doubts/new',
      formData: req.body,
    });
  }

  const doubt = await doubtService.createDoubt(req.user._id, value);

  req.flash('success', 'Your doubt has been posted! Teachers will review and answer soon.');
  return res.redirect(`/doubts/${doubt._id}`);
});

/**
 * GET /doubts/:id
 * Doubt Details & Answers View
 */
exports.getDoubt = wrapAsync(async (req, res) => {
  const doubt = await doubtService.getDoubtById(req.params.id);
  const answers = await doubtService.getAnswersForDoubt(doubt._id);

  const isDoubtOwner = req.user && doubt.student && doubt.student._id.equals(req.user._id);
  const isTeacher = req.user && (req.user.role === 'teacher' || req.user.role === 'admin');
  const isAdmin = req.user && req.user.role === 'admin';

  res.render('doubts/show', {
    title: `${doubt.title} — StudyShare Doubts`,
    path: '/doubts',
    doubt,
    answers,
    isDoubtOwner,
    isTeacher,
    isAdmin,
  });
});

/**
 * GET /doubts/:id/edit
 */
exports.getEditDoubtForm = wrapAsync(async (req, res) => {
  const doubt = await doubtService.getDoubtById(req.params.id);

  const isDoubtOwner = req.user && doubt.student && doubt.student._id.equals(req.user._id);
  const isAdmin = req.user && req.user.role === 'admin';

  if (!isDoubtOwner && !isAdmin) {
    req.flash('error', 'You do not have permission to edit this doubt.');
    return res.redirect(`/doubts/${doubt._id}`);
  }

  res.render('doubts/edit', {
    title: `Edit Doubt — ${doubt.title}`,
    path: '/doubts',
    doubt,
  });
});

/**
 * PUT /doubts/:id
 */
exports.putDoubt = wrapAsync(async (req, res) => {
  const { error, value } = doubtSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMsg = error.details.map((d) => d.message).join(' ');
    req.flash('error', errorMsg);
    return res.redirect(`/doubts/${req.params.id}/edit`);
  }

  const doubt = await doubtService.updateDoubt(
    req.params.id,
    req.user._id,
    req.user.role,
    value
  );

  req.flash('success', 'Doubt updated successfully.');
  return res.redirect(`/doubts/${doubt._id}`);
});

/**
 * DELETE /doubts/:id
 */
exports.deleteDoubt = wrapAsync(async (req, res) => {
  await doubtService.softDeleteDoubt(req.params.id, req.user._id, req.user.role);

  req.flash('success', 'Doubt deleted successfully.');
  return res.redirect('/doubts');
});

/**
 * POST /doubts/:id/answers
 * Submit Teacher Answer
 */
exports.postAnswer = wrapAsync(async (req, res) => {
  const doubtId = req.params.id;
  const teacherId = req.user._id;
  const teacherRole = req.user.role;

  const { error, value } = answerSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMsg = error.details.map((d) => d.message).join(' ');
    req.flash('error', errorMsg);
    return res.redirect(`/doubts/${doubtId}#answers`);
  }

  await doubtService.addAnswer(doubtId, teacherId, teacherRole, value.content);

  req.flash('success', 'Your answer has been published!');
  return res.redirect(`/doubts/${doubtId}#answers`);
});

/**
 * GET /answers/:id/edit
 */
exports.getEditAnswerForm = wrapAsync(async (req, res) => {
  const Answer = require('../models/Answer');
  const answer = await Answer.findById(req.params.id).populate('doubt', 'title');

  if (!answer || answer.isDeleted) {
    req.flash('error', 'Answer was not found.');
    return res.redirect('/doubts');
  }

  const isAuthor = answer.author.equals(req.user._id);
  const isAdmin = req.user.role === 'admin';

  if (!isAuthor && !isAdmin) {
    req.flash('error', 'You do not have permission to edit this answer.');
    return res.redirect(`/doubts/${answer.doubt._id}`);
  }

  res.render('answers/edit', {
    title: 'Edit Answer — StudyShare',
    answer,
  });
});

/**
 * PUT /answers/:id
 */
exports.putAnswer = wrapAsync(async (req, res) => {
  const { error, value } = answerSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMsg = error.details.map((d) => d.message).join(' ');
    req.flash('error', errorMsg);
    return res.redirect(`/answers/${req.params.id}/edit`);
  }

  const updatedAnswer = await doubtService.updateAnswer(
    req.params.id,
    req.user._id,
    req.user.role,
    value.content
  );

  req.flash('success', 'Answer updated successfully.');
  return res.redirect(`/doubts/${updatedAnswer.doubt}#answers`);
});

/**
 * DELETE /answers/:id
 */
exports.deleteAnswer = wrapAsync(async (req, res) => {
  const deletedAnswer = await doubtService.deleteAnswer(
    req.params.id,
    req.user._id,
    req.user.role
  );

  req.flash('success', 'Answer deleted.');
  return res.redirect(`/doubts/${deletedAnswer.doubt}#answers`);
});

/**
 * POST /answers/:id/accept
 * Accept Answer (Student Doubt Owner Only)
 */
exports.acceptAnswer = wrapAsync(async (req, res) => {
  const result = await doubtService.acceptAnswer(
    req.params.id,
    req.user._id,
    req.user.role
  );

  req.flash('success', 'Answer accepted as the solution!');
  return res.redirect(`/doubts/${result.doubt._id}#answers`);
});
