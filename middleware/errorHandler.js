const AppError = require('../utils/AppError');

const notFoundHandler = (req, res, next) => {
  next(new AppError(`The requested URL ${req.originalUrl} was not found on StudyShare.`, 404));
};

const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  const isDev = process.env.NODE_ENV !== 'production';

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
