const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      enum: [
        'ROLE_CHANGED',
        'USER_ACTIVATED',
        'USER_DEACTIVATED',
        'NOTE_PUBLISHED',
        'NOTE_UNPUBLISHED',
        'NOTE_DELETED',
        'NOTE_RESTORED',
        'DOUBT_DELETED',
        'ANSWER_DELETED',
        'COMMENT_DELETED',
        'HOME_CARD_CREATED',
        'HOME_CARD_UPDATED',
        'HOME_CARD_PUBLISHED',
        'HOME_CARD_UNPUBLISHED',
        'HOME_CARD_ENABLED',
        'HOME_CARD_DISABLED',
        'HOME_CARD_DELETED',
        'HOME_CARD_RESTORED',
        'TEACHER_REQUEST_CREATED',
        'TEACHER_RECOMMENDED',
        'TEACHER_APPROVED',
        'TEACHER_REJECTED',
        'TEACHER_DEMOTED',
        'TEACHER_SUSPENDED',
        'RESOURCE_UPDATED',
        'RESOURCE_FILE_REPLACED',
        'RESOURCE_PUBLISHED',
        'RESOURCE_UNPUBLISHED',
        'RESOURCE_DELETED',
        'RESOURCE_RESTORED',
        'NOTE_APPROVED',
        'NOTE_REJECTED',
        'NOTE_SUBMITTED_FOR_REVIEW',
        'NOTE_RESUBMITTED',
        'PROFILE_UPDATED',
      ],
    },
    targetType: {
      type: String,
      trim: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
