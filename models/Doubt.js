const mongoose = require('mongoose');

const doubtSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required.'],
    },
    title: {
      type: String,
      required: [true, 'Doubt title is required.'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters.'],
      maxlength: [150, 'Title cannot exceed 150 characters.'],
    },
    description: {
      type: String,
      required: [true, 'Doubt description is required.'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters.'],
      maxlength: [2000, 'Description cannot exceed 2000 characters.'],
    },
    subject: {
      type: String,
      trim: true,
      default: 'General',
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    status: {
      type: String,
      enum: ['open', 'answered', 'resolved', 'closed'],
      default: 'open',
    },
    acceptedAnswer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Answer',
      default: null,
    },
    isResolved: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Search & Filter Indexes
doubtSchema.index({ title: 'text', description: 'text', tags: 'text', subject: 'text' });
doubtSchema.index({ student: 1, createdAt: -1 });
doubtSchema.index({ status: 1, subject: 1, createdAt: -1 });

const Doubt = mongoose.model('Doubt', doubtSchema);

module.exports = Doubt;
