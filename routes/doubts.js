const express = require('express');
const router = express.Router();
const doubtController = require('../controllers/doubtController');
const { isLoggedIn, isTeacher } = require('../middleware/auth');

// Public Doubts Listing & Search
router.get('/', doubtController.getDoubts);

// Create Doubt Routes (Requires Login)
router.get('/new', isLoggedIn, doubtController.getNewDoubtForm);
router.post('/', isLoggedIn, doubtController.postDoubt);

// Public Doubt View
router.get('/:id', doubtController.getDoubt);

// Edit & Delete Doubt Routes
router.get('/:id/edit', isLoggedIn, doubtController.getEditDoubtForm);
router.put('/:id', isLoggedIn, doubtController.putDoubt);
router.delete('/:id', isLoggedIn, doubtController.deleteDoubt);

// Teacher Answer Route
router.post('/:id/answers', isLoggedIn, isTeacher, doubtController.postAnswer);

module.exports = router;
