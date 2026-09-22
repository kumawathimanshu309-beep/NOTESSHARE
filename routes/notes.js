const express = require('express');
const router = express.Router();

const noteController = require('../controllers/noteController');
const socialController = require('../controllers/socialController');
const Note = require('../models/Note');
const { isLoggedIn, isOwner } = require('../middleware/auth');
const { handleNoteFileUpload } = require('../middleware/upload');
const { validateNote } = require('../validators/noteValidator');

// Helper to provide Model reference to isOwner closure
const getNoteModel = () => Note;

// Public Note Listing & Search
router.get('/', noteController.getNotes);

// Create Note Routes (Requires Login)
router.get('/new', isLoggedIn, noteController.getNewNote);
router.post('/', isLoggedIn, handleNoteFileUpload('file'), validateNote, noteController.postNote);

// Social Interactions on Notes (Requires Login)
router.post('/:id/like', isLoggedIn, socialController.toggleLike);
router.post('/:id/unlike', isLoggedIn, socialController.toggleLike);
router.post('/:id/bookmark', isLoggedIn, socialController.toggleBookmark);
router.post('/:id/unbookmark', isLoggedIn, socialController.toggleBookmark);
router.post('/:id/rate', isLoggedIn, socialController.rateNote);
router.post('/:id/comments', isLoggedIn, socialController.addComment);

// Public Note View & Secure Download / Stream
router.get('/:id', noteController.getNote);
router.get('/:id/view', noteController.viewNote);
router.get('/:id/download', noteController.downloadNote);

// Edit Note Routes (Requires Login & Ownership)
router.get('/:id/edit', isLoggedIn, isOwner(getNoteModel), noteController.getEditNote);
router.put('/:id', isLoggedIn, isOwner(getNoteModel), handleNoteFileUpload('file'), validateNote, noteController.putNote);

// Delete Note Route (Requires Login & Ownership)
router.delete('/:id', isLoggedIn, isOwner(getNoteModel), noteController.deleteNote);

module.exports = router;
