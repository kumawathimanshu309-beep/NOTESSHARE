const mongoose = require('mongoose');

const homeCardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Card title is required.'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters.'],
    },
    description: {
      type: String,
      required: [true, 'Card description is required.'],
      trim: true,
      maxlength: [300, 'Description cannot exceed 300 characters.'],
    },
    icon: {
      type: String,
      default: '★',
      trim: true,
    },
    ctaText: {
      type: String,
      default: 'Explore Resource',
      trim: true,
    },
    url: {
      type: String,
      required: [true, 'Target URL is required.'],
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
    isEnabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

homeCardSchema.index({ order: 1, isPublished: 1, isEnabled: 1, isDeleted: 1 });

module.exports = mongoose.model('HomeCard', homeCardSchema);
