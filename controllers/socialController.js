const socialService = require('../services/socialService');
const { ratingSchema, commentSchema } = require('../validators/socialValidator');
const AppError = require('../utils/AppError');
const wrapAsync = require('../middleware/asyncWrapper');

/**
 * POST /notes/:id/like
 * POST /notes/:id/unlike
 */
exports.toggleLike = wrapAsync(async (req, res) => {
  const noteId = req.params.id;
  const userId = req.user._id;
  const userRole = req.user.role;

  const result = await socialService.toggleLike(noteId, userId, userRole);

  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.json({ success: true, liked: result.liked, likeCount: result.likeCount });
  }

  req.flash('success', result.liked ? 'Note added to your likes.' : 'Note removed from your likes.');
  return res.redirect(`/notes/${noteId}`);
});

/**
 * POST /notes/:id/bookmark
 * POST /notes/:id/unbookmark
 */
exports.toggleBookmark = wrapAsync(async (req, res) => {
  const noteId = req.params.id;
  const userId = req.user._id;
  const userRole = req.user.role;

  const result = await socialService.toggleBookmark(noteId, userId, userRole);

  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.json({ success: true, bookmarked: result.bookmarked, bookmarkCount: result.bookmarkCount });
  }

  req.flash('success', result.bookmarked ? 'Note saved to your bookmarks.' : 'Note removed from your bookmarks.');
  return res.redirect(`/notes/${noteId}`);
});

/**
 * POST /notes/:id/rate
 */
exports.rateNote = wrapAsync(async (req, res) => {
  const noteId = req.params.id;
  const userId = req.user._id;
  const userRole = req.user.role;

  const { error, value } = ratingSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMsg = error.details.map((d) => d.message).join(' ');
    req.flash('error', errorMsg);
    return res.redirect(`/notes/${noteId}`);
  }

  const result = await socialService.upsertRating(
    noteId,
    userId,
    userRole,
    value.rating,
    value.review || ''
  );

  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.json({
      success: true,
      userRating: result.userRating,
      avgRating: result.avgRating,
      totalRatings: result.totalRatings,
    });
  }

  req.flash('success', `Thank you! You rated this note ${result.userRating} out of 5 stars.`);
  return res.redirect(`/notes/${noteId}`);
});

/**
 * POST /notes/:id/comments
 */
exports.addComment = wrapAsync(async (req, res) => {
  const noteId = req.params.id;
  const userId = req.user._id;
  const userRole = req.user.role;

  const { error, value } = commentSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMsg = error.details.map((d) => d.message).join(' ');
    req.flash('error', errorMsg);
    return res.redirect(`/notes/${noteId}#comments`);
  }

  await socialService.addComment(noteId, userId, userRole, value.content);

  req.flash('success', 'Comment posted successfully.');
  return res.redirect(`/notes/${noteId}#comments`);
});

/**
 * GET /comments/:id/edit
 */
exports.renderEditCommentForm = wrapAsync(async (req, res) => {
  const commentId = req.params.id;
  const Comment = require('../models/Comment');
  const comment = await Comment.findById(commentId).populate('note', 'title');

  if (!comment || comment.isDeleted) {
    req.flash('error', 'Comment not found.');
    return res.redirect('/dashboard');
  }

  if (!comment.user.equals(req.user._id) && req.user.role !== 'admin') {
    req.flash('error', 'You can only edit your own comment.');
    return res.redirect(`/notes/${comment.note._id}`);
  }

  res.render('comments/edit', {
    title: 'Edit Comment — StudyShare',
    comment,
  });
});

/**
 * PUT /comments/:id
 */
exports.updateComment = wrapAsync(async (req, res) => {
  const commentId = req.params.id;
  const userId = req.user._id;
  const userRole = req.user.role;

  const { error, value } = commentSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMsg = error.details.map((d) => d.message).join(' ');
    req.flash('error', errorMsg);
    return res.redirect(`/comments/${commentId}/edit`);
  }

  const updatedComment = await socialService.updateComment(
    commentId,
    userId,
    userRole,
    value.content
  );

  req.flash('success', 'Comment updated successfully.');
  return res.redirect(`/notes/${updatedComment.note}#comments`);
});

/**
 * DELETE /comments/:id
 */
exports.deleteComment = wrapAsync(async (req, res) => {
  const commentId = req.params.id;
  const userId = req.user._id;
  const userRole = req.user.role;

  const deletedComment = await socialService.deleteComment(commentId, userId, userRole);

  req.flash('success', 'Comment removed.');
  return res.redirect(`/notes/${deletedComment.note}#comments`);
});
