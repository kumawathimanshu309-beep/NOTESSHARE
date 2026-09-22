const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required.'],
    },
    note: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Note',
      required: [true, 'Note reference is required.'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating value is required.'],
      min: [1, 'Rating must be at least 1.'],
      max: [5, 'Rating cannot exceed 5.'],
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be an integer between 1 and 5.',
      },
    },
    review: {
      type: String,
      trim: true,
      maxlength: [500, 'Review cannot exceed 500 characters.'],
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index so a user can rate a note only once (updates existing rating)
ratingSchema.index({ user: 1, note: 1 }, { unique: true });
ratingSchema.index({ note: 1 });

const Rating = mongoose.model('Rating', ratingSchema);

module.exports = Rating;
