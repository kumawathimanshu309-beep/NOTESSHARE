const socialService = require('../services/socialService');
const { profileUpdateSchema } = require('../validators/socialValidator');
const wrapAsync = require('../middleware/asyncWrapper');
const AppError = require('../utils/AppError');

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

  // Pure whitelist extraction prevents role/isAdmin/password manipulation
  const safeData = {
    name: value.name,
    username: value.username,
    bio: value.bio || '',
    avatar: value.avatar || '',
  };

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
