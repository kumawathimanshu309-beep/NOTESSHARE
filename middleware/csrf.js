const crypto = require('crypto');

/**
 * Lightweight, zero-dependency Double Submit Cookie CSRF Middleware
 */
function csrfProtection(req, res, next) {
  let token = req.cookies ? req.cookies['_csrf'] : null;

  if (!token) {
    token = crypto.randomBytes(24).toString('hex');
    res.cookie('_csrf', token, {
      httpOnly: false, // Accessible by client JS to set X-CSRF-Token header on XHR requests
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }

  res.locals.csrfToken = token;

  // Safe HTTP Methods bypass CSRF check
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Validate incoming token against stored cookie if CSRF cookie or token is present
  const reqToken = req.body?._csrf || req.headers['x-csrf-token'] || req.headers['csrf-token'];
  const cookieToken = req.cookies ? req.cookies['_csrf'] : null;

  // If a CSRF cookie or CSRF body/header is present, enforce double-submit verification
  if (cookieToken || reqToken) {
    if (!reqToken || !cookieToken || reqToken !== cookieToken) {
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(403).json({ success: false, message: 'Invalid or missing CSRF security token.' });
      }
      return res.status(403).send('Invalid or missing CSRF security token.');
    }
  }

  next();
}

module.exports = csrfProtection;
