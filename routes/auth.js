const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateSignup, validateLogin } = require('../validators/authValidator');

const { authLimiter } = require('../middleware/rateLimiter');

// Login Routes
router.get('/login', authController.getLogin);
router.post('/login', authLimiter, validateLogin, authController.postLogin);

// Signup Routes
router.get('/signup', authController.getSignup);
router.post('/signup', authLimiter, validateSignup, authController.postSignup);

// Forgot Password Routes
router.get('/forgot-password', authController.getForgotPassword);
router.post('/forgot-password', authController.postForgotPassword);

// Google OAuth Routes
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);

// Logout Routeimport 
router.post('/logout', authController.postLogout);

module.exports = router;
