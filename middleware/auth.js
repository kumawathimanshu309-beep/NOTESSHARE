const mongoose = require('mongoose');


// Ensure user is authenticated
exports.isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }

  // Safe returnTo URL check (prevent Open Redirect attacks)
  if (
    req.originalUrl &&
    req.originalUrl.startsWith('/') &&
    !req.originalUrl.startsWith('//') &&
    !req.originalUrl.includes('/auth/')
  ) {
    req.session.returnTo = req.originalUrl;
  }

  req.flash('error', 'Please log in to continue.');
  return res.redirect('/auth/login');
};

// Ensure user is a Teacher or Admin
exports.isTeacher = (req, res, next) => {
  if (req.isAuthenticated() && req.user && (req.user.role === 'teacher' || req.user.role === 'admin')) {
    return next();
  }
  req.flash('error', 'You do not have permission to access teacher resources.');
  return res.status(403).redirect('/dashboard');
};

// Ensure user is an Admin (Server-Side Zero-Trust Gate)
exports.isAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user && req.user.role === 'admin') {
    return next();
  }
  req.flash('error', 'Access denied. Administrator privileges required.');
  return res.status(403).redirect('/dashboard');
};

// Reusable Ownership Guard Foundation for Phase 3+
exports.isOwner = (getModel) => {
  return async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        req.flash('error', 'Please log in to perform this action.');
        return res.redirect('/auth/login');
      }

      const resourceId = req.params.id;

      // Validate ObjectId format to prevent database query exceptions
      if (!mongoose.Types.ObjectId.isValid(resourceId)) {
        req.flash('error', 'Invalid resource identifier.');
        return res.status(400).redirect('/dashboard');
      }

      const Model = getModel();
      const resource = await Model.findById(resourceId);

      if (!resource) {
        req.flash('error', 'Requested resource was not found.');
        return res.status(404).redirect('/dashboard');
      }

      // Admin or resource owner can modify
      const isResourceOwner = resource.author && resource.author.equals(req.user._id);
      const isSystemAdmin = req.user.role === 'admin';

      if (!isResourceOwner && !isSystemAdmin) {
        req.flash('error', 'You do not have permission to modify this resource.');
        return res.status(403).redirect('/dashboard');
      }

      req.resource = resource;
      next();
    } catch (err) {
      next(err);
    }
  };
};
