const socialService = require('../services/socialService');
const { profileUpdateSchema } = require('../validators/socialValidator');
const wrapAsync = require('../middleware/asyncWrapper');
const AppError = require('../utils/AppError');
const path = require('path');
const fs = require('fs');
const blobService = require('../services/blobService');

/**
 * GET /profile
 * Redirect logged in user to their own profile, or login if guest
 */
exports.redirectToOwnProfile = wrapAsync(async (req, res) => {
  if (req.user && req.user.username) {
    return res.redirect(303, `/profile/${req.user.username}`);
  }
  req.flash('error', 'Please log in to view your profile.');
  return res.redirect(303, '/auth/login');
});

/**
 * GET /profile/:username
 * Public / Private Profile View with safe projections and analytics
 */
exports.renderProfile = wrapAsync(async (req, res) => {
  const username = req.params.username;
  const currentUserId = req.user ? req.user._id : null;
  const currentUserRole = req.user ? req.user.role : null;

  const profileData = await socialService.getUserProfileData(
    username,
    currentUserId,
    currentUserRole,
    req.query
  );

  res.render('profile/index', {
    title: `${profileData.profileUser.name} (@${profileData.profileUser.username}) — StudyShare Profile`,
    profileUser: profileData.profileUser,
    notes: profileData.notes,
    doubts: profileData.doubts,
    answers: profileData.answers,
    isSelf: profileData.isSelf,
    isAdmin: profileData.isAdmin,
    privateBookmarks: profileData.privateBookmarks || [],
    privateLikes: profileData.privateLikes || [],
    activityFeed: profileData.activityFeed || [],
    pagination: profileData.pagination,
    stats: profileData.stats,
  });
});

/**
 * GET /profile/edit
 * Authenticated Profile Edit View
 */
exports.renderEditProfileForm = wrapAsync(async (req, res) => {
  res.render('profile/edit', {
    title: 'Edit Profile — StudyShare',
    user: req.user,
  });
});

/**
 * POST / PUT /profile/edit or /profile
 * Authenticated Profile Update Handler with Strict Mass-Assignment Protection
 */
exports.updateProfile = wrapAsync(async (req, res) => {
  const userId = req.user._id;

  const { error, value } = profileUpdateSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMsg = error.details.map((d) => d.message).join(' ');
    req.flash('error', errorMsg);
    return res.redirect(303, '/profile/edit');
  }

  // Parse interests input cleanly
  let parsedInterests = [];
  if (Array.isArray(value.interests)) {
    parsedInterests = value.interests.map((s) => String(s).trim()).filter(Boolean);
  } else if (typeof value.interests === 'string' && value.interests.trim() !== '') {
    parsedInterests = value.interests
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Pure whitelist extraction prevents role/isAdmin/password manipulation
  const safeData = {
    name: value.name,
    username: value.username,
    bio: value.bio || '',
    avatar: value.avatar || '',
    course: value.course || '',
    branch: value.branch || '',
    semester: value.semester ? Math.min(8, Math.max(1, parseInt(value.semester, 10) || 1)) : 1,
    academicYear: value.academicYear || '',
    specialization: value.specialization || '',
    department: value.department || '',
    interests: parsedInterests,
    college: value.college || '',
    qualification: value.qualification || '',
    designation: value.designation || '',
    experience: value.experience || '',
    teachingBio: value.teachingBio || '',
    subjectsHandled: Array.isArray(value.subjectsHandled)
      ? value.subjectsHandled.map((s) => String(s).trim()).filter(Boolean)
      : (typeof value.subjectsHandled === 'string' ? value.subjectsHandled.split(',').map((s) => s.trim()).filter(Boolean) : undefined),
  };

  // Handle avatar file upload (overrides URL if file provided)
  if (req.file && req.file.buffer) {
    try {
      if (blobService.isBlobConfigured()) {
        // Use Vercel Blob if configured
        const uploadResult = await blobService.uploadBufferToBlob(
          `avatar-${userId}${path.extname(req.file.originalname).toLowerCase()}`,
          req.file.buffer,
          req.file.mimetype
        );
        safeData.avatar = uploadResult.url;
      } else {
        // Save locally to public/uploads/avatars/
        const avatarsDir = path.join(__dirname, '../public/uploads/avatars');
        if (!fs.existsSync(avatarsDir)) {
          fs.mkdirSync(avatarsDir, { recursive: true });
        }
        const ext = path.extname(req.file.originalname).toLowerCase();
        const filename = `avatar-${userId}-${Date.now()}${ext}`;
        const localPath = path.join(avatarsDir, filename);
        fs.writeFileSync(localPath, req.file.buffer);
        safeData.avatar = `/uploads/avatars/${filename}`;
      }
    } catch (uploadErr) {
      console.error('Avatar upload error:', uploadErr.message);
      req.flash('error', 'Avatar upload failed. Please try a URL instead.');
      return res.redirect(303, '/profile/edit');
    }
  }

  let updatedUser;
  try {
    updatedUser = await socialService.updateUserProfile(userId, safeData);
  } catch (err) {
    req.flash('error', err.message || 'Failed to update profile.');
    return res.redirect(303, '/profile/edit');
  }

  // Synchronize Passport session user object cleanly
  req.login(updatedUser, (err) => {
    if (err) {
      req.flash('success', 'Profile updated successfully.');
      return res.redirect(303, `/profile/${updatedUser.username}`);
    }
    req.flash('success', 'Profile updated successfully.');
    return res.redirect(303, `/profile/${updatedUser.username}`);
  });
});
