const mongoose = require('mongoose');

const teacherRequestSchema = new mongoose.Schema(
  {
    candidateUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Candidate user reference is required.'],
      index: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Requester user reference is required.'],
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters.'],
      default: '',
    },
    qualifications: {
      type: String,
      trim: true,
      maxlength: [200, 'Qualifications cannot exceed 200 characters.'],
      default: '',
    },
    subjects: [
      {
        type: String,
        trim: true,
      },
    ],
    experience: {
      type: String,
      trim: true,
      maxlength: [200, 'Experience cannot exceed 200 characters.'],
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Rejection reason cannot exceed 500 characters.'],
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient duplicate pending request lookup
teacherRequestSchema.index({ candidateUser: 1, status: 1 });

module.exports = mongoose.model('TeacherRequest', teacherRequestSchema);
