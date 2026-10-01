const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Subject name is required.'],
      trim: true,
      unique: true,
      minlength: [2, 'Subject name must be at least 2 characters.'],
      maxlength: [100, 'Subject name cannot exceed 100 characters.'],
    },
    slug: {
      type: String,
      required: [true, 'Subject slug is required.'],
      trim: true,
      lowercase: true,
      unique: true,
    },
    code: {
      type: String,
      trim: true,
      default: '',
      maxlength: [20, 'Subject code cannot exceed 20 characters.'],
    },
    department: {
      type: String,
      trim: true,
      default: 'General',
      maxlength: [100, 'Department name cannot exceed 100 characters.'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters.'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Search & Filter Indexes
subjectSchema.index({ department: 1, isActive: 1 });
subjectSchema.index({ name: 'text', description: 'text', department: 'text' });

const Subject = mongoose.model('Subject', subjectSchema);

module.exports = Subject;
