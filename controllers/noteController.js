const path = require('path');
const fs = require('fs');
const noteService = require('../services/noteService');
const socialService = require('../services/socialService');
const Like = require('../models/Like');
const Bookmark = require('../models/Bookmark');
const wrapAsync = require('../middleware/asyncWrapper');
const AppError = require('../utils/AppError');

// @desc    Render Notes Listing / Explore Page with Search & Filters
// @route   GET /notes
exports.getNotes = wrapAsync(async (req, res) => {
  const result = await noteService.getPublicNotes(req.query);

  res.render('notes/index', {
    title: 'Explore Study Notes — StudyShare',
    path: '/notes',
    notes: result.notes,
    totalNotes: result.totalNotes,
    page: result.page,
    totalPages: result.totalPages,
    query: req.query,
  });
});

// @desc    Render Create Note Form
// @route   GET /notes/new
exports.getNewNote = (req, res) => {
  res.render('notes/new', {
    title: 'Upload Study Note — StudyShare',
    path: '/notes/new',
    formData: {},
  });
};

// @desc    Process New Note Creation & File Upload
// @route   POST /notes
exports.postNote = wrapAsync(async (req, res) => {
  const note = await noteService.createNote(req.user._id, req.body, req.file, req.user.role);

  if (note.approvalStatus === 'pending') {
    req.flash('success', 'Note uploaded successfully! It is currently pending review by Admin.');
  } else {
    req.flash('success', 'Note uploaded successfully!');
  }
  res.redirect(303, `/notes/${note._id}`);
});

// @desc    Render Note Details Page & Social Metadata & Increment Views
// @route   GET /notes/:id
exports.getNote = wrapAsync(async (req, res) => {
  const note = await noteService.getNoteById(req.params.id, req.user);

  // Increment views for public note details
  await noteService.incrementViews(note._id);

  // Determine ownership/admin authorization for UI controls
  const isOwner = req.user && note.author && note.author._id.equals(req.user._id);
  const isAdmin = req.user && req.user.role === 'admin';

  // Social interactions state
  const userId = req.user ? req.user._id : null;
  const likeCount = await Like.countDocuments({ note: note._id });
  const isLiked = userId ? Boolean(await Like.exists({ note: note._id, user: userId })) : false;

  const bookmarkCount = await Bookmark.countDocuments({ note: note._id });
  const isBookmarked = userId ? Boolean(await Bookmark.exists({ note: note._id, user: userId })) : false;

  const ratingStats = await socialService.getNoteRatingStats(note._id, userId);
  const comments = await socialService.getNoteComments(note._id);

  // Server-side safe canonical Share URL generation
  const shareUrl = `${req.protocol}://${req.get('host')}/notes/${note._id}`;
  const whatsappMessage = `StudyShare: ${note.title}\n${shareUrl}`;
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;
  const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(note.title)}`;

  res.render('notes/show', {
    title: `${note.title} — StudyShare`,
    path: '/notes',
    note,
    isOwner,
    isAdmin,
    likeCount,
    isLiked,
    bookmarkCount,
    isBookmarked,
    userRating: ratingStats.userRating,
    avgRating: ratingStats.avgRating,
    totalRatings: ratingStats.totalRatings,
    comments,
    shareUrl,
    whatsappShareUrl,
    telegramShareUrl,
    shareTitle: note.title,
  });
});

// @desc    Secure Direct Resource File Download & Increment Downloads
// @route   GET /notes/:id/download
exports.downloadNote = wrapAsync(async (req, res) => {
  const note = await noteService.getNoteById(req.params.id, req.user);

  if (!note.fileUrl) {
    throw new AppError('This note does not have an attached downloadable file.', 404);
  }

  // Increment download counter safely upon successful authorization check
  await noteService.incrementDownloads(note._id);

  // Remote Vercel Blob File
  if (note.fileUrl.startsWith('http://') || note.fileUrl.startsWith('https://')) {
    return res.redirect(note.fileUrl);
  }

  // Local Filesystem File
  const filePath = path.join(__dirname, '../public', note.fileUrl);

  if (!fs.existsSync(filePath)) {
    throw new AppError('The requested file resource is missing from server storage.', 404);
  }

  const downloadFilename = note.fileName || path.basename(filePath);
  res.download(filePath, downloadFilename);
});

// @desc    Secure Direct Resource File View (Opens PDF Inline in New Browser Tab)
// @route   GET /notes/:id/view
exports.viewNote = wrapAsync(async (req, res) => {
  const note = await noteService.getNoteById(req.params.id, req.user);

  if (!note.fileUrl) {
    throw new AppError('This note does not have an attached viewable file.', 404);
  }

  // Increment view counter safely upon successful authorization check
  await noteService.incrementViews(note._id);

  // Remote Vercel Blob File
  if (note.fileUrl.startsWith('http://') || note.fileUrl.startsWith('https://')) {
    return res.redirect(note.fileUrl);
  }

  // Local Filesystem File
  const filePath = path.join(__dirname, '../public', note.fileUrl);

  if (!fs.existsSync(filePath)) {
    throw new AppError('The requested file resource is missing from server storage.', 404);
  }

  const mimeType = note.mimeType || 'application/pdf';
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', 'inline');

  res.sendFile(filePath, { cacheControl: false });
});

// @desc    Render Edit Note Form
// @route   GET /notes/:id/edit
exports.getEditNote = wrapAsync(async (req, res) => {
  const note = await noteService.getNoteById(req.params.id, req.user);

  const isOwner = note.author && note.author._id.equals(req.user._id);
  const isAdmin = req.user && req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    req.flash('error', 'You do not have permission to edit this note.');
    return res.status(403).redirect(`/notes/${note._id}`);
  }

  res.render('notes/edit', {
    title: `Edit ${note.title} — StudyShare`,
    path: '/notes',
    note,
  });
});

// @desc    Process Note Edit Update
// @route   PUT /notes/:id
exports.putNote = wrapAsync(async (req, res) => {
  const updatedNote = await noteService.updateNote(req.params.id, req.user, req.body, req.file);

  req.flash('success', 'Note updated successfully!');
  res.redirect(303, `/notes/${updatedNote._id}`);
});

// @desc    Process Soft Delete Note
// @route   DELETE /notes/:id
exports.deleteNote = wrapAsync(async (req, res) => {
  await noteService.softDeleteNote(req.params.id, req.user);

  req.flash('success', 'Note deleted successfully.');
  res.redirect(303, '/notes');
});
