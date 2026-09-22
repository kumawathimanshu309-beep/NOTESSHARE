const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');

/**
 * Creates a notification with server-side validation, self-notification prevention & idempotency guards.
 */
exports.createNotification = async (data) => {
  const { recipient, actor, type, title, message, entityType, entityId, url, eventKey } = data;

  if (!recipient || !mongoose.Types.ObjectId.isValid(recipient)) {
    return null;
  }

  // Rule: Prevent self-notification server-side
  if (actor && recipient.toString() === actor.toString()) {
    return null;
  }

  // Rule: Ensure URL is internal relative path only (security against arbitrary redirect/XSS)
  let safeUrl = url || '/';
  if (!safeUrl.startsWith('/') || safeUrl.startsWith('//') || safeUrl.includes('javascript:')) {
    safeUrl = '/';
  }

  try {
    const payload = {
      recipient,
      actor: actor || null,
      type,
      title: title.trim(),
      message: message.trim(),
      entityType: entityType || null,
      entityId: entityId || null,
      url: safeUrl,
    };
    if (eventKey) {
      payload.eventKey = eventKey;
    }

    const notification = await Notification.create(payload);
    return notification;
  } catch (err) {
    if (err.code === 11000 && eventKey) {
      // Duplicate eventKey catch: idempotent operation, return existing record
      return await Notification.findOne({ eventKey });
    }
    throw err;
  }
};

/**
 * Retrieves paginated notifications strictly scoped to recipient userId
 */
exports.getUserNotifications = async (userId, queryParams = {}) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError('Invalid user identifier.', 400);
  }

  const { page = 1, limit = 20 } = queryParams;
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (parsedPage - 1) * parsedLimit;

  const filter = { recipient: userId };

  const [notifications, totalCount, unreadCount] = await Promise.all([
    Notification.find(filter)
      .populate('actor', 'name username avatar role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: userId, isRead: false }),
  ]);

  const totalPages = Math.ceil(totalCount / parsedLimit) || 1;

  return {
    notifications,
    totalCount,
    unreadCount,
    page: parsedPage,
    totalPages,
  };
};

/**
 * Fast query for global unread notification badge count
 */
exports.getUnreadCount = async (userId) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return 0;
  return await Notification.countDocuments({ recipient: userId, isRead: false });
};

/**
 * Mark a single notification as read with strict IDOR ownership guard
 */
exports.markAsRead = async (notificationId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw new AppError('Invalid notification identifier.', 400);
  }

  const notification = await Notification.findOne({ _id: notificationId, recipient: userId });
  if (!notification) {
    throw new AppError('Notification not found or access denied.', 404);
  }

  if (!notification.isRead) {
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
  }

  return notification;
};

/**
 * Mark all unread notifications as read for current logged-in user
 */
exports.markAllAsRead = async (userId) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError('Invalid user identifier.', 400);
  }

  const result = await Notification.updateMany(
    { recipient: userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );

  return result.modifiedCount;
};

/**
 * Delete / dismiss a notification with strict IDOR ownership guard
 */
exports.deleteNotification = async (notificationId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw new AppError('Invalid notification identifier.', 400);
  }

  const deleted = await Notification.findOneAndDelete({ _id: notificationId, recipient: userId });
  if (!deleted) {
    throw new AppError('Notification not found or access denied.', 404);
  }

  return deleted;
};
