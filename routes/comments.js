const express = require('express');
const router = express.Router();
const socialController = require('../controllers/socialController');
const { isLoggedIn } = require('../middleware/auth');
const { verifyCsrfToken } = require('../middleware/csrf');

router.get('/:id/edit', isLoggedIn, socialController.renderEditCommentForm);
router.put('/:id', isLoggedIn, verifyCsrfToken, socialController.updateComment);
router.delete('/:id', isLoggedIn, verifyCsrfToken, socialController.deleteComment);

module.exports = router;
