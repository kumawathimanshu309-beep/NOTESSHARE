require('dotenv').config();

const passport = require('passport');
const User = require('../models/User');
const wrapAsync = require('../middleware/asyncWrapper');

// Helper to check if Google OAuth is configured in environment
const isGoogleConfigured = () => {
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
  return Boolean(clientId && clientSecret);
};

// @desc    Render Login Page
// @route   GET /auth/login
exports.getLogin = (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  res.render('auth/login', {
    title: 'Log In — StudyShare',
    path: '/auth/login',
    formData: {},
    isGoogleConfigured: isGoogleConfigured(),
  });
};

// @desc    Process Login Submission
// @route   POST /auth/login
exports.postLogin = (req, res, next) => {
  if (req.body && !req.body.identifier && (req.body.email || req.body.username)) {
    req.body.identifier = String(req.body.email || req.body.username).trim();
  }

  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      req.flash('error', (info && info.message) || 'Invalid username/email or password.');
      return res.status(400).render('auth/login', {
        title: 'Log In — StudyShare',
        path: '/auth/login',
        formData: { identifier: req.body.identifier || req.body.email || req.body.username || '' },
        isGoogleConfigured: isGoogleConfigured(),
      });
    }

    // Save previous returnTo URL before session regeneration
    let redirectUrl = req.session.returnTo || '/dashboard';
    // Prevent Open Redirect vulnerability
    if (!redirectUrl.startsWith('/') || redirectUrl.startsWith('//')) {
      redirectUrl = '/dashboard';
    }

    // Regenerate session to prevent session fixation attacks
    req.session.regenerate((regenErr) => {
      if (regenErr) {
        return next(regenErr);
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }

        req.flash('success', `Welcome back, ${user.name}!`);
        res.redirect(redirectUrl);
      });
    });
  })(req, res, next);
};

// @desc    Render Signup Page
// @route   GET /auth/signup
exports.getSignup = (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  res.render('auth/signup', {
    title: 'Sign Up — StudyShare',
    path: '/auth/signup',
    formData: {},
    isGoogleConfigured: isGoogleConfigured(),
  });
};

// @desc    Process Signup Submission
// @route   POST /auth/signup
exports.postSignup = wrapAsync(async (req, res, next) => {
  const { name, username, email, password } = req.body;

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedUsername = username.toLowerCase().trim();

  // Check for existing duplicate email
  const existingEmail = await User.findOne({ email: normalizedEmail });
  if (existingEmail) {
    req.flash('error', 'An account with this email address already exists.');
    return res.status(400).render('auth/signup', {
      title: 'Sign Up — StudyShare',
      path: '/auth/signup',
      formData: { name, username, email },
      isGoogleConfigured: isGoogleConfigured(),
    });
  }

  // Check for existing duplicate username
  const existingUsername = await User.findOne({ username: normalizedUsername });
  if (existingUsername) {
    req.flash('error', 'This username is already taken. Please choose another.');
    return res.status(400).render('auth/signup', {
      title: 'Sign Up — StudyShare',
      path: '/auth/signup',
      formData: { name, username, email },
      isGoogleConfigured: isGoogleConfigured(),
    });
  }

  // Create new student user (force student role regardless of request body inputs)
  const newUser = new User({
    name,
    username: normalizedUsername,
    email: normalizedEmail,
    password,
    role: 'student',
  });

  try {
    await newUser.save();
  } catch (err) {
    if (err.code === 11000) {
      const duplicateField = Object.keys(err.keyPattern)[0];
      req.flash('error', `An account with this ${duplicateField} already exists.`);
      return res.status(400).render('auth/signup', {
        title: 'Sign Up — StudyShare',
        path: '/auth/signup',
        formData: { name, username, email },
        isGoogleConfigured: isGoogleConfigured(),
      });
    }
    throw err;
  }

  // Regenerate session upon registration
  req.session.regenerate((regenErr) => {
    if (regenErr) return next(regenErr);

    req.login(newUser, (err) => {
      if (err) return next(err);
      req.flash('success', 'Account created successfully. Welcome to StudyShare!');
      res.redirect('/dashboard');
    });
  });
});

// @desc    Render Forgot Password Page
// @route   GET /auth/forgot-password
exports.getForgotPassword = (req, res) => {
  res.render('auth/forgot-password', {
    title: 'Forgot Password — StudyShare',
    path: '/auth/forgot-password',
  });
};

// @desc    Process Forgot Password Submission (Safe generic response prevents account enumeration)
// @route   POST /auth/forgot-password
exports.postForgotPassword = wrapAsync(async (req, res) => {
  const { email } = req.body;
  // Always render generic success message regardless of email existence to prevent account enumeration
  req.flash('success', 'If an account matching that email exists, password reset instructions have been sent.');
  res.redirect('/auth/login');
});

// @desc    Initiate Google OAuth Sign-In
// @route   GET /auth/google
exports.googleAuth = (req, res, next) => {
  if (!isGoogleConfigured()) {
    req.flash('error', 'Google Sign-In is not currently configured in this environment.');
    return res.redirect('/auth/login');
  }

  // Preserve return path safely if provided
  if (req.query.redirect && req.query.redirect.startsWith('/') && !req.query.redirect.startsWith('//') && !req.query.redirect.includes('\\') && !req.query.redirect.includes(':')) {
    req.session.returnTo = req.query.redirect;
  }

  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
};

// @desc    Google OAuth Callback Handler
// @route   GET /auth/google/callback
exports.googleCallback = (req, res, next) => {
  if (!isGoogleConfigured()) {
    req.flash('error', 'Google Sign-In is not currently configured in this environment.');
    return res.redirect('/auth/login');
  }

  passport.authenticate('google', (err, user, info) => {
    if (err || !user) {
      req.flash('error', (info && info.message) || 'Google Sign-In failed or was cancelled.');
      return res.redirect('/auth/login');
    }

    let redirectUrl = req.session.returnTo || '/dashboard';
    if (!redirectUrl.startsWith('/') || redirectUrl.startsWith('//') || redirectUrl.includes('\\') || redirectUrl.includes(':')) {
      redirectUrl = '/dashboard';
    }
    delete req.session.returnTo;

    req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      req.flash('success', `Signed in successfully via Google as ${user.name}!`);
      res.redirect(redirectUrl);
    });
  })(req, res, next);
};

// @desc    Process Logout
// @route   POST /auth/logout
exports.postLogout = (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.redirect('/?logout=true');
    });
  });
};
