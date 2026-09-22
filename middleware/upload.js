const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadDir = path.join(__dirname, '../public/uploads/notes');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate safe unique filename using timestamp + random bytes
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `note-${uniqueSuffix}${ext}`);
  },
});

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

const upload = multer({
  storage,
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
