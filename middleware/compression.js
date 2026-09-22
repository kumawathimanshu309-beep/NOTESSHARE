const zlib = require('zlib');

/**
 * Native Node.js Gzip Response Compression Middleware
 */
module.exports = function compressionMiddleware(req, res, next) {
  const acceptEncoding = req.headers['accept-encoding'] || '';

  if (!acceptEncoding.includes('gzip') || req.method === 'OPTIONS' || req.method === 'HEAD') {
    return next();
  }

  const originalWriteHead = res.writeHead;
  const originalWrite = res.write;
  const originalEnd = res.end;
  const chunks = [];
  let writeHeadArgs = null;

  res.writeHead = function (statusCode, statusMessage, headers) {
    writeHeadArgs = { statusCode, statusMessage, headers };
    return res;
  };

  res.write = function (chunk, encoding, callback) {
    if (chunk) {
      const enc = typeof encoding === 'string' ? encoding : 'utf8';
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, enc);
      chunks.push(buf);
    }
    if (typeof encoding === 'function') encoding();
    if (typeof callback === 'function') callback();
    return true;
  };

  res.end = function (chunk, encoding, callback) {
    const cb = typeof encoding === 'function' ? encoding : callback;
    const enc = typeof encoding === 'string' ? encoding : 'utf8';

    if (chunk && typeof chunk !== 'function') {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, enc);
      chunks.push(buf);
    }

    const bodyBuffer = Buffer.concat(chunks);
    const contentType = (res.getHeader('content-type') || res.getHeader('Content-Type') || '').toString().toLowerCase();

    const flushHeaders = () => {
      if (!res.headersSent) {
        if (writeHeadArgs) {
          const { statusCode, statusMessage, headers } = writeHeadArgs;
          if (typeof statusMessage === 'string') {
            originalWriteHead.call(res, statusCode, statusMessage, headers);
          } else {
            originalWriteHead.call(res, statusCode, statusMessage);
          }
        } else {
          originalWriteHead.call(res, res.statusCode || 200);
        }
      }
    };

    if (bodyBuffer.length > 256) {
      const isCompressible =
        !contentType ||
        contentType.includes('text/') ||
        contentType.includes('application/javascript') ||
        contentType.includes('application/json') ||
        contentType.includes('image/svg+xml');

      const isForbidden =
        contentType.includes('pdf') ||
        contentType.includes('image/png') ||
        contentType.includes('image/jpeg') ||
        contentType.includes('image/webp');

      if (isCompressible && !isForbidden) {
        try {
          const compressed = zlib.gzipSync(bodyBuffer);
          res.setHeader('Content-Encoding', 'gzip');
          res.setHeader('Content-Length', compressed.length);
          res.removeHeader('ETag');

          flushHeaders();
          return originalEnd.call(res, compressed, cb);
        } catch (e) {
          // Fallback
        }
      }
    }

    flushHeaders();
    return originalEnd.call(res, bodyBuffer, cb);
  };

  next();
};




