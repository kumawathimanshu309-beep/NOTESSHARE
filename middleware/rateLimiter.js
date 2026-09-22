/**
 * In-Memory Rate Limiter Middleware
 */
function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes default
  const max = options.max || 100; // Max requests per window
  const message = options.message || 'Too many requests from this IP. Please try again later.';

  const hits = new Map();

  // Periodic cleanup every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref();

  return function rateLimiter(req, res, next) {
    // Bypass rate limit in test environment for test suite automation
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();

    let record = hits.get(ip);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      hits.set(ip, record);
    } else {
      record.count++;
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(429).json({ success: false, message });
      }
      req.flash('error', message);
      return res.status(429).redirect(req.get('Referrer') || '/');
    }

    next();
  };
}

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 attempts per 15 minutes
  message: 'Too many login/signup attempts. Please try again after 15 minutes.',
});

const noteUploadLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 uploads/edits per 15 minutes
  message: 'Upload limit reached. Please wait a few minutes before submitting more notes.',
});

const adminLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 150,
  message: 'Admin action limit reached. Please wait a moment.',
});

module.exports = {
  createRateLimiter,
  authLimiter,
  noteUploadLimiter,
  adminLimiter,
};
