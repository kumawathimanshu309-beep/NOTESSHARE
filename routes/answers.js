const express = require('express');
const router = express.Router();
const doubtController = require('../controllers/doubtController');
const { isLoggedIn, isTeacher } = require('../middleware/auth');

router.get('/:id/edit', isLoggedIn, isTeacher, doubtController.getEditAnswerForm);
router.put('/:id', isLoggedIn, isTeacher, doubtController.putAnswer);
router.delete('/:id', isLoggedIn, isTeacher, doubtController.deleteAnswer);

// Student Accepts Answer (Ownership verified in controller/service)
router.post('/:id/accept', isLoggedIn, doubtController.acceptAnswer);

// Student/User Votes on Answer
router.post('/:id/vote', isLoggedIn, doubtController.postVoteAnswer);

module.exports = router;
