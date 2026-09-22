const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Note title is required.'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters.'],
      maxlength: [120, 'Title cannot exceed 120 characters.'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters.'],
      default: '',
    },
    content: {
      type: String,
      trim: true,
      default: '',
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author reference is required.'],
    },
    subject: {
      type: String,
      trim: true,
      default: 'General',
    },
    category: {
      type: String,
      trim: true,
      default: 'Notes',
    },
    semester: {
      type: Number,
      enum: [1, 2, 3, 4, 5, 6, 7, 8],
      default: 1,
    },
    year: {
      type: Number,
      default: null,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    resourceType: {
      type: String,
      enum: ['note', 'pdf', 'ppt', 'pptx', 'image', 'document', 'video', 'link', 'pyq', 'important_questions'],
      default: 'pdf',
    },
    fileUrl: {
      type: String,
      default: '',
    },
    fileName: {
      type: String,
      default: '',
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    mimeType: {
      type: String,
      default: '',
    },
    thumbnail: {
      type: String,
      default: '',
    },
    videoUrl: {
      type: String,
      trim: true,
      default: '',
    },
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    downloads: {
      type: Number,
      default: 0,
      min: 0,
    },
    fileVersion: {
      type: Number,
      default: 1,
      min: 1,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    visibility: {
      type: String,
      enum: ['public', 'private', 'restricted'],
      default: 'public',
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
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: '',
    },
    adminFeedback: {
      type: String,
      trim: true,
      default: '',
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'notesshare', // Explicit collection requirement
  }
);

// Indexes for common query filters
noteSchema.index({ title: 'text', description: 'text', tags: 'text', subject: 'text' });
noteSchema.index({ author: 1 });
noteSchema.index({ subject: 1, category: 1, semester: 1, resourceType: 1, year: 1 });
noteSchema.index({ isPublished: 1, visibility: 1, isDeleted: 1, createdAt: -1 });
noteSchema.index({ approvalStatus: 1, isPublished: 1, isDeleted: 1, visibility: 1 });

const Note = mongoose.model('Note', noteSchema);

module.exports = Note;
