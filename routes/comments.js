const express = require('express');
const router = express.Router();
const socialController = require('../controllers/socialController');
const { isLoggedIn } = require('../middleware/auth');

router.get('/:id/edit', isLoggedIn, socialController.renderEditCommentForm);
router.put('/:id', isLoggedIn, socialController.updateComment);
router.delete('/:id', isLoggedIn, socialController.deleteComment);

module.exports = router;
