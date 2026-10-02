const crypto = require('crypto');

/**
 * CSRF Token Generator Middleware
 * Ensures every visitor and session has a valid CSRF token,
 * exposes it via res.locals.csrfToken for EJS templates,
 * and synchronizes it with the _csrf cookie for client-side JavaScript.
 */
function csrfTokenMiddleware(req, res, next) {
  let token = (req.session && req.session.csrfToken) || (req.cookies && req.cookies['_csrf']);

  if (!token) {
    token = crypto.randomBytes(24).toString('hex');
  }

  if (req.session) {
    req.session.csrfToken = token;
  }

  // Set or update client-accessible cookie for fetch/XHR scripts
  if (!req.cookies || req.cookies['_csrf'] !== token) {
    res.cookie('_csrf', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }

  res.locals.csrfToken = token;
  next();
}

/**
 * Strict CSRF Token Verification Middleware
 * Validates that incoming _csrf in req.body or request headers matches
 * the active session or cookie CSRF token.
 */
function verifyCsrfToken(req, res, next) {
  // Safe HTTP Methods bypass CSRF check
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const incomingToken =
    (req.body && req.body._csrf) ||
    req.headers['x-csrf-token'] ||
    req.headers['csrf-token'];

  const sessionToken = req.session && req.session.csrfToken;
  const cookieToken = req.cookies && req.cookies['_csrf'];

  const isValid =
    Boolean(incomingToken) &&
    ((Boolean(sessionToken) && incomingToken === sessionToken) ||
      (Boolean(cookieToken) && incomingToken === cookieToken));

  if (!isValid) {
    const errorMsg = 'Invalid or missing CSRF security token.';
    if (
      req.xhr ||
      req.headers['x-requested-with'] === 'XMLHttpRequest' ||
      req.headers.accept?.includes('application/json')
    ) {
      return res.status(403).json({ success: false, message: errorMsg });
    }
    req.flash('error', errorMsg);
    return res.status(403).redirect(303, req.headers.referer || `/notes/${req.params.id || ''}`);
  }

  next();
}

module.exports = {
  csrfTokenMiddleware,
  verifyCsrfToken,
};
