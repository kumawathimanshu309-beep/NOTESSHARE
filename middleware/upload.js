const path = require('path');
const multer = require('multer');

// Allowed MIME types and extensions
const allowedMimeTypes = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/webp',
];

const allowedExtensions = ['.pdf', '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.webp'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  const isMimeAllowed = allowedMimeTypes.includes(mime);
  const isExtAllowed = allowedExtensions.includes(ext);

  if (isMimeAllowed && isExtAllowed) {
    return cb(null, true);
  }

  const err = new Error('Invalid file type. Only PDF, PPT, PPTX, JPG, PNG, and WEBP files are allowed.');
  err.code = 'INVALID_FILE_TYPE';
  cb(err, false);
};

// Use memoryStorage to avoid EROFS (read-only filesystem) on Vercel/serverless environments
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB limit
  },
});

// Middleware wrapper for graceful Multer error handling
exports.handleNoteFileUpload = (fieldName) => {
  return (req, res, next) => {
    const uploadSingle = upload.single(fieldName);

    uploadSingle(req, res, (err) => {
      if (err) {
        let errorMsg = 'File upload failed.';
        if (err.code === 'LIMIT_FILE_SIZE') {
          errorMsg = 'File size is too large. Maximum allowed file size is 15 MB.';
        } else if (err.code === 'INVALID_FILE_TYPE') {
          errorMsg = err.message;
        } else {
          errorMsg = err.message || 'An error occurred during file upload.';
        }

        req.flash('error', errorMsg);
        return res.status(400).redirect(req.headers.referer || '/notes/new');
      }
      next();
    });
  };
};
