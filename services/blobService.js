const { put, del, handleUpload } = require('@vercel/blob');
const path = require('path');
const fs = require('fs');

const getBlobToken = () => {
  return (process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_TOKEN || '').trim();
};

const isBlobConfigured = () => {
  return Boolean(getBlobToken());
};

/**
 * Server-side upload buffer to Vercel Blob
 */
const uploadBufferToBlob = async (originalname, buffer, mimeType) => {
  const token = getBlobToken();
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured.');
  }

  const ext = path.extname(originalname).toLowerCase();
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const blobPathname = `notes/note-${uniqueSuffix}${ext}`;

  const blob = await put(blobPathname, buffer, {
    access: 'public',
    contentType: mimeType,
    token,
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
    contentType: blob.contentType || mimeType,
  };
};

/**
 * Delete a file from Vercel Blob (or local disk fallback)
 */
const deleteFileResource = async (fileUrl) => {
  if (!fileUrl) return;

  const token = getBlobToken();

  // If it's a Vercel Blob URL and token is available
  if ((fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) && token) {
    try {
      await del(fileUrl, { token });
      console.log('Successfully deleted file from Vercel Blob:', fileUrl);
    } catch (err) {
      console.warn('Failed to delete file from Vercel Blob:', err.message);
    }
    return;
  }

  // Local filesystem fallback
  if (fileUrl.startsWith('/uploads/')) {
    const localPath = path.join(__dirname, '../public', fileUrl);
    if (fs.existsSync(localPath)) {
      try {
        fs.unlinkSync(localPath);
        console.log('Successfully deleted local file:', localPath);
      } catch (err) {
        console.warn('Could not delete local file:', err.message);
      }
    }
  }
};

/**
 * Generate client upload token for direct browser-to-Vercel Blob upload (supports files up to 15 MB)
 */
const handleClientUpload = async (req, res) => {
  const token = getBlobToken();
  if (!token) {
    return res.status(400).json({ error: 'Vercel Blob storage is not configured.' });
  }

  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!req.user) {
          throw new Error('Unauthorized user.');
        }

        return {
          allowedContentTypes: [
            'application/pdf',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'image/jpeg',
            'image/png',
            'image/webp',
          ],
          maximumSizeInBytes: 15 * 1024 * 1024, // 15 MB limit
          tokenPayload: JSON.stringify({ userId: String(req.user._id) }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('Client Blob upload completed:', blob.url);
      },
    });

    return res.json(jsonResponse);
  } catch (error) {
    console.error('Blob handleUpload error:', error);
    return res.status(400).json({ error: error.message || 'Client upload token generation failed.' });
  }
};

module.exports = {
  getBlobToken,
  isBlobConfigured,
  uploadBufferToBlob,
  deleteFileResource,
  handleClientUpload,
};
