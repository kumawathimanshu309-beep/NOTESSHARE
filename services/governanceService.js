const mongoose = require('mongoose');
const User = require('../models/User');
const TeacherRequest = require('../models/TeacherRequest');
const AuditLog = require('../models/AuditLog');
const notificationService = require('./notificationService');
const AppError = require('../utils/AppError');

/**
 * Service handling HOD/Admin Governance, Teacher Applications & Candidate Recommendations
 */
class GovernanceService {
  /**
   * Submit a new Teacher Application or Candidate Recommendation
   */
  async createTeacherRequest(data) {
    const { candidateUserId, requestedById, reason = '', qualifications = '', subjects = [], experience = '' } = data;

    if (!mongoose.Types.ObjectId.isValid(candidateUserId) || !mongoose.Types.ObjectId.isValid(requestedById)) {
      throw new AppError('Invalid candidate or requester user identifier.', 400);
    }

    const candidate = await User.findById(candidateUserId).lean();
    if (!candidate) {
      throw new AppError('Candidate user account not found.', 404);
    }

    if (candidate.role === 'teacher' || candidate.role === 'admin') {
      throw new AppError('Candidate user is already a teacher or administrator.', 400);
    }

    // Duplicate protection: Verify candidate does NOT already have an active pending request
    const existingPending = await TeacherRequest.findOne({
      candidateUser: candidateUserId,
      status: 'pending',
    }).lean();

    if (existingPending) {
      throw new AppError('A pending teacher application or recommendation already exists for this candidate.', 400);
    }

    const isSelfRequest = candidateUserId.toString() === requestedById.toString();

    const request = await TeacherRequest.create({
      candidateUser: candidateUserId,
      requestedBy: requestedById,
      reason: reason.trim(),
      qualifications: qualifications.trim(),
      subjects: Array.isArray(subjects) ? subjects.map((s) => String(s).trim()).filter((s) => s.length > 0) : [],
      experience: experience.trim(),
      status: 'pending',
    });

    // Audit logging
    const actionType = isSelfRequest ? 'TEACHER_REQUEST_CREATED' : 'TEACHER_RECOMMENDED';
    await AuditLog.create({
      admin: requestedById,
      action: actionType,
      targetType: 'User',
      targetId: candidateUserId,
      details: {
        teacherRequestId: request._id,
        candidateName: candidate.name,
        candidateUsername: candidate.username,
        isSelfRequest,
      },
    }).catch((err) => console.warn('AuditLog creation warning:', err.message));

    // Notify all active Admin users about new pending request
    const admins = await User.find({ role: 'admin' }).select('_id').lean();
    for (const admin of admins) {
      await notificationService
        .createNotification({
          recipient: admin._id,
          actor: requestedById,
          type: 'role_request',
          title: isSelfRequest ? 'New Teacher Application' : 'New Teacher Recommendation',
          message: `${candidate.name} (@${candidate.username}) has a pending teacher governance request awaiting review.`,
          entityType: 'TeacherRequest',
          entityId: request._id,
          url: '/admin/teacher-requests',
          eventKey: `teacher-request-created:${request._id}:${admin._id}`,
        })
        .catch(() => {});
    }

    return request;
  }

  /**
   * Concurrency-safe review of Teacher Request (Approve or Reject)
   */
  async reviewTeacherRequest(requestId, adminUser, decision, rejectionReason = '') {
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      throw new AppError('Invalid teacher request identifier.', 400);
    }

    if (!['approve', 'reject'].includes(decision)) {
      throw new AppError('Invalid decision parameter. Must be "approve" or "reject".', 400);
    }

    const targetStatus = decision === 'approve' ? 'approved' : 'rejected';

    // Atomic conditional update: status must be "pending"
    const teacherRequest = await TeacherRequest.findOneAndUpdate(
      { _id: requestId, status: 'pending' },
      {
        status: targetStatus,
        reviewedBy: adminUser._id,
        reviewedAt: new Date(),
        rejectionReason: decision === 'reject' ? String(rejectionReason).trim() : '',
      },
      { returnDocument: 'after' }
    );

    if (!teacherRequest) {
      throw new AppError('Teacher request not found or has already been reviewed by another admin.', 409);
    }

    const candidateUser = await User.findById(teacherRequest.candidateUser);
    if (!candidateUser) {
      throw new AppError('Candidate user account no longer exists.', 404);
    }

