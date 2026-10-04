const AppError = require('../utils/AppError');

const notFoundHandler = (req, res, next) => {
  next(new AppError(`The requested URL ${req.originalUrl} was not found on StudyShare.`, 404));
};

const globalErrorHandler = (err, req, res, _next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  const isDev = process.env.NODE_ENV !== 'production';

  // Format Mongoose Validation Error into a clean message
  if (err.name === 'ValidationError') {
    err.statusCode = 400;
    const messages = Object.values(err.errors || {}).map((e) => e.message).filter(Boolean);
    err.message = messages.length > 0 ? messages.join('. ') : 'Validation error occurred. Please check your inputs.';
  }

  // Format CastError (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    err.statusCode = 400;
    err.message = `Invalid identifier format: ${err.value}`;
  }

  // Handle AJAX / API / JSON requests
  if (
    req.xhr ||
    req.headers['x-requested-with'] === 'XMLHttpRequest' ||
    req.headers.accept?.includes('application/json')
  ) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message || 'Something went wrong on our server.',
      errors: err.errors ? Object.keys(err.errors).map(k => err.errors[k].message) : undefined
    });
  }

  // For 400 validation error in standard form submit, flash and redirect back
  if (err.statusCode === 400) {
    if (typeof req.flash === 'function') {
      req.flash('error', err.message);
    }
    const referer = req.get('Referer') || req.headers.referer;
    if (referer) {
      return res.redirect(303, referer);
    }
  }

  // Handle 404 specially if preferred or render error page
  if (err.statusCode === 404) {
    return res.status(404).render('errors/404', {
      title: 'Page Not Found — StudyShare',
      path: req.originalUrl,
      message: err.message
    });
  }

  // Render general error page
  res.status(err.statusCode).render('errors/error', {
    title: `Error ${err.statusCode} — StudyShare`,
    statusCode: err.statusCode,
    message: err.message || 'Something went wrong on our server.',
    stack: isDev ? err.stack : null,
    isDev
  });
};

module.exports = {
  notFoundHandler,
  globalErrorHandler
};