    if (decision === 'approve') {
      // Role promotion to teacher
      candidateUser.role = 'teacher';
      candidateUser.verificationStatus = 'verified';

      if (teacherRequest.qualifications && !candidateUser.qualification) {
        candidateUser.qualification = teacherRequest.qualifications;
      }
      if (teacherRequest.experience && !candidateUser.experience) {
        candidateUser.experience = teacherRequest.experience;
      }
      if (teacherRequest.subjects && teacherRequest.subjects.length > 0) {
        candidateUser.subjectsHandled = Array.from(
          new Set([...(candidateUser.subjectsHandled || []), ...teacherRequest.subjects])
        );
      }

      await candidateUser.save();

      // Audit Log
      await AuditLog.create({
        admin: adminUser._id,
        action: 'TEACHER_APPROVED',
        targetType: 'User',
        targetId: candidateUser._id,
        details: {
          previousRole: 'student',
          newRole: 'teacher',
          teacherRequestId: teacherRequest._id,
          candidateName: candidateUser.name,
          candidateUsername: candidateUser.username,
        },
      }).catch((err) => console.warn('AuditLog creation warning:', err.message));

      // Idempotent Notification
      await notificationService.createNotification({
        recipient: candidateUser._id,
        actor: adminUser._id,
        type: 'role_change',
        title: 'Teacher Role Approved!',
        message: 'Congratulations! Your teacher role application has been approved by HOD/Admin.',
        entityType: 'User',
        entityId: candidateUser._id,
        url: '/teacher/dashboard',
        eventKey: `teacher-request-approved:${teacherRequest._id}`,
      });
    } else {
      // Rejection audit log
      await AuditLog.create({
        admin: adminUser._id,
        action: 'TEACHER_REJECTED',
        targetType: 'User',
        targetId: candidateUser._id,
        details: {
          teacherRequestId: teacherRequest._id,
          rejectionReason: teacherRequest.rejectionReason,
          candidateName: candidateUser.name,
          candidateUsername: candidateUser.username,
        },
      }).catch((err) => console.warn('AuditLog creation warning:', err.message));

      // Idempotent Notification
      await notificationService.createNotification({
        recipient: candidateUser._id,
        actor: adminUser._id,
        type: 'role_change',
        title: 'Teacher Application Update',
        message: `Your teacher application was reviewed. Status: Rejected. Reason: ${teacherRequest.rejectionReason || 'Does not meet criteria.'}`,
        entityType: 'User',
        entityId: candidateUser._id,
        url: '/dashboard',
        eventKey: `teacher-request-rejected:${teacherRequest._id}`,
      });
    }

    return teacherRequest;
  }

  /**
   * HOD/Admin Direct Demotion of Teacher to Student (Historical data preserved)
   */
  async demoteTeacher(teacherUserId, adminUser) {
    if (!mongoose.Types.ObjectId.isValid(teacherUserId)) {
      throw new AppError('Invalid teacher user identifier.', 400);
    }

    const targetUser = await User.findById(teacherUserId);
    if (!targetUser) {
      throw new AppError('Target user account not found.', 404);
    }

    if (targetUser.role === 'admin') {
      throw new AppError('Administrator accounts cannot be demoted through teacher governance.', 403);
    }

    if (targetUser.role !== 'teacher') {
      throw new AppError('Target user is not currently a teacher.', 400);
    }

    // Role demotion
    targetUser.role = 'student';
    targetUser.verificationStatus = 'pending';
    await targetUser.save();

    // Audit Log
    await AuditLog.create({
      admin: adminUser._id,
      action: 'TEACHER_DEMOTED',
      targetType: 'User',
      targetId: targetUser._id,
      details: {
        previousRole: 'teacher',
        newRole: 'student',
        demotedUser: targetUser.username,
      },
    }).catch((err) => console.warn('AuditLog creation warning:', err.message));

    // Notification
    await notificationService.createNotification({
      recipient: targetUser._id,
      actor: adminUser._id,
      type: 'role_change',
      title: 'Role Update Notice',
      message: 'Your role has been changed from Teacher to Student by HOD/Admin governance.',
      entityType: 'User',
      entityId: targetUser._id,
      url: '/dashboard',
      eventKey: `teacher-demoted:${targetUser._id}:${Date.now()}`,
    });

    return targetUser;
  }

  /**
   * Get paginated Teacher Requests for HOD/Admin
   */
  async getTeacherRequests(queryParams = {}) {
    const { status, page = 1, limit = 20 } = queryParams;
    const filter = {};
    if (status && ['pending', 'approved', 'rejected', 'cancelled'].includes(status)) {
      filter.status = status;
    }

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (parsedPage - 1) * parsedLimit;

    const [requests, totalCount] = await Promise.all([
      TeacherRequest.find(filter)
        .populate('candidateUser', 'name username email avatar qualification experience role')
        .populate('requestedBy', 'name username role')
        .populate('reviewedBy', 'name username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      TeacherRequest.countDocuments(filter),
    ]);

    return {
      requests,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(totalCount / parsedLimit) || 1,
        totalCount,
      },
    };
  }
}

module.exports = new GovernanceService();
